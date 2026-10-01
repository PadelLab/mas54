"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarSubscribeOnEntry } from "@/components/student/calendar-subscribe-on-entry";
import { OverallRing } from "@/components/overall-ring";
import { useAuth } from "@/contexts/auth-context";
import { HomeClubEventRow, homeEventVenue } from "@/components/home-club-event-row";
import {
  EVENT_TYPE_I18N_KEY,
  isClubEventClosed,
  sortEventsByDateTimeDesc,
} from "@/lib/events-shared";
import { lessonActivityCategoryAndFocusLine } from "@/lib/lesson-activity-display";
import { appLocaleToIntlLocale, eventScheduleStartUtcMs, formatHm24, todayYmdInAppTz } from "@/lib/schedule-date";
import { CLUB_VENUE_LABEL } from "@/lib/club-venue";
import { cn, formatDate, pageTitleClass } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, CalendarDays, MapPin, Trophy, type LucideIcon } from "lucide-react";
import { useMemo } from "react";

function HomeListCardHeader({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  subtitle: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", iconClass)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
      </div>
      <Link href={actionHref} className="shrink-0 pt-1 text-sm font-semibold text-accent hover:underline">
        {actionLabel}
      </Link>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { user, events, lessons, evaluations, lessonActivityCatalog } = useAuth();
  const t = useTranslations("StudentDashboard");
  const tOverall = useTranslations("StudentOverall");
  const tClub = useTranslations("ClubEvents");
  const tTypes = useTranslations("LessonTypes");
  const tDr = useTranslations("LessonActivityDisplay");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);

  const myEvals = useMemo(() => {
    if (!user) return [];
    return [...evaluations.filter((e) => e.studentId === user.id)].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [evaluations, user]);

  const lastEval = myEvals[0];
  const prevEval = myEvals[1];
  const trend =
    lastEval && prevEval ? Math.round(lastEval.score) - Math.round(prevEval.score) : null;

  const upcoming = useMemo(() => {
    if (!user) return [];
    const today = todayYmdInAppTz();
    const now = Date.now();
    return lessons
      .filter((l) => l.studentId === user.id && (l.status === "confirmed" || l.status === "pending"))
      .filter((l) => {
        // Open requests stay visible even after their date has passed.
        if (l.status === "pending") return true;
        const ymd = (l.date || "").slice(0, 10);
        if (ymd > today) return true;
        if (ymd < today) return false;
        const start = eventScheduleStartUtcMs(l.date, l.time || "00:00");
        return start == null || start >= now;
      })
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 4);
  }, [lessons, user]);

  const clubEvents = useMemo(
    () =>
      sortEventsByDateTimeDesc(events.filter((e) => !isClubEventClosed(e)))
        .slice()
        .reverse()
        .slice(0, 3),
    [events],
  );

  if (!user) return null;

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const overall = user.overall || 0;

  return (
    <div className="w-full animate-fade-slide space-y-6">
      <CalendarSubscribeOnEntry />

      <div>
        <h1 className={cn(pageTitleClass, "text-zinc-900 dark:text-zinc-50")}>
          {t("greeting", { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
      </div>

      <Link
        href="/student/overall"
        aria-label={t("performanceTitle")}
        className="flex flex-col gap-5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition hover:border-emerald-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:gap-8 sm:p-6"
      >
        <OverallRing
          value={overall}
          size={148}
          label={tOverall("ringLabel")}
          className="mx-auto w-full max-w-[148px] shrink-0 sm:mx-0"
        />
        <div className="min-w-0 flex-1">
          {trend != null ? (
            <p
              className={cn(
                "flex items-center gap-1.5 text-sm font-semibold",
                trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
              )}
            >
              {trend >= 0 ? (
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              ) : (
                <ArrowDownRight className="h-4 w-4" aria-hidden />
              )}
              <span>
                {trend > 0 ? "+" : ""}
                {trend}
              </span>
              <span className="font-medium text-zinc-500 dark:text-zinc-400">{t("trendSinceLast")}</span>
            </p>
          ) : null}
          <div className="mt-4 flex items-start gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("lastEvaluation")}</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {lastEval ? formatDate(lastEval.createdAt.slice(0, 10), intlLocale) : t("noEvaluations")}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
        <HomeListCardHeader
          icon={CalendarDays}
          iconClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          title={t("upcomingTitle")}
          subtitle={upcoming.length === 0 ? t("emptyLessons") : t("upcomingSubtitle")}
          actionHref="/student/schedule"
          actionLabel={t("seeAll")}
        />
        {upcoming.length === 0 ? null : (
            <ul>
              {upcoming.map((l) => {
                const { category, focusLine } = lessonActivityCategoryAndFocusLine(
                  l,
                  lessonActivityCatalog,
                  (key) => tTypes(key),
                  tDr("drShort"),
                );
                const title = focusLine && focusLine !== "—" ? focusLine : category || "—";
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-4 py-3.5 dark:border-zinc-800 sm:flex-nowrap sm:px-5"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <CalendarDays className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(l.date, intlLocale)} - {formatHm24(l.time)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        <span className="truncate">{CLUB_VENUE_LABEL}</span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        l.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                          : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
                      )}
                    >
                      {l.status === "confirmed" ? t("statusOk") : t("statusPending")}
                    </span>
                  </li>
                );
              })}
            </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
        <HomeListCardHeader
          icon={Trophy}
          iconClass="bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          title={t("eventsTitle")}
          subtitle={clubEvents.length === 0 ? t("emptyClubEvents") : t("eventsSubtitle")}
          actionHref="/student/events"
          actionLabel={t("seeEvents")}
        />
        {clubEvents.length === 0 ? null : (
          <ul>
            {clubEvents.map((ev) => (
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
