"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "./context";

/**
 * Compact language toggle button for dashboard shell headers.
 * Shows the active language code ("ID" / "EN") with a globe icon.
 * Toggles between Bahasa Indonesia and English on click.
 */
export function LanguageToggle({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={lang === "id" ? "Ganti ke Bahasa Inggris" : "Switch to Bahasa Indonesia"}
      title={lang === "id" ? "English" : "Bahasa Indonesia"}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/60 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold tracking-wide text-emerald-700 transition-all hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 active:scale-[0.97]"
      }
    >
      <Languages size={13} className="shrink-0" />
      {iconOnly ? null : <span className="tracking-wider">{lang === "id" ? "EN" : "ID"}</span>}
    </button>
  );
}
