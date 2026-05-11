"use client";

import type { LiFiStep } from "@lifi/sdk";
import { useQuery } from "@tanstack/react-query";

export interface UseLifiQuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
}

export interface LifiQuoteResponse {
  quote: LiFiStep;
}

const QUOTE_REFETCH_INTERVAL_MS = 30_000;

function hasCompleteQuoteParams(params: UseLifiQuoteParams): boolean {
  return Boolean(
    Number.isInteger(params.fromChain) &&
      params.fromChain > 0 &&
      Number.isInteger(params.toChain) &&
      params.toChain > 0 &&
      params.fromToken.trim() &&
      params.toToken.trim() &&
      params.fromAmount.trim() &&
      params.fromAddress.trim(),
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Could not fetch a LI.FI quote. Check wallet, token, amount, and network.";
}

async function fetchLifiQuote(params: UseLifiQuoteParams): Promise<LiFiStep> {
  const response = await fetch("/api/lifi", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "quote",
      params,
    }),
  });

  const payload = (await response.json()) as
    | LifiQuoteResponse
    | { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error?.message
        ? payload.error.message
        : "LI.FI quote request failed.",
    );
  }

  if (!("quote" in payload)) {
    throw new Error("LI.FI returned an unexpected quote response.");
  }

  return payload.quote;
}

export function useLifiQuote(params: UseLifiQuoteParams) {
  const enabled = hasCompleteQuoteParams(params);
  const query = useQuery({
    queryKey: ["lifi", "quote", params],
    queryFn: () => fetchLifiQuote(params),
    enabled,
    refetchInterval: enabled ? QUOTE_REFETCH_INTERVAL_MS : false,
    retry: 1,
  });

  return {
    quote: query.data,
    isLoading: query.isLoading || query.isFetching,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: query.refetch,
  };
}
