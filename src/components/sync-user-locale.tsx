"use client";

import { useEffect } from "react";

import { useAuth } from "@/contexts/auth-context";
import { usePreferences } from "@/contexts/preferences-context";
import { parseAccountLocale } from "@/lib/public-auth-locale";

/** Restores the account language on sign-in (outside public auth routes). */
export function SyncUserLocale() {
  const { user, hydrated } = useAuth();
  const { setLocalePref } = usePreferences();

  useEffect(() => {
    if (!hydrated || !user) return;
    const accountLocale = parseAccountLocale(user.preferredLanguage);
    if (accountLocale) setLocalePref(accountLocale);
  }, [hydrated, user, user?.id, user?.preferredLanguage, setLocalePref]);

  return null;
}
