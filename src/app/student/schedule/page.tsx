"use client";

import {
  ScheduleDetailModal,
  type ScheduleDetailPayload,
} from "@/components/student/schedule-detail-modal";
import { StudentScreenShell } from "@/components/student/student-screen-shell";
import {
  lessonStatusBadgeLabel,
  ScheduleDaySection,
  ScheduleEmpty,
  ScheduleFilterBar,
  ScheduleTimelineCard,
  rowMatchesSearch,
} from "@/components/schedule/schedule-timeline";
import { useAuth } from "@/contexts/auth-context";
import { lessonActivityCategoryAndFocusLine } from "@/lib/lesson-activity-display";
import {
  appLocaleToIntlLocale,
  canonicalDayKey,
  formatDaySectionTitle,
  parseScheduleDate,
} from "@/lib/schedule-date";
import type { EventItem } from "@/lib/types";
import { CLUB_VENUE_LABEL } from "@/lib/club-venue";
import { EVENT_TYPE_I18N_KEY, isClubEventClosed } from "@/lib/events-shared";
import { tSafe } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";


type Row = {
  id: string;
  kind: "event" | "lesson";
  title: string;
  date: string;
  time: string;
  courtId: string;
  sub: string;
  lessonCategory?: string | null;
  coachName?: string;
  eventType?: EventItem["type"];
  address?: string;
  venue?: string;
  description?: string;
};

type Filter = "all" | "lessons" | "events";

export default function StudentSchedulePage() {
  const { user, events, eventSignups, lessons, courts, lessonActivityCatalog, users } = useAuth();
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const t = useTranslations("StudentSchedule");
  const tTypes = useTranslations("LessonTypes");
  const tAct = useTranslations("LessonActivityDisplay");
  const tClub = useTranslations("ClubEvents");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<ScheduleDetailPayload>(null);

  const rows = useMemo(() => {
    if (!user) return [];
    const joinedEventIds = new Set(
      eventSignups.filter((s) => s.userId === user.id).map((s) => s.eventId),
    );
    const myEvents = events.filter((e) => joinedEventIds.has(e.id));
    const myLessons = lessons.filter((l) => l.studentId === user.id);
    const list: Row[] = [
      ...myEvents.map((e) => ({
        id: e.id,
        kind: "event" as const,
        title: e.title,
        date: e.date,
        time: e.time,
        courtId: "",
        sub: "",
        eventType: e.type,
        address: e.address?.trim() || undefined,
        venue: CLUB_VENUE_LABEL,
        description: e.description?.replace(/\s+/g, " ").trim() || undefined,
      })),
      ...myLessons.map((l) => {
        const { category, focusLine } = lessonActivityCategoryAndFocusLine(
          l,
          lessonActivityCatalog,
          (k) => tTypes(k),
          tAct("drShort"),
        );
        return {
          id: l.id,
          kind: "lesson" as const,
          title: focusLine,
          date: l.date,
          time: l.time,
          courtId: l.courtId,
          sub: l.status,
          lessonCategory: category,
          coachName: users.find((u) => u.id === l.coachId)?.name,
        };
      }),
    ];
    return list.sort((a, b) => {
      const ta = parseScheduleDate(a.date)?.getTime() ?? 0;
      const tb = parseScheduleDate(b.date)?.getTime() ?? 0;
      if (ta !== tb) return tb - ta;
      return (b.time || "").localeCompare(a.time || "");
    });
  }, [user, events, eventSignups, lessons, lessonActivityCatalog, users, tTypes, tAct]);

  const filtered = useMemo(() => {
    let next = rows;
    if (filter === "lessons") next = next.filter((r) => r.kind === "lesson");
    if (filter === "events") next = next.filter((r) => r.kind === "event");
    next = next.filter((r) => {
      const courtName = CLUB_VENUE_LABEL;
      return rowMatchesSearch(
        [
          r.title,
          r.sub,
          r.address,
          r.venue,
          r.description,
          r.lessonCategory,
          r.coachName,
          r.time,
          r.eventType,
          courtName,
          r.kind === "event" ? t("kindEvent") : t("kindLesson"),
          r.eventType ? tClub(EVENT_TYPE_I18N_KEY[r.eventType]) : "",
          r.kind === "lesson" ? lessonStatusBadgeLabel(t, r.sub) : "",
          formatDaySectionTitle(r.date, intlLocale),
        ]
          .filter(Boolean)
          .join(" "),
        query,
      );
    });
    return next;
  }, [rows, filter, query, t, tClub, intlLocale]);

  const grouped = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of filtered) {
      const k = canonicalDayKey(r.date) ?? "__nodate__";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const openDetail = (row: Row) => {
    if (row.kind === "event") {
      const ev = events.find((e) => e.id === row.id);
      if (ev) setDetail({ mode: "event", event: ev });
      return;
    }
    const lesson = lessons.find((l) => l.id === row.id);
    if (lesson && user && lesson.studentId === user.id) {
      setDetail({ mode: "lesson", lesson, cardTitle: row.title });
    }
  };

  const detailCourt =
    detail?.mode === "lesson" ? courts.find((c) => c.id === detail.lesson.courtId) : undefined;

  const detailCoach =
    detail?.mode === "lesson" ? users.find((u) => u.id === detail.lesson.coachId) : undefined;

  if (!user) return null;

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: t("filterAll") },
    { id: "lessons", label: t("filterLessons") },
    { id: "events", label: t("filterEvents") },
  ];

  const dayHeading = (dayKey: string) =>
    dayKey === "__nodate__" ? t("groupNoDate") : formatDaySectionTitle(dayKey, intlLocale) || t("groupNoDate");

  return (
    <StudentScreenShell
      className="w-full"
      title={t("title")}
      description={t("description")}
    >
      <ScheduleDetailModal
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        payload={detail}
        court={detailCourt}
        coach={detailCoach}
      />

      <ScheduleFilterBar
        chips={chips}
        filter={filter}
        onFilter={setFilter}
        searchPlaceholder={t("searchPlaceholder")}
        onQueryChange={setQuery}
      />

      {filtered.length === 0 ? (
        <ScheduleEmpty title={tSafe(t, "emptyFilteredTitle", "emptyFiltered")} description={t("emptyFiltered")} />
      ) : (
        <div className="space-y-10">
          {grouped.map(([dayKey, items]) => (
            <ScheduleDaySection key={dayKey} heading={dayHeading(dayKey)}>
              {items.map((row) => {
                const isEvent = row.kind === "event";
                return (
                  <ScheduleTimelineCard
                    key={row.kind + row.id}
                    kind={row.kind}
                    title={row.title}
                    subtitle={
                      isEvent
                        ? [row.venue, row.description].filter((line): line is string => Boolean(line))
                        : row.coachName
                          ? t("coachPrefix", { name: row.coachName })
                          : null
                    }
                    time={row.time}
                    kindLabel={isEvent ? t("kindEvent") : t("kindLesson")}
                    categoryLabel={!isEvent ? row.lessonCategory : null}
                    statusLabel={
                      isEvent
                        ? row.eventType
                          ? tClub(EVENT_TYPE_I18N_KEY[row.eventType])
                          : t("kindEvent")
                        : lessonStatusBadgeLabel(t, row.sub)
                    }
                    closedLabel={
                      isEvent && isClubEventClosed({ date: row.date, time: row.time })
                        ? tClub("statusClosed")
                        : null
                    }
                    onOpen={() => openDetail(row)}
                  />
                );
              })}
            </ScheduleDaySection>
          ))}
        </div>
      )}
    </StudentScreenShell>
  );
}
