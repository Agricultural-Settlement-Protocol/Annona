"use client";

/**
 * DetailSection and EmptyNotice — shared primitives for the 8-card agreement
 * detail layout. Each section is always rendered as a Card; when the section
 * has no data, an EmptyNotice is rendered inside it instead of omitting the
 * card. This ensures the layout is consistent across all agreement states.
 *
 * No em dashes. Color via CSS custom properties only.
 */

import { Card, CardContent, CardHeader } from "@annona/ui";
import type { LucideIcon } from "lucide-react";

interface DetailSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}

/** A consistently styled Card that wraps one of the 8 agreement detail sections. */
export function DetailSection({
  title,
  description,
  icon,
  children,
  noPadding = false,
}: DetailSectionProps) {
  return (
    <Card className="rounded-[2rem] border-gray-100/80 shadow-sm overflow-hidden bg-white">
      <CardHeader title={title} description={description} action={icon} />
      <CardContent className={noPadding ? "p-0 pb-4" : undefined}>{children}</CardContent>
    </Card>
  );
}

interface EmptyNoticeProps {
  icon: LucideIcon;
  message: string;
}

/** Inline muted empty state rendered inside a DetailSection when data is absent. */
export function EmptyNotice({ icon: Icon, message }: EmptyNoticeProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-gray-50/50 border border-gray-100/50 px-5 py-6">
      <Icon size={22} className="shrink-0 text-gray-400" />
      <p className="text-sm font-medium text-gray-500 leading-normal">{message}</p>
    </div>
  );
}
