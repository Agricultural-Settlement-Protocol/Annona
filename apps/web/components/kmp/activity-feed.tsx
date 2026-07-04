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
  created: { Icon: FilePlus2, cls: "bg-ink-100 text-ink-600" },
  dispatched: { Icon: Truck, cls: "bg-indigo-100 text-indigo-700" },
  accepted: { Icon: PackageCheck, cls: "bg-aqua-100 text-aqua-700" },
  delivery: { Icon: PackageCheck, cls: "bg-verdant-100 text-verdant-700" },
  settled: { Icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700" },
  flagged: { Icon: AlertTriangle, cls: "bg-amber-100 text-amber-700" },
  residu: { Icon: Landmark, cls: "bg-aqua-100 text-aqua-700" },
  forceMajeure: { Icon: CloudRain, cls: "bg-red-100 text-red-700" },
};

export function ActivityFeed({ items }: { items: MockActivity[] }) {
  return (
    <ol className="divide-y divide-border">
      {items.map((item) => {
        const { Icon, cls } = KIND_META[item.kind];
        return (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                cls,
              )}
            >
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.text}</p>
              {item.detail ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
              ) : null}
              <div className="mt-1 flex items-center gap-2">
                <TxHashLink hash={item.txHash} />
                <span className="text-[11px] text-muted-foreground">{item.at}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
