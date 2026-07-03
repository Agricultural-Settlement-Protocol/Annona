"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Number that counts up once when scrolled into view. `prefix`/`suffix` and a
 * formatter let it show "Rp6.500", "83.376", "< 5 dtk" etc. Reduced-motion
 * safe (snaps to final).
 *
 * `format`/`prefix`/`suffix` are read from a ref, not the effect's dependency
 * array: callers normally pass an inline arrow function (a new reference on
 * every render), and including it in the deps would re-trigger the effect on
 * every parent re-render, restarting the count from zero and making it look
 * like it never stops.
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

  const latest = useRef({ format, prefix, suffix });
  latest.current = { format, prefix, suffix };

  useEffect(() => {
    if (!inView) return;
    const { format: fmt, prefix: pre, suffix: suf } = latest.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setText(`${pre}${fmt(to)}${suf}`);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const { format: f, prefix: p, suffix: s } = latest.current;
        setText(`${p}${f(v)}${s}`);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- format/prefix/suffix read via ref, see comment above
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
