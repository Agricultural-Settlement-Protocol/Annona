import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

/** Signature mesh gradient (sage to aqua), matching the logo.
 *  Use large + sparingly: hero, auth, success. Never behind dense data. */
export function MeshBackground({
  scanlines = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { scanlines?: boolean }) {
  return (
    <div className={cn("relative annona-mesh", className)} {...props}>
      {scanlines ? (
        <div className="pointer-events-none absolute inset-0 annona-scanlines" aria-hidden />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/** Standalone scanline overlay (place inside a relative container). */
export function Scanlines({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 annona-scanlines", className)}
      aria-hidden
    />
  );
}
