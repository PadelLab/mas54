"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { CalendarSubscribeOnEntry } from "@/components/student/calendar-subscribe-on-entry";
import { HomeClubEventRow, homeEventVenue } from "@/components/home-club-event-row";
import { EVENT_TYPE_I18N_KEY, isClubEventClosed, sortEventsByDateTimeDesc } from "@/lib/events-shared";
import { appLocaleToIntlLocale, formatHm24 } from "@/lib/schedule-date";
import { cn, formatDate, pageTitleClass } from "@/lib/utils";
import { MetricStatCard } from "@/components/metric-stat-card";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import { useMemo } from "react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

const AVATAR_TONES = [
  "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
];

function avatarTone(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[n]!;
}

export default function CoachDashboardPage() {
  const t = useTranslations("CoachDashboard");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const { user, lessons, events, users } = useAuth();
  const tClub = useTranslations("ClubEvents");

  const mine = useMemo(() => (user ? lessons.filter((l) => l.coachId === user.id) : []), [lessons, user]);
  const pending = useMemo(() => mine.filter((l) => l.status === "pending"), [mine]);
  const scheduled = useMemo(() => mine.filter((l) => l.status === "confirmed"), [mine]);
  const availableEvents = useMemo(
    () => events.filter((e) => !isClubEventClosed(e)),
    [events],
  );
  const upcomingEvents = useMemo(
    () => sortEventsByDateTimeDesc(availableEvents).slice().reverse().slice(0, 3),
    [availableEvents],
  );

  if (!user) return null;

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="space-y-6">
      <CalendarSubscribeOnEntry />

      <div>
        <h1 className={cn(pageTitleClass, "text-zinc-900 dark:text-zinc-50")}>
          {t("hello", { name: firstName })}
        </h1>
        <p className="mt-1 text-[15px] text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricStatCard
          icon={<Clock className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#fff0e6] text-[#e85d04]"
          label={t("cardPending")}
          value={pending.length}
        />
        <MetricStatCard
          icon={<CalendarDays className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#e6f7ee] text-[#16a34a]"
          label={t("cardActiveClasses")}
          value={scheduled.length}
        />
        <MetricStatCard
          icon={<CalendarPlus className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#eee8fb] text-[#7c5cbf]"
          label={t("cardEvents")}
          value={availableEvents.length}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{t("pendingTitle")}</h2>
          <Link
            href="/coach/classes/status/pending"
            className="shrink-0 text-sm font-semibold text-accent hover:underline"
          >
            {t("seeAll")}
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-zinc-500 dark:text-zinc-400">{t("pendingEmpty")}</p>
        ) : (
          <ul>
            {pending.slice(0, 5).map((l) => {
              const st = users.find((u) => u.id === l.studentId);
              const name = st?.name ?? "—";
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-3 border-t border-zinc-100 px-5 py-3.5 dark:border-zinc-800"
                >
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      avatarTone(st?.id ?? l.id),
                    )}
                  >
                    {initials(name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDate(l.date, intlLocale)} • {formatHm24(l.time)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{t("upcomingEventsTitle")}</h2>
          <Link href="/coach/events/agenda" className="shrink-0 text-sm font-semibold text-accent hover:underline">
            {t("seeEvents")}
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-zinc-500 dark:text-zinc-400">{t("eventsEmptyHint")}</p>
        ) : (
          <ul>
            {upcomingEvents.map((ev) => (
              <HomeClubEventRow
                key={ev.id}
                event={ev}
                typeLabel={tClub(EVENT_TYPE_I18N_KEY[ev.type])}
                venue={homeEventVenue(ev)}
                intlLocale={intlLocale}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
