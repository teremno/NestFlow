"use client";

import Link from "next/link";
import { ArrowLeftRight, CheckCircle, Layers, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import {
  SavingsGoalForm,
  type SavingsGoalFormData,
} from "@/components/SavingsGoalForm";
import { SavingsFlow } from "@/components/SavingsFlow";
import { StepIndicator, type FlowStep } from "@/components/StepIndicator";
import { WalletConnect } from "@/components/WalletConnect";
import { useLifiQuote, type UseLifiQuoteParams } from "@/hooks/useLifiQuote";
import { CHAINS, TOKENS } from "@/lib/constants";

const FEATURES = [
  {
    title: "Any Chain → Solana",
    description: "Start from major EVM networks and route savings into Solana.",
    icon: ArrowLeftRight,
  },
  {
    title: "One-Click Composer",
    description: "Prepare bridge, swap, and deposit steps in one guided flow.",
    icon: Layers,
  },
  {
    title: "Earn DeFi Yield",
    description: "Target Solana strategies with clear APY visibility before execution.",
    icon: TrendingUp,
  },
] as const;

const INITIAL_STEPS: FlowStep[] = [
  { type: "bridge", label: "Bridge", status: "pending" },
  { type: "swap", label: "Receive USDC", status: "pending" },
  { type: "deposit", label: "Kamino Deposit", status: "pending" },
];

type HomeFlowStatus = "idle" | "connected" | "review" | "executing" | "done";

const EVM_NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEMO_QUOTE_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const DEMO_SOLANA_QUOTE_ADDRESS = "11111111111111111111111111111111";
const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  MATIC: 18,
  BNB: 18,
  AVAX: 18,
  USDC: 6,
  USDT: 6,
};

type SourceChainKey = SavingsGoalFormData["sourceChain"];

const TOKEN_ADDRESSES: Record<string, Partial<Record<SourceChainKey, string>>> = {
  USDC: {
    ethereum: TOKENS.USDC.ethereum,
    polygon: TOKENS.USDC.polygon,
    bsc: TOKENS.USDC.bsc,
  },
  USDT: {
    ethereum: TOKENS.USDT.ethereum,
  },
};

function resolveSourceTokenAddress(goal: SavingsGoalFormData): string {
  if (goal.sourceToken === CHAINS[goal.sourceChain].token) {
    return EVM_NATIVE_TOKEN_ADDRESS;
  }

  return TOKEN_ADDRESSES[goal.sourceToken]?.[goal.sourceChain] ?? goal.sourceToken;
}

function toBaseUnits(amount: string, token: string): string {
  return parseUnits(amount, TOKEN_DECIMALS[token] ?? 18).toString();
}

function getSolscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

function decodeBase64Transaction(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function SavingsQuotePreview({
  goal,
  fromAddress,
  toAddress,
  walletsReady,
  onExecutionStart,
  onComplete,
}: {
  goal: SavingsGoalFormData;
  fromAddress: string;
  toAddress: string;
  walletsReady: boolean;
  onExecutionStart: () => void;
  onComplete: () => void;
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const quoteParams: UseLifiQuoteParams = {
    fromChain: goal.sourceChainId,
    toChain: CHAINS.solana.id,
    fromToken: resolveSourceTokenAddress(goal),
    toToken: TOKENS.USDC.solana,
    fromAmount: toBaseUnits(goal.amount, goal.sourceToken),
    fromAddress,
    toAddress,
  };
  const { quote, isLoading, error, refetch } = useLifiQuote(quoteParams);

  async function depositIntoKamino(amount: string) {
    if (!publicKey) {
      throw new Error("Solana wallet is not connected.");
    }

    const response = await fetch("/api/kamino/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        owner: publicKey.toBase58(),
      }),
    });

    const payload = (await response.json()) as
      | { transaction: string }
      | { error?: { message?: string } };

    if (!response.ok || !("transaction" in payload)) {
      throw new Error(
        "error" in payload && payload.error?.message
          ? payload.error.message
          : "Could not build Kamino deposit transaction.",
      );
    }

    const transaction = Transaction.from(decodeBase64Transaction(payload.transaction));
    const txHash = await sendTransaction(transaction, connection);

    await connection.confirmTransaction(txHash, "confirmed");

    return {
      hash: txHash,
      link: getSolscanTxUrl(txHash),
    };
  }

  if (isLoading && !quote) {
    return (
      <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-4 text-sm text-primary-100">
        Fetching LI.FI quote...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
        <p className="font-semibold text-white">Could not fetch LI.FI quote</p>
        <p className="mt-2">{error}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 h-10 rounded-md bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-400"
        >
          Retry Quote
        </button>
      </div>
    );
  }

  return (
    <SavingsFlow
      quote={quote}
      params={{
        fromChain: goal.sourceChainId,
        fromToken: quoteParams.fromToken,
        fromAmount: quoteParams.fromAmount,
        fromAddress,
        toAddress,
        targetProtocol: goal.targetProtocol,
        depositIntoProtocol: depositIntoKamino,
      }}
      canExecute={walletsReady && fromAddress !== DEMO_QUOTE_ADDRESS}
      executionDisabledReason={
        walletsReady
          ? undefined
          : "Quote preview is available now. Connect both wallets before live execution."
      }
      onExecutionStart={onExecutionStart}
      onComplete={onComplete}
    />
  );
}

export default function Home() {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { connected: isSolanaConnected, publicKey } = useWallet();
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoalFormData | null>(null);
  const [flowStatus, setFlowStatus] = useState<HomeFlowStatus>("idle");

  const walletsReady = isEvmConnected && isSolanaConnected;
  const quoteFromAddress = evmAddress ?? DEMO_QUOTE_ADDRESS;
  const quoteToAddress = publicKey?.toBase58() ?? DEMO_SOLANA_QUOTE_ADDRESS;
  const flowSteps = useMemo<FlowStep[]>(() => {
    if (flowStatus === "idle" || flowStatus === "connected") {
      return INITIAL_STEPS;
    }

    if (flowStatus === "done") {
      return [
        { type: "bridge", label: "Bridge", status: "done" },
        { type: "swap", label: "Receive USDC", status: "done" },
        { type: "deposit", label: "Kamino Deposit", status: "done" },
      ];
    }

    return [
      { type: "bridge", label: "Bridge", status: "active" },
      { type: "swap", label: "Receive USDC", status: "pending" },
      { type: "deposit", label: "Kamino Deposit", status: "pending" },
    ];
  }, [flowStatus]);

  useEffect(() => {
    if (savingsGoal) {
      return;
    }

    setFlowStatus(walletsReady ? "connected" : "idle");
  }, [savingsGoal, walletsReady]);

  function handleStartSaving(formData: SavingsGoalFormData) {
    setSavingsGoal(formData);
    setFlowStatus("review");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-dark-900 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.2),transparent_28%),linear-gradient(135deg,rgba(30,27,46,0.95),rgba(15,13,26,1))]" />
      <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:py-16 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold text-white">
            NestFlow
          </Link>
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <Link className="text-slate-300 transition hover:text-white" href="/dashboard">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-primary-300">
              Cross-Chain Savings Automator
            </p>
            <h1 className="text-6xl font-semibold tracking-normal sm:text-7xl">
              <span className="bg-gradient-to-r from-primary-400 via-primary-300 to-accent-500 bg-clip-text text-transparent">
                NestFlow
              </span>
            </h1>
            <p className="mt-5 text-2xl font-medium text-white">
              Cross-Chain Savings Automator
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-400">
              Bridge from any chain. Save on Solana. Earn yield automatically.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-lg border border-dark-800/50 bg-dark-800/80 p-4 shadow-xl shadow-black/10 backdrop-blur"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-primary-400/25 bg-primary-400/10 text-primary-300">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-base font-semibold text-white">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-6">
            <WalletConnect />
            <StepIndicator steps={flowSteps} />
          </div>

          <div className="space-y-4">
            {walletsReady ? (
              <SavingsGoalForm onStartSaving={handleStartSaving} />
            ) : (
              <div className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <h2 className="text-xl font-semibold text-white">Connect wallets to start</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Connect one EVM wallet and one Solana wallet before creating a live savings flow.
                </p>
              </div>
            )}

            {savingsGoal ? (
              <>
                <div className="rounded-lg border border-success-500/30 bg-success-500/10 p-4 text-sm text-success-400">
                  Prepared {savingsGoal.amount} {savingsGoal.sourceToken} for a LI.FI bridge and
                  Kamino USDC deposit flow.
                </div>
                <SavingsQuotePreview
                  goal={savingsGoal}
                  fromAddress={quoteFromAddress}
                  toAddress={quoteToAddress}
                  walletsReady={walletsReady}
                  onExecutionStart={() => setFlowStatus("executing")}
                  onComplete={() => setFlowStatus("done")}
                />
              </>
            ) : null}

            {flowStatus === "done" ? (
              <div className="rounded-lg border border-success-500/30 bg-success-500/10 p-4 text-sm text-success-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 size-5 text-success-400" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-white">Savings flow completed.</p>
                    <Link
                      href="/dashboard"
                      className="mt-2 inline-flex font-semibold text-success-300 transition hover:text-success-200"
                    >
                      View dashboard
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {!walletsReady ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                Connect both wallets to move from idle to connected state.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
