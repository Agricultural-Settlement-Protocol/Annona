import { AuthGuard } from "@/components/auth-guard";
import { OversightShell } from "@/components/oversight/shell";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pengawasan Pemerintah | Annona",
  description: "Dasbor regulator: produksi regional, leaderboard koperasi, antrean flag.",
};

export default function PemerintahLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="pemerintah">
      <OversightShell viewRole="pemerintah">{children}</OversightShell>
    </AuthGuard>
  );
}
