import { OversightShell } from "@/components/oversight/shell";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Agrinas Operator | Annona",
  description: "Dasbor operator Agrinas: katalog saprotan, logistik, rekonsiliasi residu.",
};

export default function AgrinasLayout({ children }: { children: ReactNode }) {
  return <OversightShell viewRole="agrinas">{children}</OversightShell>;
}
