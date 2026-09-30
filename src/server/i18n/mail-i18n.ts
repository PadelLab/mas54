import "server-only";
import i18next, { type TFunction } from "i18next";

import { APP_LOCALES, APP_LOCALE_INTL, isAppLocale, type AppLocale } from "@/lib/app-locale";

import ca from "./locales/ca.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import sv from "./locales/sv.json";
import tr from "./locales/tr.json";
import zh from "./locales/zh.json";

export type MailLocale = AppLocale;

const mailI18n = i18next.createInstance();

if (!mailI18n.isInitialized) {
  void mailI18n.init({
    lng: "es",
    fallbackLng: "es",
    supportedLngs: [...APP_LOCALES],
    ns: ["mail"],
    defaultNS: "mail",
    resources: {
      en: { mail: en },
      es: { mail: es },
      pt: { mail: pt },
      fr: { mail: fr },
      it: { mail: it },
      de: { mail: de },
      ru: { mail: ru },
      nl: { mail: nl },
      pl: { mail: pl },
      zh: { mail: zh },
      ja: { mail: ja },
      ko: { mail: ko },
      ca: { mail: ca },
      sv: { mail: sv },
      tr: { mail: tr },
    },
    interpolation: { escapeValue: false },
  });
}

export function resolveMailLocale(value: string | null | undefined): MailLocale {
  const v = value?.trim().toLowerCase() ?? "";
  const base = v.split("-")[0] ?? v;
  if (isAppLocale(base)) return base;
  return "es";
}

export function mailT(locale: string | null | undefined): TFunction {
  return mailI18n.getFixedT(resolveMailLocale(locale), "mail");
}

export function mailHtmlLang(locale: string | null | undefined): MailLocale {
  return resolveMailLocale(locale);
}

export function mailIntlLocale(locale: string | null | undefined): string {
  return APP_LOCALE_INTL[resolveMailLocale(locale)];
}
