import type { ReactNode } from "react";
import { cn } from "./cn.js";

/** Big color-coded hero stat for dashboards. Legible to non-expert officers.
 *  NOTE: no em dashes in any string passed to `label`/`hint`. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    neutral: "border-slate-200 bg-white",
    good: "border-emerald-200 bg-emerald-50",
    warn: "border-amber-200 bg-amber-50",
    bad: "border-red-200 bg-red-50",
  }[tone];

  return (
    <div className={cn("rounded-xl border p-5 shadow-sm", toneClass)}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
