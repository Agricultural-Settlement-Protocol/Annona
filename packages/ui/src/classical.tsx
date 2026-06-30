import type { ReactNode } from "react";
import { cn } from "./cn.js";
import { LogoMark } from "./logo.js";

/**
 * Editorial / Greco-Roman layer. Annona was the Roman goddess of the grain
 * supply (grain measure + cornucopia, fair distribution). These give the
 * landing classical gravitas without cheese: wheat + laurel line motifs, an
 * inscription eyebrow, a coin/seal emblem, a fluted divider, gradient text.
 * Use on landing + marketing only, not inside dense dashboards.
 */

/** A single wheat sprig, drawn in line. Inherits currentColor. */
export function WheatMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Gandum"
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22V8" />
      <path d="M12 8c0-2.2 1.6-4 3.2-4 0 2.2-1.6 4-3.2 4Z" />
      <path d="M12 8c0-2.2-1.6-4-3.2-4 0 2.2 1.6 4 3.2 4Z" />
      <path d="M12 13c0-1.9 1.5-3.4 3-3.4 0 1.9-1.5 3.4-3 3.4Z" />
      <path d="M12 13c0-1.9-1.5-3.4-3-3.4 0 1.9 1.5 3.4 3 3.4Z" />
      <path d="M12 18c0-1.9 1.5-3.4 3-3.4 0 1.9-1.5 3.4-3 3.4Z" />
      <path d="M12 18c0-1.9-1.5-3.4-3-3.4 0 1.9 1.5 3.4 3 3.4Z" />
    </svg>
  );
}

/** Inscription-style eyebrow: small caps, tracked, flanked by hairlines.
 *  Like a carved Roman label. */
export function Eyebrow({
  children,
  className,
  lines = true,
}: {
  children: ReactNode;
  className?: string;
  lines?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 text-verdant-700", className)}>
      {lines ? (
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-verdant-300" />
      ) : null}
      <span className="text-xs font-semibold uppercase tracking-[0.22em]">{children}</span>
      {lines ? (
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-verdant-300" />
      ) : null}
    </div>
  );
}

/** Fluted divider with a centered wheat glyph. Classical section break. */
export function WheatDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 text-verdant-500", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-ink-200 to-ink-200" />
      <WheatMark size={20} />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-ink-200 to-ink-200" />
    </div>
  );
}

/** A coin / seal emblem: the mark inside a ring with curved inscription.
 *  Echoes Annona on Roman aes coinage. */
export function SealEmblem({
  size = 132,
  label = "ANNONA PROTOCOL",
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  const id = "annona-seal-arc";
  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 132 132"
        role="img"
        aria-label={label}
        className="text-verdant-700"
      >
        <defs>
          <path id={`${id}-top`} d="M22 66a44 44 0 0 1 88 0" fill="none" />
          <path id={`${id}-bot`} d="M110 66a44 44 0 0 1 -88 0" fill="none" />
        </defs>
        <circle
          cx="66"
          cy="66"
          r="62"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <circle
          cx="66"
          cy="66"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 4"
          opacity="0.45"
        />
        <text fill="currentColor" fontSize="9" letterSpacing="3" fontWeight="600">
          <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
        <text fill="currentColor" fontSize="9" letterSpacing="4" fontWeight="600" opacity="0.7">
          <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
            MMXXVI
          </textPath>
        </text>
      </svg>
      <span className="absolute text-verdant-700">
        <LogoMark size={size * 0.34} />
      </span>
    </div>
  );
}

/** Brand-gradient text (emerald to teal). For hero key words + big numbers. */
export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("annona-gradient-text", className)}>{children}</span>;
}
