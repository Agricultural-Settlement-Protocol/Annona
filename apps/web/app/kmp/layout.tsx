import { AuthGuard } from "@/components/auth-guard";
import { KmpShell } from "@/components/kmp/shell";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dasbor KMP | Annona",
  description: "Kokpit operasional koperasi: perjanjian offtake, setoran panen, pembayaran.",
};

export default function KmpLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="kmp">
      <KmpShell>{children}</KmpShell>
    </AuthGuard>
  );
}
