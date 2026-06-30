import type { ReactNode } from "react";
import { cn } from "./cn.js";

type Tone = "neutral" | "verdant" | "aqua" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  verdant: "bg-verdant-100 text-verdant-700",
  aqua: "bg-aqua-100 text-aqua-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
