import { cn } from "./cn.js";

/** The Annona chain-link mark, drawn in SVG so it inherits currentColor and
 *  scales crisply. Two interlocking links = the settlement bond between
 *  farmer and cooperative. Pair with the wordmark in apps/web/public/brand. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Annona"
      className={className}
    >
      <path
        d="M19 16.5a8.5 8.5 0 0 0 0 15M29 16.5a8.5 8.5 0 0 1 0 15"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path d="M16.5 24h15" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <circle
        cx="24"
        cy="24"
        r="20.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 5"
        opacity="0.4"
      />
    </svg>
  );
}

/** Lockup: mark + wordmark text. Wordmark uses the brand sans. */
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
