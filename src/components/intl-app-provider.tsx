"use client";

import { useLayoutEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";

import { usePreferences } from "@/contexts/preferences-context";
import type { AppLocale } from "@/lib/app-locale";
import { APP_SCHEDULE_TIMEZONE } from "@/lib/app-schedule-timezone";
import { isPublicAuthPath, PUBLIC_AUTH_LOCALE } from "@/lib/public-auth-locale";

export type MessagesByLocale = Record<AppLocale, AbstractIntlMessages>;

export function IntlAppProvider({
  children,
  messagesByLocale,
}: {
  children: React.ReactNode;
  messagesByLocale: MessagesByLocale;
}) {
  const pathname = usePathname();
  const { effectiveLocale } = usePreferences();
  const locale = isPublicAuthPath(pathname) ? PUBLIC_AUTH_LOCALE : effectiveLocale;
  const messages = useMemo(() => messagesByLocale[locale], [locale, messagesByLocale]);

  const now = useMemo(() => new Date(), []);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider
      key={locale}
      locale={locale}
      messages={messages}
      timeZone={APP_SCHEDULE_TIMEZONE}
      now={now}
    >
      {children}
    </NextIntlClientProvider>
  );
}
