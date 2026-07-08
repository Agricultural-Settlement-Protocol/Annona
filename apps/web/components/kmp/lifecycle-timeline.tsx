import type { Status } from "@annona/core";
import { cn } from "@annona/ui";
import { Check } from "lucide-react";

/** Horizontal lifecycle timeline for an agreement (Screen E + detail views).
 *  Shows the v3.0 double-confirmation flow: Dibuat -> Saprotan Dikirim ->
 *  Berjalan -> Panen Disetor -> Lunas. Terminal exceptions (Flagged /
 *  ForceMajeure) render as a banner elsewhere, not as steps. */

const STEPS: { key: Status; label: string; hint: string }[] = [
  { key: "Created", label: "Dibuat", hint: "Pesanan kolektif tercatat" },
  { key: "SupplyDispatched", label: "Saprotan Dikirim", hint: "Agrinas melepas logistik" },
  { key: "Active", label: "Berjalan", hint: "KMP terima barang, utang aktif" },
  { key: "Delivered", label: "Panen Disetor", hint: "Hasil masuk gudang" },
  { key: "Settled", label: "Lunas", hint: "Split tiga arah selesai" },
];

/** How far along the happy path each status is (index into STEPS, inclusive). */
const PROGRESS: Record<Status, number> = {
  Created: 0,
  SupplyDispatched: 1,
  Active: 2,
  PartiallyDelivered: 2, // between Active and Delivered; Delivered step shows as current
  Delivered: 3,
  Settled: 4,
  Flagged: 3, // delivery happened, settle blocked pending review
  ForceMajeure: 2,
};

export function LifecycleTimeline({ status, className }: { status: Status; className?: string }) {
  const reached = PROGRESS[status];
  const partial = status === "PartiallyDelivered";

  return (
    <ol className={cn("flex flex-wrap gap-y-4 w-full", className)}>
      {STEPS.map((step, i) => {
        const done = i < reached || (i === reached && status === "Settled");
        const current = i === reached && status !== "Settled";
        const upcoming = i > reached;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-start">
            <div className="flex min-w-0 flex-col items-center text-center">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold shadow-sm transition-all",
                  done && "border-emerald-700 bg-emerald-700 text-white",
                  current && "border-emerald-700 bg-emerald-50 text-emerald-800",
                  upcoming && "border-gray-200 bg-white text-gray-400",
                )}
              >
                {done ? <Check size={16} className="stroke-[2.5]" /> : i + 1}
              </span>
              <span
                className={cn(
                  "mt-2 max-w-24 text-xs font-bold leading-tight",
                  upcoming ? "text-gray-400 font-semibold" : "text-gray-900",
                )}
              >
                {step.label}
                {partial && step.key === "Delivered" && current ? " (sebagian)" : ""}
              </span>
              <span className="mt-1 hidden max-w-28 text-[11px] leading-snug text-gray-500 sm:block">
                {step.hint}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "mx-2 mt-4.5 h-0.5 flex-1 rounded-full",
                  i < reached ? "bg-emerald-600" : "bg-gray-200",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
