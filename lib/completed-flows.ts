"use client";

import type { LiFiStep, RouteExtended } from "@lifi/sdk";

import { CHAINS, SOLANA_DEFI, type SolanaDefiProtocol } from "@/lib/constants";

export type CompletedFlowStatus = "completed" | "failed";

export interface CompletedFlowTx {
  hash: string;
  link: string;
}

export interface CompletedFlow {
  id: string;
  sourceChain: string;
  sourceChainId: number;
  sourceToken: string;
  sourceAmount: string;
  receivedChain: string;
  receivedToken: string;
  receivedAmount: string;
  targetProtocol: SolanaDefiProtocol;
  targetProtocolName: string;
  txs: CompletedFlowTx[];
  timestamp: string;
  status: CompletedFlowStatus;
}

export interface SaveCompletedFlowParams {
  fromChain: number;
  fromToken: string;
  fromAmount: string;
  targetProtocol: SolanaDefiProtocol;
  quote: LiFiStep;
  route: RouteExtended;
}

const STORAGE_KEY = "nestflow.completedFlows.v1";
const MAX_COMPLETED_FLOWS = 25;

function createFlowId(): string {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${Date.now()}-${randomId}`;
}

function chainName(chainId: number): string {
  const chain = Object.values(CHAINS).find((item) => item.id === chainId);

  return chain?.name ?? `Chain ${chainId}`;
}

function formatUnits(amount?: string, decimals = 18): string {
  if (!amount) {
    return "0";
  }

  const value = Number(amount) / 10 ** decimals;

  if (!Number.isFinite(value)) {
    return amount;
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function uniqueTxs(route: RouteExtended): CompletedFlowTx[] {
  const txs = route.steps.flatMap((step) =>
    step.execution?.process.flatMap((process) => {
      if (!process.txHash) {
        return [];
      }

      return [
        {
          hash: process.txHash,
          link: process.txLink ?? `https://solscan.io/tx/${process.txHash}`,
        },
      ];
    }) ?? [],
  );
  const seen = new Set<string>();

  return txs.filter((tx) => {
    if (seen.has(tx.hash)) {
      return false;
    }

    seen.add(tx.hash);
    return true;
  });
}

function readRawCompletedFlows(): unknown {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn("Could not parse completed flows from localStorage.", error);
    return [];
  }
}

function isCompletedFlow(value: unknown): value is CompletedFlow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const flow = value as Partial<CompletedFlow>;

  return Boolean(
    typeof flow.id === "string" &&
      typeof flow.sourceChain === "string" &&
      typeof flow.sourceToken === "string" &&
      typeof flow.sourceAmount === "string" &&
      typeof flow.receivedToken === "string" &&
      typeof flow.receivedAmount === "string" &&
      typeof flow.timestamp === "string" &&
      flow.status === "completed",
  );
}

export function getCompletedFlows(): CompletedFlow[] {
  const parsedValue = readRawCompletedFlows();

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue.filter(isCompletedFlow);
}

export function saveCompletedFlow(params: SaveCompletedFlowParams): CompletedFlow {
  const fromToken = params.quote.action.fromToken;
  const toToken = params.route.toToken ?? params.quote.action.toToken;
  const protocol = SOLANA_DEFI[params.targetProtocol];
  const flow: CompletedFlow = {
    id: createFlowId(),
    sourceChain: chainName(params.fromChain),
    sourceChainId: params.fromChain,
    sourceToken: fromToken.symbol ?? params.fromToken,
    sourceAmount: formatUnits(params.route.fromAmount ?? params.fromAmount, fromToken.decimals),
    receivedChain: chainName(params.route.toChainId ?? CHAINS.solana.id),
    receivedToken: toToken.symbol ?? "USDC",
    receivedAmount: formatUnits(params.route.toAmount ?? params.quote.estimate.toAmount, toToken.decimals),
    targetProtocol: params.targetProtocol,
    targetProtocolName: protocol.name,
    txs: uniqueTxs(params.route),
    timestamp: new Date().toISOString(),
    status: "completed",
  };
  const nextFlows = [flow, ...getCompletedFlows()].slice(0, MAX_COMPLETED_FLOWS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextFlows));
  } catch (error) {
    console.warn("Could not save completed flow to localStorage.", error);
  }

  return flow;
}
