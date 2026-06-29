import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Annona Protocol",
  description: "Agricultural offtake settlement rail on Stellar for Koperasi Desa Merah Putih",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Bahasa Indonesia is the default UI language (English toggle added later).
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
