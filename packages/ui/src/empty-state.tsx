import type { ReactNode } from "react";
import { cn } from "./cn.js";

/** Empty state. Calm, helpful, with one clear action. Can sit on a light mesh. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border",
        "bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-3 text-ink-400">{icon}</div> : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
