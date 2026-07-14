import type { ResiduStatus, Status } from "@annona/core";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CircleDot,
  CloudRain,
  Hourglass,
  PackageCheck,
  ShieldAlert,
  Truck,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "./cn.js";

/** Status pill: color + icon + Bahasa label. Maps 1:1 to @annona/core Status.
 *  Status is never color-only (a11y + low-literacy). No em dashes.
 *  v3.0 (PMK 15/2026): adds the double-confirmation gates between Created and
 *  delivery — SupplyDispatched (Supplier released logistics) and Active (KMP
 *  confirmed physical receipt, debt now a live liability). */
const META: Record<Status, { label: string; cls: string; Icon: ComponentType<{ size?: number }> }> =
  {
    Created: { label: "Dibuat", cls: "bg-ink-100 text-ink-700", Icon: CircleDot },
    SupplyDispatched: {
      label: "Dikirim Supplier",
      cls: "bg-indigo-100 text-indigo-700",
      Icon: Truck,
    },
    Active: { label: "Berjalan", cls: "bg-aqua-200 text-aqua-800", Icon: PackageCheck },
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

/** Residu reconciliation pill: color + icon + Bahasa label. Maps 1:1 to
 *  @annona/core ResiduStatus. `Disputed` is a review indicator that freezes
 *  the KMP's on-chain reputation, never an automatic accusation. */
const RESIDU_META: Record<
  ResiduStatus,
  { label: string; cls: string; Icon: ComponentType<{ size?: number }> }
> = {
  Pending: { label: "Belum Disetor", cls: "bg-ink-100 text-ink-700", Icon: Hourglass },
  Remitted: { label: "Menunggu Verifikasi", cls: "bg-aqua-100 text-aqua-700", Icon: Banknote },
  Cleared: { label: "Terverifikasi", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  Disputed: { label: "Bermasalah", cls: "bg-red-100 text-red-700", Icon: ShieldAlert },
};

export function ResiduStatusBadge({ status }: { status: ResiduStatus }) {
  const { label, cls, Icon } = RESIDU_META[status];
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
