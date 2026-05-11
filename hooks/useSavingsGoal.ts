"use client";

import {
  convertQuoteToRoute,
  config,
  EVM,
  executeRoute,
  type LiFiStep,
  type Process,
  type Route,
  type RouteExtended,
  type SwitchChainHook,
} from "@lifi/sdk";
import { useCallback, useMemo, useState } from "react";
import type { Client } from "viem";

import { CHAINS, TOKENS, type SolanaDefiProtocol } from "@/lib/constants";

export type SavingsExecutionStatus =
  | "idle"
  | "quoting"
  | "review"
  | "executing"
  | "done"
  | "failed";

export type SavingsStepStatus = "pending" | "active" | "done" | "failed";
export type SavingsStepType = "bridge" | "swap" | "deposit";

export interface SavingsExecutionStep {
  type: SavingsStepType;
  label: string;
  status: SavingsStepStatus;
  txHash?: string;
  txLink?: string;
  message?: string;
}

export interface StartSavingsFlowParams {
  fromChain: number;
  fromToken: string;
  fromAmount: string;
  fromAddress: string;
  targetProtocol: SolanaDefiProtocol;
  toAddress?: string;
  quote?: LiFiStep;
  getWalletClient?: () => Promise<Client | undefined>;
  switchChain?: SwitchChainHook;
}

export interface SavingsGoalState
  extends Omit<StartSavingsFlowParams, "getWalletClient" | "switchChain"> {
  toChain: number;
  toToken: string;
  quote?: LiFiStep;
  route?: Route;
}

const INITIAL_STEPS: SavingsExecutionStep[] = [
  { type: "bridge", label: "Bridge", status: "pending" },
  { type: "swap", label: "Swap", status: "pending" },
  { type: "deposit", label: "Deposit", status: "pending" },
];

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Savings flow failed. Please check wallet approvals, balances, and network status.";
}

function normalizeTxHashes(route?: RouteExtended): string[] {
  if (!route) {
    return [];
  }

  return route.steps.flatMap((step) =>
    step.execution?.process.flatMap((process) => (process.txHash ? [process.txHash] : [])) ?? [],
  );
}

function getStepTypeFromProcess(process: Process): SavingsStepType {
  if (process.type === "SWAP") {
    return "swap";
  }

  if (process.type === "RECEIVING_CHAIN") {
    return "deposit";
  }

  return "bridge";
}

function updateStepsFromRoute(
  currentSteps: SavingsExecutionStep[],
  route: RouteExtended,
): SavingsExecutionStep[] {
  const nextSteps = currentSteps.map((step) => ({ ...step }));

  for (const lifiStep of route.steps) {
    for (const process of lifiStep.execution?.process ?? []) {
      const stepType = getStepTypeFromProcess(process);
      const stepIndex = nextSteps.findIndex((step) => step.type === stepType);

      if (stepIndex === -1) {
        continue;
      }

      const status: SavingsStepStatus =
        process.status === "DONE"
          ? "done"
          : process.status === "FAILED" || process.status === "CANCELLED"
            ? "failed"
            : "active";

      nextSteps[stepIndex] = {
        ...nextSteps[stepIndex],
        status,
        txHash: process.txHash ?? nextSteps[stepIndex].txHash,
        txLink: process.txLink ?? nextSteps[stepIndex].txLink,
        message: process.message ?? nextSteps[stepIndex].message,
      };
    }
  }

  return nextSteps;
}

function configureExecutionProvider(params: StartSavingsFlowParams): void {
  if (!params.getWalletClient) {
    throw new Error("EVM wallet provider is not available. Reconnect MetaMask and try again.");
  }

  config.setProviders([
    EVM({
      getWalletClient: async () => {
        const walletClient = await params.getWalletClient?.();

        if (!walletClient) {
          throw new Error("EVM wallet provider is not available. Reconnect MetaMask and try again.");
        }

        return walletClient;
      },
      switchChain: params.switchChain,
    }),
  ]);
}

async function fetchQuote(params: StartSavingsFlowParams): Promise<LiFiStep> {
  const response = await fetch("/api/lifi", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "quote",
      params: {
        fromChain: params.fromChain,
        toChain: CHAINS.solana.id,
        fromToken: params.fromToken,
        toToken: TOKENS.USDC.solana,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
      },
    }),
  });

  const payload = (await response.json()) as
    | { quote: LiFiStep }
    | { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error?.message
        ? payload.error.message
        : "Could not fetch LI.FI quote.",
    );
  }

  if (!("quote" in payload)) {
    throw new Error("LI.FI returned an unexpected quote response.");
  }

  return payload.quote;
}

export function useSavingsGoal() {
  const [goal, setGoal] = useState<SavingsGoalState | null>(null);
  const [steps, setSteps] = useState<SavingsExecutionStep[]>(INITIAL_STEPS);
  const [executionStatus, setExecutionStatus] = useState<SavingsExecutionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [executedRoute, setExecutedRoute] = useState<RouteExtended | null>(null);

  const txHashes = useMemo(() => normalizeTxHashes(executedRoute ?? undefined), [executedRoute]);

  const reset = useCallback(() => {
    setGoal(null);
    setSteps(INITIAL_STEPS);
    setExecutionStatus("idle");
    setError(null);
    setExecutedRoute(null);
  }, []);

  const startSavingsFlow = useCallback(async (params: StartSavingsFlowParams) => {
    setError(null);
    setExecutedRoute(null);
    setSteps([
      { type: "bridge", label: "Bridge", status: "active" },
      { type: "swap", label: "Swap", status: "pending" },
      { type: "deposit", label: "Deposit", status: "pending" },
    ]);
    setExecutionStatus("quoting");

    try {
      const quote = params.quote ?? (await fetchQuote(params));
      const route = convertQuoteToRoute(quote, {
        adjustZeroOutputFromPreviousStep: true,
      });

      setGoal({
        fromChain: params.fromChain,
        fromToken: params.fromToken,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
        targetProtocol: params.targetProtocol,
        toAddress: params.toAddress,
        toChain: CHAINS.solana.id,
        toToken: TOKENS.USDC.solana,
        quote,
        route,
      });
      setExecutionStatus("executing");
      configureExecutionProvider(params);

      const result = await executeRoute(route, {
        updateRouteHook: (updatedRoute) => {
          setSteps((currentSteps) => updateStepsFromRoute(currentSteps, updatedRoute));
        },
      });

      setExecutedRoute(result);
      setSteps((currentSteps) =>
        currentSteps.map((step) => ({
          ...step,
          status: step.status === "failed" ? "failed" : "done",
        })),
      );
      setExecutionStatus("done");

      return result;
    } catch (flowError) {
      setError(getFriendlyErrorMessage(flowError));
      setSteps((currentSteps) =>
        currentSteps.map((step) =>
          step.status === "active" ? { ...step, status: "failed" } : step,
        ),
      );
      setExecutionStatus("failed");
      throw flowError;
    }
  }, []);

  return {
    goal,
    steps,
    executionStatus,
    error,
    txHashes,
    startSavingsFlow,
    reset,
  };
}
