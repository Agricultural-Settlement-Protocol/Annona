import { cn } from "./cn.js";

/**
 * The Annona mark: two interlocking chain links on a diagonal, with a few
 * organic dash accents, tracing assets/logo-no-bg.svg. The chain = the
 * settlement bond between farmer and cooperative. Inherits currentColor.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Annona"
      className={className}
    >
      {/* two interlocking links (diagonal, bottom-left to top-right) */}
      <g stroke="currentColor" strokeWidth="2.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.7 18.3a4.4 4.4 0 0 1 0-6.2l2.2-2.2a4.4 4.4 0 0 1 6.2 6.2l-1.5 1.5" />
        <path d="M18.3 13.7a4.4 4.4 0 0 1 0 6.2l-2.2 2.2a4.4 4.4 0 0 1-6.2-6.2l1.5-1.5" />
      </g>
      {/* organic dash accents (the hand-drawn ticks in the mark) */}
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <path d="M9.2 9.4l1.4 1.4" />
        <path d="M7.6 16.6l2 0.2" />
        <path d="M12.4 23.2l1.8-1" />
      </g>
    </svg>
  );
}

/** Lockup: mark + wordmark. Wordmark uses the brand sans. */
export function Logo({
  size = 28,
  className,
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className="font-sans font-bold tracking-tight" style={{ fontSize: size * 0.82 }}>
          Annona
        </span>
      ) : null}
    </span>
  );
}
