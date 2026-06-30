import { cn } from "./cn.js";

/**
 * The Annona mark: two interlocking chain links on a diagonal with organic
 * ticks, tracing assets/logo-no-bg.svg. The chain = the settlement bond
 * between farmer and cooperative. Inherits currentColor, or strokes with the
 * brand gradient when `gradient` is set.
 */
export function LogoMark({
  size = 28,
  gradient = false,
  className,
}: {
  size?: number;
  gradient?: boolean;
  className?: string;
}) {
  const gid = "annona-mark-grad";
  const stroke = gradient ? `url(#${gid})` : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      role="img"
      aria-label="Annona"
      className={className}
    >
      {gradient ? (
        <defs>
          <linearGradient id={gid} x1="4" y1="24" x2="24" y2="4" gradientUnits="userSpaceOnUse">
            <stop stopColor="#14b866" />
            <stop offset="0.5" stopColor="#0fa68f" />
            <stop offset="1" stopColor="#10b3c4" />
          </linearGradient>
        </defs>
      ) : null}
      {/* links enlarged to fill the frame (reuse 32-grid geometry, scaled up) */}
      <g transform="translate(14 14) scale(1.32) translate(-16 -16)">
        <g stroke={stroke} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.7 18.3a4.4 4.4 0 0 1 0-6.2l2.2-2.2a4.4 4.4 0 0 1 6.2 6.2l-1.5 1.5" />
          <path d="M18.3 13.7a4.4 4.4 0 0 1 0 6.2l-2.2 2.2a4.4 4.4 0 0 1-6.2-6.2l1.5-1.5" />
        </g>
        <g stroke={stroke} strokeWidth="2.2" strokeLinecap="round" opacity="0.8">
          <path d="M9.4 9.6l1.2 1.2" />
          <path d="M8 16.4l1.7 0.2" />
          <path d="M12.6 22.8l1.5-0.9" />
        </g>
      </g>
    </svg>
  );
}

/** Lockup: mark + wordmark. Mark is sized larger than the cap height and set
 *  tight to the word so it reads as one unit. */
export function Logo({
  size = 28,
  gradient = false,
  className,
  showWordmark = true,
}: {
  size?: number;
  gradient?: boolean;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-foreground", className)}>
      <LogoMark size={size * 1.25} gradient={gradient} />
      {showWordmark ? (
        <span
          className="font-sans font-bold tracking-tight"
          style={{ fontSize: size, letterSpacing: "-0.02em" }}
        >
          Annona
        </span>
      ) : null}
    </span>
  );
}
