import type { Status } from "@annona/core";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CloudRain,
  PackageCheck,
  Truck,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "./cn.js";

/** Status pill: color + icon + Bahasa label. Maps 1:1 to @annona/core Status.
 *  Status is never color-only (a11y + low-literacy). No em dashes. */
const META: Record<Status, { label: string; cls: string; Icon: ComponentType<{ size?: number }> }> =
  {
    Created: { label: "Dibuat", cls: "bg-ink-100 text-ink-700", Icon: CircleDot },
    PartiallyDelivered: {
      label: "Sebagian Disetor",
      cls: "bg-aqua-100 text-aqua-700",
      Icon: Truck,
    },
    Delivered: { label: "Disetor", cls: "bg-verdant-100 text-verdant-700", Icon: PackageCheck },
    Settled: { label: "Lunas", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    Flagged: { label: "Perlu Ditinjau", cls: "bg-amber-100 text-amber-700", Icon: AlertTriangle },
    ForceMajeure: { label: "Gagal Panen", cls: "bg-red-100 text-red-700", Icon: CloudRain },
  };

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls, Icon } = META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
