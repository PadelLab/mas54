export const APP_LOCALES = [
  "en",
  "es",
  "pt",
  "fr",
  "it",
  "de",
  "ru",
  "nl",
  "pl",
  "zh",
  "ja",
  "ko",
  "ca",
  "sv",
  "tr",
] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

/** Saved preference: one of the UI catalogs. */
export type LocalePreference = AppLocale;

export const APP_LOCALE_NATIVE_NAME: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  pt: "Português (Brasil)",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  ru: "Русский",
  nl: "Nederlands",
  pl: "Polski",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ca: "Català",
  sv: "Svenska",
  tr: "Türkçe",
};

export const APP_LOCALE_INTL: Record<AppLocale, string> = {
  en: "en-US",
  es: "es-ES",
  pt: "pt-BR",
  fr: "fr-FR",
  it: "it-IT",
  de: "de-DE",
  ru: "ru-RU",
  nl: "nl-NL",
  pl: "pl-PL",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  ca: "ca-ES",
  sv: "sv-SE",
  tr: "tr-TR",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value ?? "");
}
