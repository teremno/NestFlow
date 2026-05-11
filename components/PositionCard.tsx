"use client";

import { ExternalLink, TrendingUp } from "lucide-react";

export interface PositionCardProps {
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
}

const PROTOCOL_STYLES: Record<string, string> = {
  marinade: "border-success-500/40 bg-success-500/10 text-success-400",
  kamino: "border-primary-400/40 bg-primary-500/10 text-primary-300",
};

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function getProtocolStyle(protocol: string): string {
  return (
    PROTOCOL_STYLES[protocol.toLowerCase()] ??
    "border-accent-500/40 bg-accent-500/10 text-accent-400"
  );
}

function getExplorerUrl(txHash: string): string {
  return `https://solscan.io/tx/${txHash}`;
}

export function PositionCard({
  protocol,
  amount,
  token,
  apy,
  chain,
  txHash,
  txLink,
  description = `${chain} yield position`,
  amountLabel = "Deposited",
  yieldLabel = "Yearly yield",
}: PositionCardProps) {
  const yearlyYield = amount * apy;
  const explorerUrl = txLink ?? (txHash ? getExplorerUrl(txHash) : undefined);

  return (
    <article className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur transition hover:border-primary-400/60 hover:shadow-[0_0_34px_rgba(14,165,233,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{protocol}</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getProtocolStyle(protocol)}`}
            >
              {protocol}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        </div>

        <span className="rounded-md border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-300">
          {chain}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{amountLabel}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatUsd(amount)}</p>
          <p className="mt-1 text-sm text-slate-400">{token}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">APY</p>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-success-400">
            <TrendingUp className="size-5" aria-hidden="true" />
            {(apy * 100).toFixed(1)}%
          </div>
          <p className="mt-1 text-sm text-slate-400">Estimated yearly yield</p>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-dark-800/50 bg-dark-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">{yieldLabel}</span>
          <span className="text-sm font-semibold text-white">{formatUsd(yearlyYield)}</span>
        </div>
      </div>

      {explorerUrl ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-300 transition hover:text-primary-200"
        >
          View Transaction
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}
