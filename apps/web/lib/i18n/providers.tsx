"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "./context";

/**
 * Client-side providers wrapper for the root layout.
 * Contains LanguageProvider so that all dashboard shells
 * and pages can consume the `useLanguage()` hook.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
