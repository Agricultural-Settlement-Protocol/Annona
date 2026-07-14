"use client";

/**
 * Minimal i18n for Annona — React Context + JSON key lookup + localStorage.
 *
 * Usage:
 *   const { t, lang, setLang, toggleLang } = useLanguage();
 *   t("shell.kmp.nav.beranda")        // "Beranda"
 *   t("common.save", { name: "Budi" }) // "Simpan Budi" (interpolation via {{name}})
 *
 * Bahasa Indonesia is the default; English is a toggle. Persisted in localStorage.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import idTranslations from "./id.json";
import enTranslations from "./en.json";

export type Language = "id" | "en";

type TranslationMap = Record<string, string>;

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "annona.lang";
const MAPS: Record<Language, TranslationMap> = {
  id: idTranslations as TranslationMap,
  en: enTranslations as TranslationMap,
};

function loadLang(): Language {
  if (typeof window === "undefined") return "id";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "id") return stored;
  } catch {
    /* ignore */
  }
  return "id";
}

function persistLang(l: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* ignore */
  }
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "id",
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("id");

  useEffect(() => {
    setLangState(loadLang());
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    persistLang(l);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "id" ? "en" : "id";
      persistLang(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const map = MAPS[lang];
      let raw = map[key];
      if (!raw) {
        // fallback to the other language
        raw = MAPS[lang === "id" ? "en" : "id"][key];
      }
      if (!raw && process.env.NODE_ENV === "development") {
        console.warn(`[i18n] Missing translation key "${key}"`);
      }
      if (!raw) return key;
      if (!params) return raw;
      let result = raw;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      }
      return result;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
