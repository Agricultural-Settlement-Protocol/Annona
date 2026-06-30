"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Number that counts up once when scrolled into view. `prefix`/`suffix` and a
 * formatter let it show "Rp6.500", "83.376", "< 5 dtk" etc. Reduced-motion
 * safe (snaps to final).
 */
export function CountUp({
  to,
  duration = 1.4,
  format = (n) => Math.round(n).toLocaleString("id-ID"),
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [text, setText] = useState(`${prefix}${format(0)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setText(`${prefix}${format(to)}${suffix}`);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setText(`${prefix}${format(v)}${suffix}`),
    });
    return () => controls.stop();
  }, [inView, to, duration, format, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
