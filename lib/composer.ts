import type { LiFiStep } from "@lifi/sdk";

import { CHAINS, SOLANA_DEFI, TOKENS, type SolanaDefiProtocol } from "./constants";
import { getLifiQuote } from "./lifi";

export interface SavingsFlowParams {
  sourceChain: number;
  sourceToken: string;
  amount: string;
  userAddress: string;
  targetProtocol: SolanaDefiProtocol;
}

export type ComposerStepType = "bridge" | "swap" | "deposit";
export type ComposerStepStatus = "pending" | "active" | "done" | "failed";

export interface ComposerStep {
  type: ComposerStepType;
  chain: number;
  fromToken: string;
  toToken: string;
  amount: string;
  status: ComposerStepStatus;
  txHash?: string;
}

export interface SavingsFlow {
  steps: ComposerStep[];
  quote: LiFiStep;
}

export async function buildSavingsFlow(params: SavingsFlowParams): Promise<SavingsFlow> {
  validateSavingsFlowParams(params);

  const { sourceChain, sourceToken, amount, userAddress, targetProtocol } = params;
  const targetDefiProtocol = SOLANA_DEFI[targetProtocol];

  const quote = await getLifiQuote({
    fromChain: sourceChain,
    toChain: CHAINS.solana.id,
    fromToken: sourceToken,
    toToken: TOKENS.USDC.solana,
    fromAmount: amount,
    fromAddress: userAddress,
  });

  const steps: ComposerStep[] = [
    {
      type: "bridge",
      chain: sourceChain,
      fromToken: sourceToken,
      toToken: TOKENS.USDC.solana,
      amount,
      status: "active",
    },
    {
      type: "swap",
      chain: CHAINS.solana.id,
      fromToken: TOKENS.USDC.solana,
      toToken: CHAINS.solana.token,
      amount: "auto",
      status: "pending",
    },
    {
      type: "deposit",
      chain: CHAINS.solana.id,
      fromToken: TOKENS.USDC.solana,
      toToken: targetDefiProtocol.depositAddress,
      amount: "auto",
      status: "pending",
    },
  ];

  return { steps, quote };
}

export function getStepIcon(type: ComposerStepType): string {
  switch (type) {
    case "bridge":
      return "bridge";
    case "swap":
      return "refresh-cw";
    case "deposit":
      return "landmark";
  }
}

export function getStepLabel(type: ComposerStepType): string {
  switch (type) {
    case "bridge":
      return "Cross-Chain Bridge";
    case "swap":
      return "Token Swap";
    case "deposit":
      return "DeFi Deposit";
  }
}

function validateSavingsFlowParams(params: SavingsFlowParams): void {
  if (!Number.isInteger(params.sourceChain) || params.sourceChain <= 0) {
    throw new Error("sourceChain must be a positive integer chain id.");
  }

  if (!params.sourceToken.trim()) {
    throw new Error("sourceToken is required.");
  }

  if (!params.userAddress.trim()) {
    throw new Error("userAddress is required.");
  }

  if (!/^\d+$/.test(params.amount) || BigInt(params.amount) <= BigInt(0)) {
    throw new Error("amount must be a positive integer in token base units.");
  }
}
