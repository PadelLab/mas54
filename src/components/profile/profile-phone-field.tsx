"use client";

import { useMemo } from "react";
import PhoneInput, { getCountries, getCountryCallingCode } from "react-phone-number-input";
import type { Country, Labels } from "react-phone-number-input";
import caPhoneLocale from "react-phone-number-input/locale/ca.json";
import dePhoneLocale from "react-phone-number-input/locale/de.json";
import enPhoneLocale from "react-phone-number-input/locale/en.json";
import esPhoneLocale from "react-phone-number-input/locale/es.json";
import frPhoneLocale from "react-phone-number-input/locale/fr.json";
import itPhoneLocale from "react-phone-number-input/locale/it.json";
import jaPhoneLocale from "react-phone-number-input/locale/ja.json";
import koPhoneLocale from "react-phone-number-input/locale/ko.json";
import nlPhoneLocale from "react-phone-number-input/locale/nl.json";
import plPhoneLocale from "react-phone-number-input/locale/pl.json";
import ptPhoneLocale from "react-phone-number-input/locale/pt.json";
import ruPhoneLocale from "react-phone-number-input/locale/ru.json";
import svPhoneLocale from "react-phone-number-input/locale/sv.json";
import trPhoneLocale from "react-phone-number-input/locale/tr.json";
import zhPhoneLocale from "react-phone-number-input/locale/zh.json";
import "react-phone-number-input/style.css";

import { usePreferences } from "@/contexts/preferences-context";
import type { AppLocale } from "@/lib/app-locale";
import { cn } from "@/lib/utils";

const PHONE_LABELS: Record<AppLocale, Record<string, string>> = {
  en: enPhoneLocale as Record<string, string>,
  es: esPhoneLocale as Record<string, string>,
  pt: ptPhoneLocale as Record<string, string>,
  fr: frPhoneLocale as Record<string, string>,
  it: itPhoneLocale as Record<string, string>,
  de: dePhoneLocale as Record<string, string>,
  ru: ruPhoneLocale as Record<string, string>,
  nl: nlPhoneLocale as Record<string, string>,
  pl: plPhoneLocale as Record<string, string>,
  zh: zhPhoneLocale as Record<string, string>,
  ja: jaPhoneLocale as Record<string, string>,
  ko: koPhoneLocale as Record<string, string>,
  ca: caPhoneLocale as Record<string, string>,
  sv: svPhoneLocale as Record<string, string>,
  tr: trPhoneLocale as Record<string, string>,
};

const DEFAULT_PHONE_COUNTRY: Record<AppLocale, Country> = {
  en: "PT",
  es: "ES",
  pt: "PT",
  fr: "FR",
  it: "IT",
  de: "DE",
  ru: "RU",
  nl: "NL",
  pl: "PL",
  zh: "CN",
  ja: "JP",
  ko: "KR",
  ca: "ES",
  sv: "SE",
  tr: "TR",
};

function phoneLabelsWithCallingCodes(locale: AppLocale): Labels {
  const base = PHONE_LABELS[locale];
  const out: Record<string, string> = { ...base };
  for (const country of getCountries()) {
    const name = base[country];
    if (!name) continue;
    try {
      out[country] = `${name} (+${getCountryCallingCode(country)})`;
    } catch {
      out[country] = name;
    }
  }
  return out as Labels;
}

type ProfilePhoneFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function ProfilePhoneField({ id, value, onChange, disabled }: ProfilePhoneFieldProps) {
  const { effectiveLocale } = usePreferences();
  const defaultCountry = useMemo(() => DEFAULT_PHONE_COUNTRY[effectiveLocale], [effectiveLocale]);
  const labels = useMemo(() => phoneLabelsWithCallingCodes(effectiveLocale), [effectiveLocale]);

  return (
    <PhoneInput
      id={id}
      international
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry}
      labels={labels}
      limitMaxLength
      value={value.trim() ? value : undefined}
      onChange={(v) => onChange(v ?? "")}
      disabled={disabled}
      className={cn(
        "PhoneInput mt-0 box-border flex h-12 min-h-12 max-h-12 w-full items-center overflow-hidden rounded-xl border border-zinc-200 bg-white px-2 shadow-sm outline-none transition",
        "focus-within:border-zinc-400 focus-within:outline-none",
        "dark:border-zinc-600 dark:bg-zinc-900 dark:focus-within:border-zinc-500",
      )}
      numberInputProps={{
        className:
          "PhoneInputInput box-border h-12 min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0 pl-1 pr-3 text-sm leading-none text-ink outline-none ring-0 placeholder:text-court/40 focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500",
      }}
    />
  );
}
