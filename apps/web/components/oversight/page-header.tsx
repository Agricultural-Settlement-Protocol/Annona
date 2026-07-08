import type { ReactNode } from "react";

/** Page title row for oversight screens. Matches KMP PageHeader pattern.
 *  No em dashes in any string passed in. */
export function OversightPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm font-semibold text-gray-500 leading-normal">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}
