"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import {
  usePreferences,
  type LocalePreference,
  type ThemePreference,
} from "@/contexts/preferences-context";
import { APP_LOCALE_NATIVE_NAME, APP_LOCALES, isAppLocale } from "@/lib/app-locale";
import { ChevronDown } from "lucide-react";
import { cn, pageTitleClass } from "@/lib/utils";

function languageOptionLabel(translated: string, locale: keyof typeof APP_LOCALE_NATIVE_NAME) {
  if (!translated || translated === locale || translated.includes(".")) {
    return APP_LOCALE_NATIVE_NAME[locale];
  }
  return translated;
}

function PrefSelect({
  id,
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  "aria-label": string;
}) {
  return (
    <div className="relative w-full sm:w-auto sm:min-w-[12rem]">
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full cursor-pointer appearance-none rounded-xl border py-2 pl-3.5 pr-10 text-sm font-medium transition-colors",
          "border-zinc-200 bg-white text-zinc-900 shadow-sm",
          "hover:border-zinc-300 hover:bg-zinc-50/80",
          "focus:border-zinc-400 focus:outline-none",
          "dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
          "dark:focus:border-zinc-500",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        aria-hidden
      />
    </div>
  );
}

function PrefRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
        {description ? <p className="mt-0.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p> : null}
      </div>
      <div className="shrink-0 sm:max-w-[min(100%,16rem)] sm:flex-initial">{control}</div>
    </li>
  );
}

export default function SettingsPreferencesPage() {
  const { user, updateProfile } = useAuth();
  const { theme, setThemePref, localePref, setLocalePref } = usePreferences();
  const t = useTranslations("Settings");
  const tLang = useTranslations("Languages");
  const preferencesPageSubtitle = t("preferencesPageSubtitle").trim();

  if (!user) return null;

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: "light", label: t("themeLight") },
    { value: "dark", label: t("themeDark") },
    { value: "system", label: t("themeSystem") },
  ];

  const localeOptions: { value: LocalePreference; label: string }[] = APP_LOCALES.map((value) => ({
    value,
    label: languageOptionLabel(tLang(value), value),
  }));

  return (
    <div className="mx-auto flex w-full max-w-full min-w-0 animate-fade-slide flex-col gap-6 pb-8 md:gap-8">
      <header>
        <h1 className={cn(pageTitleClass, "text-zinc-900 dark:text-zinc-50")}>{t("preferencesPageTitle")}</h1>
        {preferencesPageSubtitle ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{preferencesPageSubtitle}</p>
        ) : null}
      </header>

      <section className="surface-card p-4 sm:p-6 md:p-8">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <PrefRow
            title={t("themeTitle")}
            description={t("themePreferenceDesc")}
            control={
              <PrefSelect
                id="pref-theme"
                aria-label={t("themeTitle")}
                value={theme}
                onChange={(v) => {
                  if (v === "light" || v === "dark" || v === "system") setThemePref(v);
                }}
                options={themeOptions}
              />
            }
          />
          <PrefRow
            title={t("languageTitle")}
            description={t("languageIntro")}
            control={
              <PrefSelect
                id="pref-locale"
                aria-label={t("languageTitle")}
                value={localePref}
                onChange={(v) => {
                  if (isAppLocale(v)) {
                    setLocalePref(v);
                    void updateProfile(user.id, { preferredLanguage: v });
                  }
                }}
                options={localeOptions}
              />
            }
          />
        </ul>
      </section>
    </div>
  );
}
