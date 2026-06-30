import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  leading?: ReactNode;
}

export function Input({ label, hint, leading, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-3",
          "focus-within:ring-2 focus-within:ring-ring",
        )}
      >
        {leading ? <span className="text-sm text-muted-foreground">{leading}</span> : null}
        <input
          id={inputId}
          className={cn(
            "h-full w-full bg-transparent text-sm text-foreground outline-none",
            "placeholder:text-ink-400",
            className,
          )}
          {...props}
        />
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
