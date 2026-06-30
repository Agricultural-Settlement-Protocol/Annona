import { ShieldCheck } from "lucide-react";
import { cn } from "./cn.js";

/** Farmer reputation tier badge. Seeds Layer 2 (the cash-loan "grind" hook). */
export type RepTier = "baru" | "andal" | "tepercaya"; // new | reliable | trusted

const META: Record<RepTier, { label: string; cls: string }> = {
  baru: { label: "Petani Baru", cls: "bg-ink-100 text-ink-600" },
  andal: { label: "Petani Andal", cls: "bg-verdant-100 text-verdant-700" },
  tepercaya: { label: "Petani Tepercaya", cls: "bg-aqua-100 text-aqua-700" },
};

export function ReputationBadge({ tier, className }: { tier: RepTier; className?: string }) {
  const { label, cls } = META[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cls,
        className,
      )}
    >
      <ShieldCheck size={12} />
      {label}
    </span>
  );
}
