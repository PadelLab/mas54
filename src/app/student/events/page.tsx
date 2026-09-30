"use client";

import { StudentEventDetailModal } from "@/components/student/student-event-detail-modal";
import { EventScheduleCard } from "@/components/events/event-schedule-card";
import { ScheduleDaySection, ScheduleEmpty, rowMatchesDateFilter } from "@/components/schedule/schedule-timeline";
import { AppDateRangePicker, EMPTY_DATE_FILTER, type ScheduleDateFilter } from "@/components/schedule/app-date-range-picker";
import { useAuth } from "@/contexts/auth-context";
import {
  EVENT_TYPE_I18N_KEY,
  foldEventSearch,
  formatEventDayHeading,
  groupEventsByDate,
  isClubEventClosed,
  sortEventsByDateTimeDesc,
} from "@/lib/events-shared";
import type { EventItem } from "@/lib/types";
import { isSubstantialVenueText, pageTitleClass, tSafe } from "@/lib/utils";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { ListSearchField, ListToolbar, applyEventListSearch } from "@/components/list-search-field";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

export default function StudentEventsPage() {
  const { user, events, eventSignups, joinEvent, leaveEvent } = useAuth();
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const t = useTranslations("StudentEvents");
  const tClub = useTranslations("ClubEvents");
  const tProg = useTranslations("StudentSchedule");
  const listRootRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [dateFilter, setDateFilter] = useState<ScheduleDateFilter>(EMPTY_DATE_FILTER);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const sorted = useMemo(() => sortEventsByDateTimeDesc(events), [events]);
  const filtered = useMemo(
    () => sorted.filter((ev) => rowMatchesDateFilter(ev.date, dateFilter)),
    [sorted, dateFilter],
  );
  const byDate = useMemo(() => groupEventsByDate(filtered), [filtered]);

  const joined = (eventId: string) =>
    Boolean(user && eventSignups.some((s) => s.eventId === eventId && s.userId === user.id));

  const onJoin = async (eventId: string) => {
    setFeedback(null);
    setBusyId(eventId);
    const res = await joinEvent(eventId);
    setBusyId(null);
    if (!res.ok) setFeedback(res.message ?? "—");
  };

  const onLeave = async (eventId: string) => {
    setFeedback(null);
    setBusyId(eventId);
    const res = await leaveEvent(eventId);
    setBusyId(null);
    if (!res.ok) setFeedback(res.message ?? "—");
  };

  if (!user) return null;

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <StudentEventDetailModal
        open={detailEvent !== null}
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
      />

      <div className="min-w-0">
        <h1 className={`${pageTitleClass} text-zinc-900 dark:text-zinc-50`}>
          {tClub("agendaTitle")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{tClub("agendaSubtitleAdmin")}</p>
      </div>

      <ListToolbar
        leading={
          <ListSearchField
            placeholder={tClub("searchPlaceholder")}
            onQueryChange={(next) => {
              const root = listRootRef.current;
              if (root) applyEventListSearch(root, next);
            }}
          />
        }
        trailing={
          <AppDateRangePicker
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            intlLocale={intlLocale}
            selectDateLabel={tProg("selectDate")}
            clearDateLabel={tProg("clearDate")}
            dateRangeHint={tProg("dateRangeHint")}
          />
        }
      />

      {feedback ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {feedback}
        </p>
      ) : null}

      {sorted.length === 0 ? (
        <ScheduleEmpty title={tSafe(t, "emptyTitle", "title")} description={t("empty")} />
      ) : filtered.length === 0 ? (
        <ScheduleEmpty title={tSafe(tProg, "emptyFilteredTitle", "emptyFiltered")} description={tProg("emptyFiltered")} />
      ) : (
        <div ref={listRootRef}>
          <div data-event-search-empty="" hidden>
            <ScheduleEmpty title={tSafe(tClub, "emptySearchTitle", "emptySearch")} description={tClub("emptySearch")} />
          </div>
          <div data-event-search-list="" className="space-y-10">
            {byDate.map(({ date, items }) => (
              <div key={date} data-event-day="">
                <ScheduleDaySection heading={formatEventDayHeading(date, locale)}>
                  {items.map((ev) => {
                    const closed = isClubEventClosed(ev, nowMs);
                    const inList = joined(ev.id);
                    const venue = ev.venue?.trim()
                      ? ev.venue.trim()
                      : isSubstantialVenueText(ev.address)
                        ? ev.address.trim()
                        : "";
                    return (
                      <EventScheduleCard
                        key={ev.id}
                        event={ev}
                        searchHay={foldEventSearch(`${ev.title} ${ev.description} ${ev.venue} ${ev.address}`)}
                        kindLabel={tProg("kindEvent")}
                        typeLabel={tClub(EVENT_TYPE_I18N_KEY[ev.type])}
                        statusLabel={closed ? tClub("statusClosed") : tClub("statusOpen")}
                        statusClosed={closed}
                        extraBadge={inList ? t("joinedBadge") : null}
                        lines={venue ? [venue] : []}
                        onOpen={() => setDetailEvent(ev)}
                        actions={
                          closed ? null : inList ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 px-3.5 text-xs"
                              disabled={busyId === ev.id}
                              onClick={() => void onLeave(ev.id)}
                            >
                              {t("leave")}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              className="h-9 px-3.5 text-xs"
                              disabled={busyId === ev.id}
                              onClick={() => void onJoin(ev.id)}
                            >
                              {t("join")}
                            </Button>
                          )
                        }
                      />
                    );
                  })}
                </ScheduleDaySection>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
