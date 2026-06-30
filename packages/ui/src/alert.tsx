import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "./cn.js";

type Tone = "info" | "success" | "warning" | "danger";

const META: Record<Tone, { cls: string; Icon: ComponentType<{ size?: number }> }> = {
  info: { cls: "border-aqua-200 bg-aqua-50 text-aqua-900", Icon: Info },
  success: { cls: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  warning: { cls: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  danger: { cls: "border-red-200 bg-red-50 text-red-900", Icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { cls, Icon } = META[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4", cls, className)} role="alert">
      <Icon size={18} />
      <div className="text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div> : null}
      </div>
    </div>
  );
}
