import { formatRupiah } from "@annona/core";
import { cn } from "./cn.js";

/** Renders money from smallest-unit bigint as formatted rupiah (Rp14.900.000).
 *  Always tabular. Never hand-format money elsewhere. No em dashes. */
export function RupiahAmount({
  smallest,
  className,
  tone = "default",
}: {
  smallest: bigint;
  className?: string;
  tone?: "default" | "positive" | "negative" | "muted";
}) {
  const toneClass = {
    default: "text-foreground",
    positive: "text-emerald-600",
    negative: "text-red-600",
    muted: "text-muted-foreground",
  }[tone];

  return (
    <span className={cn("font-semibold tabular-nums", toneClass, className)}>
      {formatRupiah(smallest)}
    </span>
  );
}
