"use client";

import type { LiFiStep } from "@lifi/sdk";
import { CheckCircle, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useSwitchChain, useWalletClient } from "wagmi";

import { StepIndicator, type FlowStep } from "@/components/StepIndicator";
import {
  type SavingsExecutionStep,
  type StartSavingsFlowParams,
  useSavingsGoal,
} from "@/hooks/useSavingsGoal";
import { SOLANA_DEFI } from "@/lib/constants";

export interface SavingsFlowProps {
  quote?: LiFiStep;
  params: StartSavingsFlowParams;
  canExecute?: boolean;
  executionDisabledReason?: string;
  onExecutionStart?: () => void;
  onComplete?: () => void;
}

function formatTokenAmount(amount?: string, decimals = 18, symbol?: string): string {
  if (!amount) {
    return "0";
  }

  const value = Number(amount) / 10 ** decimals;

  if (!Number.isFinite(value)) {
    return amount;
  }

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })}${symbol ? ` ${symbol}` : ""}`;
}

function formatUsd(value?: string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "$0.00";
  }

  return numericValue.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function sumUsd(values?: Array<{ amountUSD?: string }>): string {
  const total =
    values?.reduce((sum, item) => {
      const value = Number(item.amountUSD);

      return Number.isFinite(value) ? sum + value : sum;
    }, 0) ?? 0;

  return total.toString();
}

function shortenAddress(address?: string): string {
  if (!address) {
    return "Not available";
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function getExplorerUrl(txHash: string): string {
  return `https://solscan.io/tx/${txHash}`;
}

function toStepIndicatorSteps(steps: SavingsExecutionStep[]): FlowStep[] {
  return steps.map((step) => ({
    type: step.type,
    label: step.label,
    status:
      step.status === "done" ? "done" : step.status === "active" || step.status === "failed" ? "active" : "pending",
  }));
}

export function SavingsFlow({
  quote,
  params,
  canExecute = true,
  executionDisabledReason,
  onExecutionStart,
  onComplete,
}: SavingsFlowProps) {
  const {
    goal,
    steps,
    executionStatus,
    error,
    txHashes,
    startSavingsFlow,
    retryProtocolDeposit,
    reset,
  } =
    useSavingsGoal();
  const { data: walletClient, refetch: refetchWalletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [retryParams, setRetryParams] = useState<StartSavingsFlowParams | null>(null);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);

  const reviewQuote = goal?.quote ?? quote;
  const reviewParams = goal ?? params;
  const destinationAddress = reviewQuote?.action.toAddress ?? reviewParams.toAddress;
  const contractAddress = reviewQuote?.estimate.approvalAddress;
  const estimatedFeesUsd = sumUsd([
    ...(reviewQuote?.estimate?.feeCosts ?? []),
    ...(reviewQuote?.estimate?.gasCosts ?? []),
  ]);
  const fromAmountUsd = Number(reviewQuote?.estimate?.fromAmountUSD ?? 0);
  const exceedsHackathonCap = Number.isFinite(fromAmountUsd) && fromAmountUsd > 500;
  const isLargeAmount = Number.isFinite(fromAmountUsd) && fromAmountUsd > 1_000;
  const explorerLinks = steps.flatMap((step) => {
    if (step.txLink) {
      return [step.txLink];
    }

    return step.txHash ? [getExplorerUrl(step.txHash)] : [];
  });
  const quoteRoute = useMemo(() => {
    if (!reviewQuote) {
      return "No route yet";
    }

    return reviewQuote.includedSteps
      .map((step) => step.toolDetails.name || step.tool)
      .join(" -> ");
  }, [reviewQuote]);

  async function handleExecute() {
    const nextParams = {
      ...params,
      quote,
      getWalletClient: async () => {
        if (walletClient) {
          return walletClient;
        }

        const result = await refetchWalletClient();

        return result.data;
      },
      switchChain: async (chainId: number) => {
        await switchChainAsync({ chainId });
        const result = await refetchWalletClient();

        return result.data;
      },
    };

    setRetryParams(nextParams);
    onExecutionStart?.();
    await startSavingsFlow(nextParams);
    onComplete?.();
  }

  async function handleRetry() {
    if (!retryParams) {
      return;
    }

    await startSavingsFlow(retryParams);
  }

  async function handleRetryDeposit() {
    await retryProtocolDeposit();
    onComplete?.();
  }

  const isExecuting = executionStatus === "quoting" || executionStatus === "executing";
  const isDone = executionStatus === "done";
  const isFailed = executionStatus === "failed";
  const isFailedAfterBridge =
    isFailed &&
    steps.some((step) => step.type === "bridge" && step.status === "done") &&
    steps.some((step) => step.type === "deposit" && step.status === "failed");

  return (
    <section className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-300">
            Execution Flow
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            {isDone ? "Complete" : isExecuting ? "Executing" : isFailed ? "Failed" : "Review"}
          </h2>
        </div>

        {isDone ? (
          <CheckCircle className="size-6 text-success-400" aria-hidden="true" />
        ) : isFailed ? (
          <XCircle className="size-6 text-red-400" aria-hidden="true" />
        ) : isExecuting ? (
          <Loader2 className="size-6 animate-spin text-primary-300" aria-hidden="true" />
        ) : null}
      </div>

      <div className="space-y-5">
        <StepIndicator steps={toStepIndicatorSteps(steps)} />

        {!isExecuting && !isDone && !isFailed ? (
          <div className="grid gap-3 rounded-lg border border-dark-800/50 bg-dark-800 p-4 text-sm text-slate-300 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">From</p>
              <p className="mt-1 font-medium text-white">
                {formatTokenAmount(
                  reviewQuote?.action.fromAmount ?? reviewParams.fromAmount,
                  reviewQuote?.action.fromToken.decimals,
                  reviewQuote?.action.fromToken.symbol,
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estimated Received</p>
              <p className="mt-1 font-medium text-white">
                {formatTokenAmount(
                  reviewQuote?.estimate?.toAmount,
                  reviewQuote?.action.toToken.decimals,
                  reviewQuote?.action.toToken.symbol,
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Fees + Gas</p>
              <p className="mt-1 font-medium text-white">
                {formatUsd(estimatedFeesUsd)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estimated Time</p>
              <p className="mt-1 font-medium text-white">
                {reviewQuote?.estimate?.executionDuration
                  ? `${Math.ceil(reviewQuote.estimate.executionDuration / 60)} min`
                  : "Waiting for quote"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Route</p>
              <p className="mt-1 font-medium text-white">{quoteRoute}</p>
            </div>
          </div>
        ) : null}

        {!isExecuting && !isDone && !isFailed && reviewQuote ? (
          <div className="rounded-lg border border-primary-400/30 bg-primary-500/10 p-4 text-sm text-slate-200">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary-400/30 bg-primary-400/10 text-primary-300">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-white">Transaction Preview</p>
                <p className="mt-1 text-slate-400">
                  Review these details before MetaMask opens. NestFlow is non-custodial and does
                  not hold your funds.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-dark-800/60 bg-dark-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">You send</p>
                <p className="mt-1 font-semibold text-white">
                  {formatTokenAmount(
                    reviewQuote.action.fromAmount,
                    reviewQuote.action.fromToken.decimals,
                    reviewQuote.action.fromToken.symbol,
                  )}
                </p>
              </div>
              <div className="rounded-md border border-dark-800/60 bg-dark-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">You receive</p>
                <p className="mt-1 font-semibold text-white">
                  {formatTokenAmount(
                    reviewQuote.estimate.toAmount,
                    reviewQuote.action.toToken.decimals,
                    reviewQuote.action.toToken.symbol,
                  )}
                </p>
              </div>
              <div className="rounded-md border border-dark-800/60 bg-dark-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Fees + Gas</p>
                <p className="mt-1 font-semibold text-white">{formatUsd(estimatedFeesUsd)}</p>
              </div>
              <div className="rounded-md border border-dark-800/60 bg-dark-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Slippage</p>
                <p className="mt-1 font-semibold text-white">
                  {typeof reviewQuote.action.slippage === "number"
                    ? `${(reviewQuote.action.slippage * 100).toFixed(2)}%`
                    : "Set by LI.FI quote"}
                </p>
              </div>
              <div className="rounded-md border border-dark-800/60 bg-dark-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Destination
                </p>
                <p className="mt-1 break-all font-semibold text-white">
                  {shortenAddress(destinationAddress)}
                </p>
              </div>
              <div className="rounded-md border border-dark-800/60 bg-dark-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  LI.FI Contract
                </p>
                <p className="mt-1 break-all font-semibold text-white">
                  {shortenAddress(contractAddress)}
                </p>
              </div>
              <div className="rounded-md border border-dark-800/60 bg-dark-900/60 p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Target Protocol
                </p>
                <p className="mt-1 font-semibold text-white">
                  {SOLANA_DEFI[reviewParams.targetProtocol].name}. NestFlow will receive USDC on
                  Solana first, then request a second Solana wallet signature to deposit into
                  Kamino.
                </p>
              </div>
            </div>

            {isLargeAmount ? (
              <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                Large transfer warning: verify the route, destination, and contract before
                signing.
              </p>
            ) : null}
            {exceedsHackathonCap ? (
              <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-red-100">
                Hackathon safety cap: live execution is limited to $500 per flow.
              </p>
            ) : null}

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-dark-800/60 bg-dark-900/60 p-3">
              <input
                type="checkbox"
                checked={safetyConfirmed}
                onChange={(event) => setSafetyConfirmed(event.target.checked)}
                className="mt-1 size-4 accent-primary-500"
              />
              <span className="text-sm leading-6 text-slate-300">
                I verified the amount, destination address, LI.FI contract, route, and selected
                protocol before signing.
              </span>
            </label>
          </div>
        ) : null}

        {isExecuting ? (
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.type}
                className="flex items-center justify-between rounded-md border border-dark-800/50 bg-dark-800 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{step.label}</p>
                  <p className="text-slate-400">{step.message ?? step.status}</p>
                </div>
                {step.status === "done" ? (
                  <CheckCircle className="size-5 text-success-400" aria-hidden="true" />
                ) : step.status === "failed" ? (
                  <XCircle className="size-5 text-red-400" aria-hidden="true" />
                ) : step.status === "active" ? (
                  <Loader2 className="size-5 animate-spin text-primary-300" aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {isDone ? (
          <div className="rounded-lg border border-success-500/30 bg-success-500/10 p-4 text-sm text-success-200">
            <p className="font-semibold text-white">Savings flow completed.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {explorerLinks.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-success-500 px-3 py-2 font-semibold text-white transition hover:bg-success-400"
                >
                  View on Explorer
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              ))}
              {!explorerLinks.length && txHashes.length
                ? txHashes.map((txHash) => (
                    <a
                      key={txHash}
                      href={getExplorerUrl(txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-success-500 px-3 py-2 font-semibold text-white transition hover:bg-success-400"
                    >
                      View on Explorer
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  ))
                : null}
            </div>
          </div>
        ) : null}

        {isFailed ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            <p className="font-semibold text-white">Execution failed</p>
            <p className="mt-2">{error ?? "Unknown LI.FI execution error."}</p>
            {isFailedAfterBridge ? (
              <p className="mt-3 text-amber-100">
                Bridge already completed. Do not start the full flow again; check your Solana
                wallet for USDC and retry only the Kamino deposit after checking the latest
                transaction status.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          {!isExecuting && !isDone && !isFailed ? (
            <button
              type="button"
              onClick={() => void handleExecute()}
              disabled={!quote || !canExecute || !safetyConfirmed || exceedsHackathonCap}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-sm font-semibold text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Confirm & Sign
            </button>
          ) : null}

          {isFailed && !isFailedAfterBridge ? (
            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={!retryParams}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-sm font-semibold text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Retry
            </button>
          ) : null}

          {isFailedAfterBridge ? (
            <button
              type="button"
              onClick={() => void handleRetryDeposit()}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-sm font-semibold text-white transition hover:bg-primary-400"
            >
              Retry Kamino Deposit
            </button>
          ) : null}

          {isDone ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-md border border-dark-800/50 bg-dark-800 px-4 text-sm font-semibold text-white transition hover:border-slate-600"
            >
              Save Another
            </button>
          ) : null}
        </div>

        {!canExecute && executionDisabledReason ? (
          <p className="text-sm leading-6 text-amber-200">{executionDisabledReason}</p>
        ) : null}
      </div>
    </section>
  );
}
