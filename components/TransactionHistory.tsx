"use client";

import { ExternalLink } from "lucide-react";

export type TransactionStatus = "completed" | "pending" | "failed";

export interface TransactionHistoryItem {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: string;
  status: TransactionStatus;
  txHash?: string;
  txLink?: string;
}

const TRANSACTIONS: TransactionHistoryItem[] = [
  {
    id: "tx-1",
    date: "May 11, 2026",
    from: "Polygon MATIC",
    to: "Marinade USDC",
    amount: "$420.00",
    status: "completed",
    txHash: "5VfJ9R7x8yKs2aQyU2p1nYmQf7aJ8nKf3qYbYk8h2m9a",
  },
  {
    id: "tx-2",
    date: "May 04, 2026",
    from: "Ethereum USDC",
    to: "Kamino USDC",
    amount: "$780.00",
    status: "completed",
    txHash: "4hKp8zR1cMn7sYq3eVb6dTj2aXw9pLs5uQn3rFg8bCd",
  },
  {
    id: "tx-3",
    date: "Apr 27, 2026",
    from: "Base ETH",
    to: "Marinade USDC",
    amount: "$250.00",
    status: "pending",
  },
  {
    id: "tx-4",
    date: "Apr 20, 2026",
    from: "BNB Chain USDT",
    to: "Kamino USDC",
    amount: "$310.00",
    status: "failed",
  },
];

const STATUS_STYLES: Record<TransactionStatus, string> = {
  completed: "border-success-500/30 bg-success-500/10 text-success-400",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
};

function getExplorerUrl(txHash: string): string {
  return `https://solscan.io/tx/${txHash}`;
}

export interface TransactionHistoryProps {
  transactions?: TransactionHistoryItem[];
}

export function TransactionHistory({ transactions = TRANSACTIONS }: TransactionHistoryProps) {
  return (
    <section className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent-400">
            Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Transaction History</h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-dark-800/50">
        <div className="hidden grid-cols-[1fr_1.4fr_0.8fr_0.8fr_0.5fr] gap-4 bg-dark-800 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 md:grid">
          <span>Date</span>
          <span>Route</span>
          <span>Amount</span>
          <span>Status</span>
          <span>TX</span>
        </div>

        <div className="divide-y divide-dark-800/70">
          {transactions.map((transaction) => {
            const explorerUrl =
              transaction.txLink ?? (transaction.txHash ? getExplorerUrl(transaction.txHash) : undefined);

            return (
              <div
                key={transaction.id}
                className="grid gap-3 bg-dark-900/60 px-4 py-4 text-sm transition hover:bg-dark-800/70 md:grid-cols-[1fr_1.4fr_0.8fr_0.8fr_0.5fr] md:items-center md:gap-4"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500 md:hidden">
                    Date
                  </p>
                  <p className="text-slate-300">{transaction.date}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500 md:hidden">
                    Route
                  </p>
                  <p className="font-medium text-white">
                    {transaction.from} <span className="text-slate-500">-&gt;</span>{" "}
                    {transaction.to}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500 md:hidden">
                    Amount
                  </p>
                  <p className="font-semibold text-white">{transaction.amount}</p>
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[transaction.status]}`}
                  >
                    {transaction.status}
                  </span>
                </div>

                <div>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary-300 transition hover:text-primary-200"
                    >
                      View
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-slate-600">--</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
