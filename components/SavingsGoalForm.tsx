"use client";

import { ArrowDownToLine, Clock, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { CHAINS, SAVINGS_PERIODS, SOLANA_DEFI, type SolanaDefiProtocol } from "@/lib/constants";

const SOURCE_CHAINS = [
  { key: "ethereum", label: CHAINS.ethereum.name, nativeToken: "ETH" },
  { key: "polygon", label: CHAINS.polygon.name, nativeToken: "MATIC" },
  { key: "bsc", label: CHAINS.bsc.name, nativeToken: "BNB" },
  { key: "avalanche", label: CHAINS.avalanche.name, nativeToken: "AVAX" },
  { key: "optimism", label: CHAINS.optimism.name, nativeToken: "ETH" },
  { key: "arbitrum", label: CHAINS.arbitrum.name, nativeToken: "ETH" },
  { key: "base", label: CHAINS.base.name, nativeToken: "ETH" },
] as const;

const STABLE_TOKENS = ["USDC", "USDT"] as const;
const TOKEN_PRICES_USD: Record<string, number> = {
  ETH: 3200,
  MATIC: 0.7,
  BNB: 580,
  AVAX: 35,
  USDC: 1,
  USDT: 1,
};

const PROTOCOL_CONTENT: Record<
  SolanaDefiProtocol,
  {
    description: string;
    icon: typeof TrendingUp;
  }
> = {
  marinade: {
    description: "Liquid staking strategy for SOL yield with broad Solana ecosystem liquidity.",
    icon: TrendingUp,
  },
  kamino: {
    description: "Lending vault strategy focused on automated yield and risk-managed liquidity.",
    icon: Zap,
  },
};

export interface SavingsGoalFormData {
  sourceChain: (typeof SOURCE_CHAINS)[number]["key"];
  sourceChainId: number;
  sourceToken: string;
  amount: string;
  amountUsd: number;
  savingsPeriod: (typeof SAVINGS_PERIODS)[number]["value"];
  targetProtocol: SolanaDefiProtocol;
}

export interface SavingsGoalFormProps {
  onStartSaving: (formData: SavingsGoalFormData) => void;
}

export function SavingsGoalForm({ onStartSaving }: SavingsGoalFormProps) {
  const [sourceChain, setSourceChain] = useState<SavingsGoalFormData["sourceChain"]>("ethereum");
  const [sourceToken, setSourceToken] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [savingsPeriod, setSavingsPeriod] =
    useState<SavingsGoalFormData["savingsPeriod"]>("weekly");
  const [targetProtocol, setTargetProtocol] = useState<SolanaDefiProtocol>("marinade");

  const selectedChain = SOURCE_CHAINS.find((chain) => chain.key === sourceChain) ?? SOURCE_CHAINS[0];
  const tokenOptions = useMemo(
    () => [selectedChain.nativeToken, ...STABLE_TOKENS],
    [selectedChain.nativeToken],
  );
  const numericAmount = Number(amount);
  const amountUsd =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? numericAmount * (TOKEN_PRICES_USD[sourceToken] ?? 0)
      : 0;
  const canSubmit = Boolean(sourceChain && sourceToken && numericAmount > 0 && savingsPeriod && targetProtocol);

  function handleSourceChainChange(nextChain: SavingsGoalFormData["sourceChain"]) {
    const chain = SOURCE_CHAINS.find((item) => item.key === nextChain) ?? SOURCE_CHAINS[0];
    setSourceChain(nextChain);
    setSourceToken(chain.nativeToken);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onStartSaving({
      sourceChain,
      sourceChainId: CHAINS[sourceChain].id,
      sourceToken,
      amount,
      amountUsd,
      savingsPeriod,
      targetProtocol,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-primary-300">
            Savings Goal
          </p>
          <h2 className="text-2xl font-semibold text-white">Set up your recurring flow</h2>
        </div>
        <div className="hidden rounded-md border border-accent-500/30 bg-accent-500/10 p-3 text-accent-400 sm:block">
          <ArrowDownToLine className="size-5" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Source Chain</span>
          <select
            aria-label="Source Chain"
            value={sourceChain}
            onChange={(event) =>
              handleSourceChainChange(event.target.value as SavingsGoalFormData["sourceChain"])
            }
            className="h-12 w-full rounded-md border border-dark-800/50 bg-dark-800 px-3 text-sm text-white outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-400/25"
          >
            {SOURCE_CHAINS.map((chain) => (
              <option key={chain.key} value={chain.key}>
                {chain.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Source Token</span>
          <select
            aria-label="Source Token"
            value={sourceToken}
            onChange={(event) => setSourceToken(event.target.value)}
            className="h-12 w-full rounded-md border border-dark-800/50 bg-dark-800 px-3 text-sm text-white outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-400/25"
          >
            {tokenOptions.map((token) => (
              <option key={token} value={token}>
                {token}
              </option>
            ))}
          </select>
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-300">Amount</span>
          <div className="flex overflow-hidden rounded-md border border-dark-800/50 bg-dark-800 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-400/25">
            <input
              aria-label="Amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.]?[0-9]*"
              placeholder="0.00"
              className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <div className="flex min-w-32 items-center justify-end border-l border-dark-800/70 px-3 text-sm text-slate-300">
              {amountUsd > 0 ? `~$${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "$0.00"}
            </div>
          </div>
        </label>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Clock className="size-4 text-primary-400" aria-hidden="true" />
            Savings Period
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {SAVINGS_PERIODS.map((period) => (
              <label
                key={period.value}
                className={`flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm transition ${
                  savingsPeriod === period.value
                    ? "border-primary-400 bg-primary-500/10 text-white"
                    : "border-dark-800/50 bg-dark-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                <span>{period.label}</span>
                <input
                  type="radio"
                  name="savingsPeriod"
                  value={period.value}
                  checked={savingsPeriod === period.value}
                  onChange={() => setSavingsPeriod(period.value)}
                  className="size-4 accent-primary-500"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <TrendingUp className="size-4 text-success-400" aria-hidden="true" />
            Target Protocol on Solana
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(Object.keys(SOLANA_DEFI) as SolanaDefiProtocol[]).map((protocol) => {
              const protocolInfo = SOLANA_DEFI[protocol];
              const Icon = PROTOCOL_CONTENT[protocol].icon;
              const selected = targetProtocol === protocol;

              return (
                <button
                  key={protocol}
                  type="button"
                  onClick={() => setTargetProtocol(protocol)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected
                      ? "border-accent-500 bg-accent-500/10 shadow-lg shadow-accent-500/10"
                      : "border-dark-800/50 bg-dark-800 hover:border-slate-600"
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="rounded-md border border-primary-400/25 bg-primary-400/10 p-2 text-primary-300">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="rounded-full bg-success-500/10 px-3 py-1 text-sm font-semibold text-success-400">
                      {(protocolInfo.apy * 100).toFixed(1)}% APY
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-white">{protocolInfo.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {PROTOCOL_CONTENT[protocol].description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-sm font-semibold text-white transition hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        <Zap className="size-4" aria-hidden="true" />
        Start Saving
      </button>
    </form>
  );
}
