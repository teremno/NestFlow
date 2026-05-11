"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { PositionCard } from "@/components/PositionCard";
import { TransactionHistory, type TransactionHistoryItem } from "@/components/TransactionHistory";
import { getCompletedFlows, type CompletedFlow } from "@/lib/completed-flows";
import { SOLANA_DEFI } from "@/lib/constants";

const DEMO_POSITIONS = [
  {
    protocol: "Marinade",
    amount: 1240,
    token: "USDC",
    apy: 0.067,
    chain: "Solana",
    txHash: "5VfJ9R7x8yKs2aQyU2p1nYmQf7aJ8nKf3qYbYk8h2m9a",
  },
  {
    protocol: "Kamino",
    amount: 860,
    token: "USDC",
    apy: 0.054,
    chain: "Solana",
    txHash: "4hKp8zR1cMn7sYq3eVb6dTj2aXw9pLs5uQn3rFg8bCd",
  },
] as const;

type DashboardPosition = {
  id: string;
  protocol: string;
  amount: number;
  token: string;
  apy: number;
  chain: string;
  txHash?: string;
  txLink?: string;
  description?: string;
  amountLabel?: string;
  yieldLabel?: string;
};

function shortenAddress(address?: string): string {
  if (!address) {
    return "Demo wallet";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function parseDashboardAmount(value: string): number {
  const normalizedValue = value.replaceAll(",", "");
  const numericValue = Number(normalizedValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function toPositions(flows: CompletedFlow[]): DashboardPosition[] {
  return flows.map((flow) => ({
    id: flow.id,
    protocol: flow.targetProtocolName,
    amount: parseDashboardAmount(flow.receivedAmount),
    token: flow.receivedToken,
    apy: SOLANA_DEFI[flow.targetProtocol].apy,
    chain: flow.receivedChain,
    txHash: flow.txs[0]?.hash,
    txLink: flow.txs[0]?.link,
    description: "Completed LI.FI bridge/swap. Protocol deposit is selected, not executed yet.",
    amountLabel: "Received",
    yieldLabel: "Projected yearly yield",
  }));
}

function toTransactions(flows: CompletedFlow[]): TransactionHistoryItem[] {
  return flows.map((flow) => ({
    id: flow.id,
    date: formatDate(flow.timestamp),
    from: `${flow.sourceChain} ${flow.sourceToken}`,
    to: `${flow.targetProtocolName} ${flow.receivedToken}`,
    amount: `${flow.receivedAmount} ${flow.receivedToken}`,
    status: flow.status,
    txHash: flow.txs[0]?.hash,
    txLink: flow.txs[0]?.link,
  }));
}

export default function DashboardPage() {
  const { address } = useAccount();
  const [completedFlows, setCompletedFlows] = useState<CompletedFlow[]>([]);

  useEffect(() => {
    setCompletedFlows(getCompletedFlows());
  }, []);

  const positions =
    completedFlows.length > 0
      ? toPositions(completedFlows)
      : DEMO_POSITIONS.map((position) => ({
          id: position.protocol,
          ...position,
        }));
  const transactions =
    completedFlows.length > 0 ? toTransactions(completedFlows) : undefined;
  const isUsingDemoData = completedFlows.length === 0;
  const hasPositions = positions.length > 0;
  const totalSaved = positions.reduce((sum, position) => sum + position.amount, 0);
  const totalEarned = positions.reduce(
    (sum, position) => sum + position.amount * position.apy,
    0,
  );
  const averageApy =
    positions.length > 0
      ? positions.reduce((sum, position) => sum + position.apy, 0) / positions.length
      : 0;

  const stats = [
    { label: "Total Saved", value: formatUsd(totalSaved) },
    { label: "Total Earned", value: formatUsd(totalEarned) },
    { label: "Completed Flows", value: positions.length.toString() },
    { label: "Average APY", value: `${(averageApy * 100).toFixed(1)}%` },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-dark-900 text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.2),transparent_28%),radial-gradient(circle_at_88%_2%,rgba(139,92,246,0.18),transparent_30%),linear-gradient(135deg,rgba(30,27,46,0.96),rgba(15,13,26,1))]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-300 transition hover:text-primary-200"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Composer
            </Link>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary-300">
              NestFlow Portfolio
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              Your Savings Dashboard
            </h1>
          </div>

          <div className="inline-flex items-center gap-3 rounded-lg border border-dark-800/50 bg-dark-900/80 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex size-10 items-center justify-center rounded-md border border-primary-400/25 bg-primary-400/10 text-primary-300">
              <Wallet className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Wallet</p>
              <p className="text-sm font-semibold text-white">{shortenAddress(address)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </section>

        {isUsingDemoData ? (
          <section className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Demo portfolio data is shown until a real LI.FI flow completes in this browser.
          </section>
        ) : null}

        {hasPositions ? (
          <section className="grid gap-5 lg:grid-cols-2">
            {positions.map((position) => (
              <PositionCard key={position.id} {...position} />
            ))}
          </section>
        ) : (
          <section className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur">
            <h2 className="text-2xl font-semibold text-white">No savings yet.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
              Start your first cross-chain savings flow.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary-500 px-5 text-sm font-semibold text-white transition hover:bg-primary-400"
            >
              <Plus className="size-4" aria-hidden="true" />
              Start Saving
            </Link>
          </section>
        )}

        <TransactionHistory transactions={transactions} />
      </div>
    </main>
  );
}
