import { cn } from "@annona/ui";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

/** Table primitives for dense-but-friendly KMP data screens. White card frame,
 *  muted header row, generous row height (officers are not spreadsheet users).
 *  Always wrap wide tables so the frame scrolls, never the page. */

export function TableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-gray-100 bg-white shadow-sm p-6 sm:p-8 overflow-hidden",
        className,
      )}
    >
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full min-w-max text-sm border-collapse", className)} {...props} />;
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-gray-100 text-left">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "pb-5 px-3 text-xs font-semibold tracking-wide whitespace-nowrap text-gray-500 uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-50">{children}</tbody>;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-gray-50/50 transition-colors", className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("py-5 px-3 whitespace-nowrap text-gray-800 text-sm font-medium", className)} {...props} />;
}
