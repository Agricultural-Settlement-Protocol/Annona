import type { MockActivity } from "@/lib/mock-data";
import { TxHashLink } from "@annona/ui";
import { cn } from "@annona/ui";
import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  FilePlus2,
  Landmark,
  PackageCheck,
  Truck,
} from "lucide-react";
import type { ComponentType } from "react";

/** Live-events feed (Screen A). Every row carries its tx hash + explorer link,
 *  the "these are real transactions" proof surface. */

const KIND_META: Record<
  MockActivity["kind"],
  { Icon: ComponentType<{ size?: number }>; cls: string }
> = {
  created: { Icon: FilePlus2, cls: "bg-slate-50 text-slate-700 border border-slate-200/50" },
  dispatched: { Icon: Truck, cls: "bg-indigo-50 text-indigo-700 border border-indigo-200/40" },
  accepted: { Icon: PackageCheck, cls: "bg-[#e7fafc] text-[#0c6a78] border border-[#c3f2f6]/50" },
  delivery: { Icon: PackageCheck, cls: "bg-cyan-50 text-cyan-800 border border-cyan-200/40" },
  settled: { Icon: CheckCircle2, cls: "bg-[#ebf5e9] text-[#0c7a48] border border-[#d2f9de]" },
  flagged: { Icon: AlertTriangle, cls: "bg-amber-50 text-amber-700 border border-amber-200/60" },
  residu: { Icon: Landmark, cls: "bg-[#e7fafc] text-[#0c6a78] border border-[#c3f2f6]/50" },
  forceMajeure: { Icon: CloudRain, cls: "bg-red-50 text-red-700 border border-red-200/50" },
};

export function ActivityFeed({ items }: { items: MockActivity[] }) {
  return (
    <ol className="divide-y divide-gray-50">
      {items.map((item) => {
        const { Icon, cls } = KIND_META[item.kind];
        return (
          <li key={item.id} className="flex items-start gap-4 py-4">
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm",
                cls,
              )}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 leading-snug">{item.text}</p>
              {item.detail ? (
                <p className="mt-1 text-xs text-gray-500 leading-normal">{item.detail}</p>
              ) : null}
              <div className="mt-2 flex items-center gap-3">
                <TxHashLink hash={item.txHash} />
                <span className="text-[10px] text-gray-400 font-mono">{item.at}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
