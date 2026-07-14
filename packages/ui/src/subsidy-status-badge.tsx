import { BadgeCheck, CircleDashed, MinusCircle } from "lucide-react";
import { cn } from "./cn.js";

/** Farmer e-RDKK (subsidized-fertilizer) verification status. Gates whether an
 *  agreement may use the Subsidized (HET) price tier. Off-chain, KMP-set. */
export type SubsidyStatus = "Terverifikasi" | "Belum" | "NonSubsidi";

const META: Record<SubsidyStatus, { label: string; cls: string; Icon: typeof BadgeCheck }> = {
  Terverifikasi: {
    label: "e-RDKK Terverifikasi",
    cls: "bg-verdant-100 text-verdant-700",
    Icon: BadgeCheck,
  },
  Belum: {
    label: "e-RDKK Belum",
    cls: "bg-amber-100 text-amber-700",
    Icon: CircleDashed,
  },
  NonSubsidi: {
    label: "Non-Subsidi",
    cls: "bg-ink-100 text-ink-600",
    Icon: MinusCircle,
  },
};

export function SubsidyStatusBadge({
  status,
  className,
}: {
  status: SubsidyStatus;
  className?: string;
}) {
  const { label, cls, Icon } = META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cls,
        className,
      )}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
