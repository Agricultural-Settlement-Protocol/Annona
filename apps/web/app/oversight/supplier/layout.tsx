import { AuthGuard } from "@/components/auth-guard";
import { OversightShell } from "@/components/oversight/shell";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Supplier Operator | Annona",
  description: "Dasbor operator Supplier: katalog saprotan, logistik, rekonsiliasi residu.",
};

export default function SupplierLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="supplier">
      <OversightShell viewRole="supplier">{children}</OversightShell>
    </AuthGuard>
  );
}
