"use client";

import { IntlAppProvider, type MessagesByLocale } from "@/components/intl-app-provider";
import { SyncUserLocale } from "@/components/sync-user-locale";
import { ThemeFavicon } from "@/components/theme-favicon";
import { AuthProvider } from "@/contexts/auth-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import { patchReactDomDevGuards } from "@/lib/patch-react-dom-dev";
import { useLayoutEffect } from "react";

export function Providers({
  children,
  messagesByLocale,
}: {
  children: React.ReactNode;
  messagesByLocale: MessagesByLocale;
}) {
  useLayoutEffect(() => {
    patchReactDomDevGuards();
  }, []);

  return (
    <AuthProvider>
      <PreferencesProvider>
        <SyncUserLocale />
        <ThemeFavicon />
        <IntlAppProvider messagesByLocale={messagesByLocale}>{children}</IntlAppProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}
