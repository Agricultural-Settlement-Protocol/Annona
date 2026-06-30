import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Brand sans: Plus Jakarta Sans (Indonesian foundry, rounded geometric).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-jakarta",
  display: "swap",
});

// Display serif: Fraunces (classical gravitas, the Annona / Roman editorial layer).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-fraunces",
  display: "swap",
});

// Data mono: JetBrains Mono (tx hashes, addresses).
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Annona Protocol",
  description: "Agricultural offtake settlement rail on Stellar for Koperasi Desa Merah Putih",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Bahasa Indonesia is the default UI language (English toggle added later).
  return (
    <html lang="id" className={`${jakarta.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
