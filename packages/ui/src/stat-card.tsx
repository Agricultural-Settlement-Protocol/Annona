import type { ReactNode } from "react";
import { cn } from "./cn.js";

/** Big color-coded hero stat for dashboards. Legible to non-expert officers.
 *  NOTE: no em dashes in any string passed in. Token-driven (theme-safe). */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    neutral: "border-border bg-surface",
    good: "border-emerald-200 bg-emerald-50",
    warn: "border-amber-200 bg-amber-50",
    bad: "border-red-200 bg-red-50",
  }[tone];

  return (
    <div className={cn("rounded-lg border p-5 shadow-sm", toneClass)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
