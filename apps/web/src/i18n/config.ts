import { LOCALES, type Locale } from "@dawry/shared";

export const DEFAULT_LOCALE: Locale = "ar";
/** Locale lives in a cookie (no /ar or /en in URLs, so QR links never change). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function resolveLocale(value: string | undefined): Locale {
  return LOCALES.find((l) => l === value) ?? DEFAULT_LOCALE;
}

export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
