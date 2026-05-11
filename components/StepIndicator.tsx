"use client";

import { ArrowDownToLine, Check, RefreshCw, Send } from "lucide-react";

export type StepStatus = "pending" | "active" | "done";

export interface FlowStep {
  type: "bridge" | "swap" | "deposit";
  label: string;
  status: StepStatus;
}

export interface StepIndicatorProps {
  steps: FlowStep[];
}

const STEP_ICONS: Record<FlowStep["type"], typeof Send> = {
  bridge: Send,
  swap: RefreshCw,
  deposit: ArrowDownToLine,
};

export function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="rounded-lg border border-dark-800/50 bg-dark-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent-400">
            Composer
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">Bridge → Swap → Deposit</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.type];
          const active = step.status === "active";
          const done = step.status === "done";

          return (
            <div key={step.type} className="contents">
              <div
                className={`rounded-lg border p-4 transition ${
                  active
                    ? "animate-pulse border-primary-400 bg-primary-500/10 shadow-[0_0_32px_rgba(14,165,233,0.22)]"
                    : done
                      ? "border-success-500/40 bg-success-500/10"
                      : "border-dark-800/50 bg-dark-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-md ${
                      done
                        ? "bg-success-500 text-white"
                        : active
                          ? "bg-primary-500 text-white"
                          : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {done ? (
                      <Check className="size-5" aria-hidden="true" />
                    ) : (
                      <Icon className="size-5" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="text-xs capitalize text-slate-400">{step.status}</p>
                  </div>
                </div>
              </div>

              {index < steps.length - 1 ? (
                <div className="hidden h-px border-t border-dotted border-slate-600 md:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
