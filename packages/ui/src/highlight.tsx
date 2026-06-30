import type { ReactNode } from "react";
import { cn } from "./cn.js";

/**
 * Marker-style highlight behind inline text (like a hand-drawn highlighter).
 * An alternative emphasis to the brand gradient, so copy does not feel
 * monotone. Multi-line safe via box-decoration-break.
 */
type HighlightColor = "verdant" | "aqua" | "amber";

const COLORS: Record<HighlightColor, string> = {
  verdant: "bg-verdant-200/70",
  aqua: "bg-aqua-200/70",
  amber: "bg-amber-200/70",
};

export function Highlight({
  children,
  color = "verdant",
  className,
}: {
  children: ReactNode;
  color?: HighlightColor;
  className?: string;
}) {
  return (
    <span className={cn("relative inline", className)}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-[-0.15em] bottom-[0.05em] top-[0.18em] -z-0 -rotate-[0.6deg] rounded-[0.3em]",
          COLORS[color],
        )}
        style={{ boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
      />
      <span className="relative z-10">{children}</span>
    </span>
  );
}
