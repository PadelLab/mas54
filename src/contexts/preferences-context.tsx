"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import type { AppLocale, LocalePreference } from "@/lib/app-locale";
import { isAppLocale } from "@/lib/app-locale";
import { hasCalendarSubscribeBeenPrompted } from "@/lib/calendar-subscribe-client";
import {
  LOCALE_CHANGED_EVENT,
  LOCALE_STORAGE_KEY,
  persistLocale,
} from "@/lib/public-auth-locale";

export type NotificationPrefs = {
  lessonReminders: boolean;
  evaluationAlerts: boolean;
  lessonRequestAlerts: boolean;
  phoneCalendar: boolean;
};

export type ThemePreference = "light" | "dark" | "system";

/** UI language: static catalogs in `src/messages`. */
export type { AppLocale, LocalePreference } from "@/lib/app-locale";

const STORAGE_NOTIF = "padellab_notification_prefs";
const STORAGE_THEME = "padellab_theme_pref";

const defaultNotifications: NotificationPrefs = {
  lessonReminders: true,
  evaluationAlerts: true,
  lessonRequestAlerts: true,
  phoneCalendar: false,
};

const NOTIF_KEYS = [
  "lessonReminders",
  "evaluationAlerts",
  "lessonRequestAlerts",
  "phoneCalendar",
] as const satisfies readonly (keyof NotificationPrefs)[];

function normalizeNotifications(parsed: unknown): NotificationPrefs {
  const src = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const next: NotificationPrefs = { ...defaultNotifications };
  for (const k of NOTIF_KEYS) {
    if (typeof src[k] === "boolean") next[k] = src[k];
  }
  if (typeof src.phoneCalendar !== "boolean" && hasCalendarSubscribeBeenPrompted()) {
    next.phoneCalendar = true;
  }
  return next;
}

function readNotifications(): NotificationPrefs {
  if (typeof window === "undefined") return defaultNotifications;
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF);
    if (!raw) {
      return {
        ...defaultNotifications,
        phoneCalendar: hasCalendarSubscribeBeenPrompted(),
      };
    }
    return normalizeNotifications(JSON.parse(raw));
  } catch {
    return defaultNotifications;
  }
}

function readTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_THEME);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
    return "system";
  } catch {
    return "system";
  }
}

function readLocalePref(): AppLocale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isAppLocale(raw)) return raw;
    return "en";
  } catch {
    return "en";
  }
}

type PreferencesContextValue = {
  notifications: NotificationPrefs;
  setNotificationPrefs: (patch: Partial<NotificationPrefs>) => void;
  theme: ThemePreference;
  setThemePref: (next: ThemePreference) => void;
  localePref: LocalePreference;
  setLocalePref: (next: LocalePreference) => void;
  effectiveLocale: AppLocale;
  hydrated: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function isDarkTheme(theme: ThemePreference) {
  return (
    theme === "dark" ||
    (theme !== "light" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function applyThemeClass(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const dark = isDarkTheme(theme);
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle("dark", dark);
  body?.classList.toggle("dark", dark);
  root.setAttribute("data-theme", dark ? "dark" : "light");
  body?.setAttribute("data-theme", dark ? "dark" : "light");
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotificationsState] =
    useState<NotificationPrefs>(defaultNotifications);
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [localePref, setLocaleState] = useState<AppLocale>("en");
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    const initial = readTheme();
    setNotificationsState(readNotifications());
    setThemeState(initial);
    setLocaleState(readLocalePref());
    applyThemeClass(initial);
    setHydrated(true);

    const onLocaleChanged = () => setLocaleState(readLocalePref());
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_THEME) return;
      const next = readTheme();
      setThemeState(next);
      applyThemeClass(next);
    };
    window.addEventListener(LOCALE_CHANGED_EVENT, onLocaleChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LOCALE_CHANGED_EVENT, onLocaleChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const effectiveLocale = useMemo(() => localePref, [localePref]);

  useLayoutEffect(() => {
    if (!hydrated) return;
    applyThemeClass(theme);
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const dark = isDarkTheme(theme);
      if (root.classList.contains("dark") !== dark) {
        applyThemeClass(theme);
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    if (theme !== "system") {
      return () => observer.disconnect();
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    mq.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", onChange);
    };
  }, [theme, hydrated]);

  const setNotificationPrefs = useCallback((patch: Partial<NotificationPrefs>) => {
    setNotificationsState((prev) => {
      const next = normalizeNotifications({ ...prev, ...patch });
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_NOTIF, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const setThemePref = useCallback((next: ThemePreference) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_THEME, next);
      applyThemeClass(next);
    }
  }, []);

  const setLocalePref = useCallback((next: LocalePreference) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      setNotificationPrefs,
      theme,
      setThemePref,
      localePref,
      setLocalePref,
      effectiveLocale,
      hydrated,
    }),
    [
      notifications,
      setNotificationPrefs,
      theme,
      setThemePref,
      localePref,
      setLocalePref,
      effectiveLocale,
      hydrated,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
