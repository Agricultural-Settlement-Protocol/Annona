"use client";

import { motion, useInView } from "motion/react";
import { useId, useRef } from "react";

/**
 * Lightweight area chart, hand-built in SVG (no chart library = tiny + fast).
 * Animates the line drawing + area fade when scrolled into view. Illustrative
 * data: cumulative harvest value recorded on-chain over a season.
 */
const DATA = [8, 14, 12, 22, 28, 34, 46, 58, 72, 84, 96, 120];
const LABELS = ["Jan", "", "Mar", "", "Mei", "", "Jul", "", "Sep", "", "Nov", ""];

export function SettlementChart() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const gid = useId().replace(/:/g, "");

  const w = 560;
  const h = 240;
  const pad = { l: 8, r: 8, t: 16, b: 24 };
  const max = Math.max(...DATA) * 1.1;
  const ix = (i: number) => pad.l + (i / (DATA.length - 1)) * (w - pad.l - pad.r);
  const iy = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const line = DATA.map(
    (v, i) => `${i === 0 ? "M" : "L"}${ix(i).toFixed(1)} ${iy(v).toFixed(1)}`,
  ).join(" ");
  const area = `${line} L${ix(DATA.length - 1).toFixed(1)} ${h - pad.b} L${ix(0).toFixed(1)} ${h - pad.b} Z`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full"
      role="img"
      aria-label="Pertumbuhan nilai panen yang tercatat"
    >
      <defs>
        <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14b866" stopOpacity="0.28" />
          <stop offset="1" stopColor="#10b3c4" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#14b866" />
          <stop offset="1" stopColor="#10b3c4" />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line
          key={g}
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + g * (h - pad.t - pad.b)}
          y2={pad.t + g * (h - pad.t - pad.b)}
          stroke="#dde3d6"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      ))}

      <motion.path
        d={area}
        fill={`url(#${gid}-fill)`}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={`url(#${gid}-stroke)`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* last-point dot */}
      <motion.circle
        cx={ix(DATA.length - 1)}
        cy={iy(DATA[DATA.length - 1] ?? 0)}
        r="4.5"
        fill="#10b3c4"
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ duration: 0.3, delay: 1.3 }}
      />

      {LABELS.map((l, i) =>
        l ? (
          <text
            key={l}
            x={ix(i)}
            y={h - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#939e8a"
            fontFamily="var(--font-sans)"
          >
            {l}
          </text>
        ) : null,
      )}
    </svg>
  );
}
