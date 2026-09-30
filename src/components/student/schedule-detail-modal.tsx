"use client";

import { LessonActivityLine } from "@/components/lesson-activity-line";
import { Button } from "@/components/ui/button";
import { CALENDAR_EVENT_LOCATION, buildLessonIcs, downloadLessonIcs } from "@/lib/lesson-calendar";
import { appLocaleToIntlLocale, formatDaySectionTitle, formatHm24 } from "@/lib/schedule-date";
import { EVENT_TYPE_I18N_KEY } from "@/lib/events-shared";
import type { Court, EventItem, Lesson, User } from "@/lib/types";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, Clock, Sparkles, Trophy, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

export type ScheduleDetailPayload =
  | { mode: "lesson"; lesson: Lesson; cardTitle: string }
  | { mode: "event"; event: EventItem }
  | null;


export function ScheduleDetailWhen({
  date,
  time,
  intlLocale,
}: {
  date: string;
  time: string;
  intlLocale: string;
}) {
  const dateLabel = formatDaySectionTitle(date, intlLocale);
  const timeLabel = formatHm24(time);
  if (!dateLabel && !timeLabel) return null;
  return (
    <div className="mt-1.5 space-y-0.5">
      {timeLabel ? (
        <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
          <span className="tabular-nums">{timeLabel}</span>
        </p>
      ) : null}
      {dateLabel ? (
        <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
          <span className="min-w-0">{dateLabel}</span>
        </p>
      ) : null}
    </div>
  );
}

function lessonStatusCopy(t: (key: string) => string, status: Lesson["status"]) {
  switch (status) {
    case "pending":
      return t("lessonStatus.pending");
    case "confirmed":
      return t("lessonStatus.confirmed");
    case "declined":
      return t("lessonStatus.declined");
    case "completed":
      return t("lessonStatus.completed");
    default:
      return status;
  }
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold normal-case tracking-normal text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div className="min-h-[1.25rem] text-sm font-medium text-zinc-900 dark:text-zinc-100">{children}</div>
    </div>
  );
}

export function EventDetailFields({ event }: { event: EventItem }) {
  const t = useTranslations("StudentSchedule");
  const tClub = useTranslations("ClubEvents");
  const venue = event.venue?.trim() ?? "";
  const address = event.address?.trim() ?? "";
  const description = event.description?.trim() ?? "";
  return (
    <div className="space-y-4">
      <DetailRow label={t("detail.eventType")}>{tClub(EVENT_TYPE_I18N_KEY[event.type])}</DetailRow>
      <DetailRow label={t("detail.eventVenue")}>{venue}</DetailRow>
      <DetailRow label={t("detail.address")}>{address}</DetailRow>
      <DetailRow label={t("detail.eventDescription")}>
        <span className="whitespace-pre-wrap font-normal leading-relaxed">{description}</span>
      </DetailRow>
    </div>
  );
}

export function ScheduleDetailModal({
  open,
  onOpenChange,
  payload,
  court: _court,
  coach,
  student,
  lessonDetailSubject = "coach",
  eventCreatedByDisplay: _eventCreatedByDisplay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: ScheduleDetailPayload;
  court: Court | undefined;
  coach: User | undefined;
  /** When the user is the lesson's coach, show the student instead of the coach. */
  student?: User | undefined;
  lessonDetailSubject?: "coach" | "student";
  /** Kept for compatibility in admin/coach views. */
  eventCreatedByDisplay?: string;
}) {
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const t = useTranslations("StudentSchedule");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || !payload || typeof document === "undefined") return null;

  const close = () => onOpenChange(false);
  const lessonPersonName =
    payload.mode === "lesson"
      ? (lessonDetailSubject === "student" ? student?.name?.trim() : coach?.name?.trim())
      : undefined;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={t("detail.closeOverlay")}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-detail-title"
        className="relative z-10 flex max-h-[min(90dvh,680px)] w-full max-w-xl flex-col rounded-t-2xl border border-zinc-200/90 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 sm:rounded-2xl sm:pb-0"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-700 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                payload.mode === "event"
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              }`}
            >
              {payload.mode === "event" ? (
                <Trophy className="h-5 w-5" aria-hidden />
              ) : (
                <Sparkles className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold normal-case tracking-normal text-zinc-400 dark:text-zinc-500">
                {payload.mode === "event" ? t("detail.kindEvent") : t("detail.kindLesson")}
              </p>
              <h2 id="schedule-detail-title" className="font-display text-lg font-bold leading-snug text-zinc-900 dark:text-zinc-50">
                {payload.mode === "event" ? payload.event.title : payload.cardTitle}
              </h2>
              <ScheduleDetailWhen
                date={payload.mode === "event" ? payload.event.date : payload.lesson.date}
                time={payload.mode === "event" ? payload.event.time : payload.lesson.time}
                intlLocale={intlLocale}
              />
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={close}
            aria-label={t("detail.closeOverlay")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-themed min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {payload.mode === "event" ? (
            <EventDetailFields event={payload.event} />
          ) : (
            <div className="space-y-4">
              <DetailRow label={t("detail.state")}>{lessonStatusCopy(t, payload.lesson.status)}</DetailRow>
              <DetailRow label={t("detail.focus")}>
                <LessonActivityLine lesson={payload.lesson} multiline />
              </DetailRow>
              <DetailRow label={lessonDetailSubject === "student" ? t("detail.student") : t("detail.coach")}>
                {lessonPersonName ?? ""}
              </DetailRow>
              {payload.lesson.notes?.trim() ? (
                <DetailRow label={t("detail.notes")}>{payload.lesson.notes.trim()}</DetailRow>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200/80 p-4 dark:border-zinc-700 sm:flex-row sm:items-center sm:px-6">
          {payload.mode === "lesson" && payload.lesson.status === "confirmed" ? (
            <Button
              type="button"
              className="h-11 w-full rounded-xl font-semibold sm:w-auto"
              onClick={() => {
                const ics = buildLessonIcs({
                  lessonId: payload.lesson.id,
                  date: payload.lesson.date,
                  time: payload.lesson.time,
                  title: payload.cardTitle,
                  description: coach?.name ? `${payload.cardTitle} · ${coach.name}` : payload.cardTitle,
                  location: CALENDAR_EVENT_LOCATION,
                });
                if (ics) downloadLessonIcs(ics, "+54-lesson.ics");
              }}
            >
              <Calendar className="h-4 w-4" />
              {t("detail.addToCalendar")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl sm:w-auto" onClick={close}>
            {t("detail.close")}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
