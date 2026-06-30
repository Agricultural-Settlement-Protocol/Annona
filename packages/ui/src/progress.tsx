import { cn } from "./cn.js";

/** Progress bar. Default verdant; use gradient for reputation (growth to trust). */
export function ProgressBar({
  value,
  max = 100,
  tone = "verdant",
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: "verdant" | "aqua" | "gradient";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = {
    verdant: "bg-verdant-500",
    aqua: "bg-aqua-500",
    gradient: "bg-gradient-to-r from-verdant-400 to-aqua-400",
  }[tone];

  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
      ) : null}
      {/* biome-ignore lint/a11y/useFocusableInteractive: progressbar is a valid non-focusable status role */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
