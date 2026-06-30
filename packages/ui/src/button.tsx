import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.js";

type Variant = "gradient" | "primary" | "accent" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // gradient = the signature hero CTA (emerald to teal). Lead with this.
  gradient:
    "annona-gradient text-white shadow-[var(--shadow-glow)] hover:brightness-105 active:brightness-95",
  // primary = agriculture/credit; accent = on-chain/settlement (see DESIGN_GUIDE)
  primary: "bg-primary text-primary-foreground hover:bg-verdant-800 shadow-sm",
  accent: "bg-accent text-accent-foreground hover:bg-aqua-800 shadow-sm",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-muted hover:border-verdant-300",
  ghost: "text-foreground hover:bg-surface-muted",
  danger: "bg-danger text-danger-foreground hover:opacity-90 shadow-sm",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2", // 44px touch target
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
