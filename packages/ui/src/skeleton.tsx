import { cn } from "./cn.js";

/** Loading placeholder. Never demo a spinner; use skeletons. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-100", className)} />;
}
