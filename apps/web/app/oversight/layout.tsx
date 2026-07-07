import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Oversight | Annona",
  description:
    "Dasbor pengawasan Annona Protocol: Agrinas (operator) dan Pemerintah (regulasi, hanya baca).",
};

export default function OversightRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
