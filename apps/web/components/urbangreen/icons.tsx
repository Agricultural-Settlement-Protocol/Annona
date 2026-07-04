/* Shared inline SVG icons used across UrbanGreen sections. */

export const ArrowRightIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width={size}
  >
    <line x1="5" x2="19" y1="12" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const DiagonalArrowIcon = () => (
  <svg
    fill="none"
    height="16"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
  >
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);

export const GlobeIcon = () => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="20"
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="M12 2v20" />
    <path d="M12 12c-3.314 0-6-2.686-6-6h6z" />
    <path d="M12 12c3.314 0 6 2.686 6 6h-6z" />
  </svg>
);

export const PlayIcon = () => (
  <svg fill="white" height="32" stroke="none" viewBox="0 0 24 24" width="32">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const SparkleIcon = () => (
  <svg
    className="mb-4"
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

export const SectionArrowIcon = ({ size = 32 }: { size?: number }) => (
  <svg
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1"
    viewBox="0 0 24 24"
    width={size}
  >
    <line x1="5" x2="19" y1="12" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const CodeIcon = () => (
  <svg
    fill="none"
    height="32"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1"
    viewBox="0 0 24 24"
    width="32"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const BarChartIcon = () => (
  <svg
    fill="none"
    height="20"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="20"
  >
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

export const BoltIcon = () => (
  <svg className="text-gray-200 w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M13 10V3L4 14h7v7l9-11h-7z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1"
    />
  </svg>
);

export const ArrowForwardIcon = () => (
  <svg
    fill="none"
    height="16"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
  >
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);
