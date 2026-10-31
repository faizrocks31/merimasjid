import { cookies } from "next/headers";
import { en, type Dictionary } from "./en";
import { hi } from "./hi";
import { ur } from "./ur";
import { isLocale, type Locale } from "./config";

export const DICTIONARIES: Record<Locale, Dictionary> = { en, hi, ur };
export const LOCALE_COOKIE = "masjid_locale";

export type TranslationKey = keyof Dictionary;
export type Translator = (key: TranslationKey) => string;

/** Server-side dictionary for the active locale. Falls back to English. */
export async function getDictionary(): Promise<{ locale: Locale; t: Translator }> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(value) ? value : "en";
  const dict = DICTIONARIES[locale];
  return { locale, t: (key) => dict[key] ?? en[key] ?? String(key) };
}

export function translate(locale: Locale, key: TranslationKey): string {
  return DICTIONARIES[locale]?.[key] ?? en[key] ?? String(key);
}

export { en, hi, ur };
export type { Dictionary };
