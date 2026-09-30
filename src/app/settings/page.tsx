"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, ChevronRight, CircleUser, SlidersHorizontal } from "lucide-react";
import { cn, pageTitleClass } from "@/lib/utils";

const ITEMS = [
  {
    href: "/settings/account",
    labelKey: "navAccount" as const,
    descKey: "accountHubDesc" as const,
    Icon: CircleUser,
  },
  {
    href: "/settings/preferences",
    labelKey: "navPreferences" as const,
    descKey: "preferencesHubDesc" as const,
    Icon: SlidersHorizontal,
  },
  {
    href: "/settings/notifications",
    labelKey: "navNotifications" as const,
    descKey: "notificationsHubDesc" as const,
    Icon: Bell,
  },
];

export default function SettingsIndexPage() {
  const t = useTranslations("Settings");

  return (
    <div className="mx-auto flex w-full max-w-full min-w-0 animate-fade-slide flex-col gap-6 pb-8 md:gap-8">
      <header>
        <h1 className={cn(pageTitleClass, "text-zinc-900 dark:text-zinc-50")}>{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t("settingsHubSubtitle")}</p>
      </header>

      <section className="surface-card overflow-hidden">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {ITEMS.map(({ href, labelKey, descKey, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-white/5 sm:px-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-zinc-900 dark:text-zinc-100">{t(labelKey)}</span>
                  <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">{t(descKey)}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
