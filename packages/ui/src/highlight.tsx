import type { ReactNode } from "react";
import { cn } from "./cn.js";

/**
 * Marker-style highlight behind inline text (like a hand-drawn highlighter).
 * An alternative emphasis to the brand gradient, so copy does not feel
 * monotone.
 *
 * The background lives directly on the text span (not an absolutely
 * positioned overlay sibling) with `box-decoration-break: clone`, so the
 * browser paints one correctly-sized pill per visual line. An absolute
 * overlay inside an `inline` parent only measures the *first* line's box in
 * some engines, or the full bounding rect spanning every line in others,
 * which puts the marker in the wrong place the moment the phrase wraps.
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
    <span
      className={cn(
        "-mx-[0.2em] rounded-[0.25em] px-[0.2em] py-[0.02em]",
        "[box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
        COLORS[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
