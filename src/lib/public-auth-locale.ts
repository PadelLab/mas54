import { isAppLocale, type AppLocale } from "@/lib/app-locale";

export function parseAccountLocale(value: string | undefined | null): AppLocale | null {
  return isAppLocale(value) ? value : null;
}
export const PUBLIC_AUTH_LOCALE: AppLocale = "es";

export function isPublicAuthPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/register" || pathname.startsWith("/register/")) return true;
  return false;
}

export const LOCALE_STORAGE_KEY = "padellab_locale_pref";
export const LOCALE_CHANGED_EVENT = "padellab-locale-changed";

export function persistLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
}

export function resetLocaleToSpanish() {
  persistLocale("es");
}
