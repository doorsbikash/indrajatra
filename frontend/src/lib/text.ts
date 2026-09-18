import type { Locale, LocalizedText } from "./types";

export const languageNames: Record<Locale, string> = {
  en: "English",
  ne: "Nepali",
  new: "Nepal Bhasa"
};

export function t(value: LocalizedText | undefined, locale: Locale): string {
  if (!value) return "";
  return value[locale] || value.en;
}
