import { AuthGuard } from "@/components/auth-guard";
import { FinancierShell } from "@/components/financier/shell";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dasbor Pemodal | Annona",
  description: "Kelola portofolio pendanaan offtake dan setujui permohonan talangan koperasi.",
};

export default function FinancierLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="financier">
      <FinancierShell>{children}</FinancierShell>
    </AuthGuard>
  );
}
