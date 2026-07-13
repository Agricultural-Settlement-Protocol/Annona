/**
 * Convenience re-export for the i18n hook and helpers.
 *
 * Usage (in client components):
 *   import { useI18n } from "@/lib/i18n/use-i18n";
 *   const { t, lang, toggleLang } = useI18n();
 *   t("common.save") // => "Simpan" / "Save" depending on locale
 */
export { useLanguage as useI18n } from "./context";
export type { Language } from "./context";
