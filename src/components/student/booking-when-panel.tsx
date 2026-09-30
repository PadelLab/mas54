"use client";

import {
  hmToMinutes,
  isCoachSlotAvailable,
  isTimeInsideWindow,
  LESSON_DURATION_MIN,
  minutesToHm,
  weekdayFromYmd,
} from "@/lib/coach-availability";
import {
  appLocaleToIntlLocale,
  formatHm12,
  formatHmRange12,
  parseScheduleDate,
} from "@/lib/schedule-date";
import type { CoachAgendaEntry, CoachBlockedDate, CoachWeeklyWindow, Lesson } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const STRIP_DAYS = 21;

function useVisibleDayCount() {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setCount(7);
      else if (w >= 640) setCount(4);
      else if (w >= 400) setCount(3);
      else setCount(2);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return count;
}

/** Possible lesson start times (1h) — no :15 / :30 / :45. */
const HOUR_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out;
})();

function addDaysYmd(ymd: string, days: number): string {
  const d = parseScheduleDate(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabelParts(ymd: string, intlLocale: string) {
  const d = parseScheduleDate(ymd);
  if (!d) return { weekdayShort: "", dayNum: "", monthShort: "" };
  const weekdayShort = d
    .toLocaleDateString(intlLocale, { weekday: "short" })
    .replace(/\.$/, "");
  return {
    weekdayShort: weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1),
    dayNum: String(d.getDate()),
    monthShort: d.toLocaleDateString(intlLocale, { month: "short" }),
  };
}

function windowsForDate(
  coachId: string,
  date: string,
  agenda: CoachAgendaEntry[],
  weekly: CoachWeeklyWindow[],
): { startTime: string; endTime: string }[] {
  const fromAgenda = agenda
    .filter((e) => e.coachId === coachId && e.kind !== "unavailable" && e.date === date)
    .map((e) => ({ startTime: e.startTime, endTime: e.endTime }));
  if (fromAgenda.length > 0) return fromAgenda;
  const weekday = weekdayFromYmd(date);
  return weekly
    .filter((w) => w.coachId === coachId && w.weekday === weekday)
    .map((w) => ({ startTime: w.startTime, endTime: w.endTime }));
}

function spanRange(windows: { startTime: string; endTime: string }[]) {
  if (windows.length === 0) return null;
  let start = windows[0]!.startTime;
  let end = windows[0]!.endTime;
  for (const w of windows) {
    if (w.startTime < start) start = w.startTime;
    if (w.endTime > end) end = w.endTime;
  }
  return { startTime: start, endTime: end };
}

export function BookingWhenPanel({
  coachId,
  coachName,
  date,
  time,
  today,
  agenda,
  weekly,
  blockedDates,
  lessons,
  onSelectDate,
  onSelectTime,
}: {
  coachId: string;
  coachName?: string;
  date: string;
  time: string;
  today: string;
  agenda: CoachAgendaEntry[];
  weekly: CoachWeeklyWindow[];
  blockedDates: CoachBlockedDate[];
  lessons: Lesson[];
  onSelectDate: (ymd: string) => void;
  onSelectTime: (hm: string) => void;
}) {
  const t = useTranslations("StudentBooking");
  const locale = useLocale();
  const intl = appLocaleToIntlLocale(locale);
  const visibleDayCount = useVisibleDayCount();
  const [windowStart, setWindowStart] = useState(0);

  const stripDays = useMemo(() => {
    const days: {
      ymd: string;
      weekdayShort: string;
      dayNum: string;
      monthShort: string;
      available: boolean;
      rangeLabel: string | null;
    }[] = [];
    for (let i = 0; i < STRIP_DAYS; i++) {
      const ymd = addDaysYmd(today, i);
      const blocked = blockedDates.some((b) => b.coachId === coachId && b.date === ymd);
      const windows = blocked ? [] : windowsForDate(coachId, ymd, agenda, weekly);
      const freeSlots = blocked
        ? []
        : HOUR_TIMES.filter(
            (slot) =>
              isCoachSlotAvailable({
                coachId,
                date: ymd,
                time: slot,
                weekly,
                agenda,
                blockedDates,
                lessons,
              }).ok,
          );
      const span = spanRange(windows);
      const available = freeSlots.length > 0;
      const parts = dayLabelParts(ymd, intl);
      days.push({
        ymd,
        ...parts,
        available,
        rangeLabel: available && span ? formatHmRange12(span.startTime, span.endTime) : null,
      });
    }
    return days;
  }, [today, coachId, agenda, weekly, blockedDates, lessons, intl]);

  const maxWindowStart = Math.max(0, stripDays.length - visibleDayCount);

  useEffect(() => {
    if (!date) return;
    const idx = stripDays.findIndex((d) => d.ymd === date);
    if (idx < 0) return;
    setWindowStart((start) => {
      if (idx < start) return idx;
      if (idx >= start + visibleDayCount) {
        return Math.min(idx - visibleDayCount + 1, Math.max(0, stripDays.length - visibleDayCount));
      }
      return start;
    });
  }, [date, stripDays, visibleDayCount]);

  useEffect(() => {
    setWindowStart((start) => Math.min(start, maxWindowStart));
  }, [maxWindowStart]);

  const visibleDays = stripDays.slice(windowStart, windowStart + visibleDayCount);
  const canPrev = windowStart > 0;
  const canNext = windowStart < maxWindowStart;

  const dayBlocked = Boolean(date) && blockedDates.some((b) => b.coachId === coachId && b.date === date);

  const dayWindows = useMemo(() => {
    if (!date || dayBlocked) return [] as { startTime: string; endTime: string }[];
    return windowsForDate(coachId, date, agenda, weekly);
  }, [coachId, date, dayBlocked, agenda, weekly]);

  const daySpan = useMemo(() => spanRange(dayWindows), [dayWindows]);

  /** All slots in the published window; `available: false` = gray (booking or coach block). */
  const daySlots = useMemo(() => {
    if (!date || dayBlocked || dayWindows.length === 0) {
      return [] as { time: string; available: boolean }[];
    }
    return HOUR_TIMES.filter((slot) =>
      dayWindows.some((w) => isTimeInsideWindow(slot, w.startTime, w.endTime)),
    ).map((slot) => ({
      time: slot,
      available: isCoachSlotAvailable({
        coachId,
        date,
        time: slot,
        weekly,
        agenda,
        blockedDates,
        lessons,
      }).ok,
    }));
  }, [date, dayBlocked, dayWindows, coachId, weekly, agenda, blockedDates, lessons]);

  const hasBookableSlot = daySlots.some((s) => s.available);

  const fullDateTitle = useMemo(() => {
    if (!date) return "";
    const d = parseScheduleDate(date);
    if (!d) return date;
    return d.toLocaleDateString(intl, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [date, intl]);

  const endHm = useMemo(() => {
    if (!time) return "";
    const start = hmToMinutes(time);
    if (start < 0) return "";
    return minutesToHm(start + LESSON_DURATION_MIN);
  }, [time]);

  const navBtnClass = (enabled: boolean) =>
    cn(
      "flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl border transition-colors",
      enabled
        ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
        : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-600",
    );

  return (
    <div className="animate-fade-slide space-y-7">
      <div className="min-w-0 space-y-1.5">
        {coachName ? (
          <p className="inline-flex items-center gap-1.5 text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
            <User className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            {t("coachLine", { name: coachName })}
          </p>
        ) : null}
        <p className="text-[15px] leading-snug text-zinc-500 dark:text-zinc-400">{t("step4Intro")}</p>
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            {t("agendaDaysTitle")}
          </p>
          <div className="flex items-center gap-3 text-[12px] text-zinc-500 dark:text-zinc-400 sm:text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t("agendaAvailable")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              {t("agendaBooked")}
            </span>
          </div>
        </div>

        <div className="flex items-stretch gap-1.5 sm:gap-2.5">
          <button
            type="button"
            aria-label={t("prevDays")}
            disabled={!canPrev}
            onClick={() => setWindowStart((s) => Math.max(0, s - 1))}
            className={navBtnClass(canPrev)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            className="grid min-w-0 flex-1 gap-2"
            style={{ gridTemplateColumns: `repeat(${visibleDayCount}, minmax(0, 1fr))` }}
          >
            {visibleDays.map((day) => {
              const selected = date === day.ymd;
              return (
                <button
                  key={day.ymd}
                  type="button"
                  onClick={() => onSelectDate(day.ymd)}
                  className={cn(
                    "flex min-h-[6.5rem] min-w-0 flex-col rounded-xl border px-2 py-2 text-left transition duration-200 sm:min-h-[7.25rem] sm:px-2.5 sm:py-2.5",
                    selected
                      ? "border-court bg-white shadow-sm dark:border-emerald-500 dark:bg-zinc-900"
                      : "border-zinc-200/90 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wide",
                      selected ? "text-court dark:text-emerald-300" : "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    {day.weekdayShort}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-display text-[1.5rem] font-bold tabular-nums leading-none tracking-tight sm:text-[1.75rem]",
                      selected ? "text-court dark:text-emerald-300" : "text-zinc-900 dark:text-zinc-50",
                    )}
                  >
                    {day.dayNum}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs capitalize",
                      selected ? "text-court/80 dark:text-emerald-300/80" : "text-zinc-500 dark:text-zinc-400",
                    )}
                  >
                    {day.monthShort}
                  </p>
                  <p
                    className={cn(
                      "mt-auto pt-2 inline-flex items-start gap-1.5 text-[10px] font-medium leading-snug",
                      day.available ? "text-emerald-700 dark:text-emerald-200" : "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        day.available ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600",
                      )}
                    />
                    <span className="min-w-0 break-words">
                      {day.available && day.rangeLabel ? day.rangeLabel : t("noAvailabilityShort")}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label={t("nextDays")}
            disabled={!canNext}
            onClick={() => setWindowStart((s) => Math.min(maxWindowStart, s + 1))}
            className={navBtnClass(canNext)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {date ? (
        dayBlocked || daySlots.length === 0 ? (
          <p
            className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900/50"
            role="status"
          >
            {dayBlocked ? t("dayBlockedHint") : t("noAvailableTimes")}
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3.5 border-b border-zinc-100 pb-5 dark:border-zinc-800">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-900/15">
                <CalendarDays className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <p className="text-[17px] font-semibold capitalize tracking-tight text-zinc-900 dark:text-zinc-50">
                  {fullDateTitle}
                </p>
                {daySpan ? (
                  <p className="mt-0.5 text-[14px] text-zinc-500 dark:text-zinc-400">
                    {t("availableWindowFromTo", {
                      start: formatHm12(daySpan.startTime),
                      end: formatHm12(daySpan.endTime),
                    })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                {t("availableTimesTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => {
                  const selected = time === slot.time;
                  const disabled = !slot.available;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectTime(slot.time)}
                      aria-pressed={selected}
                      title={disabled ? t("slotUnavailable") : undefined}
                      className={cn(
                        "inline-flex h-10 min-w-[5.75rem] items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold tabular-nums transition-colors",
                        disabled &&
                          "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500",
                        !disabled &&
                          selected &&
                          "border-court bg-court text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600 dark:text-white",
                        !disabled &&
                          !selected &&
                          "border-court/35 bg-white text-court hover:bg-court/[0.05] dark:border-emerald-700/50 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30",
                      )}
                    >
                      {formatHm12(slot.time)}
                      <span
                        className={cn(
                          "h-4 w-4 items-center justify-center rounded-full bg-white/20",
                          selected && !disabled ? "inline-flex" : "hidden",
                        )}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    </button>
                  );
                })}
              </div>
              {!hasBookableSlot ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
                  {t("noAvailableTimes")}
                </p>
              ) : null}
            </div>

            {time && endHm && daySlots.some((s) => s.time === time && s.available) ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/90 px-4 py-3 text-[14px] ring-1 ring-emerald-100 dark:bg-emerald-950/35 dark:ring-emerald-900/50">
                <Clock className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p className="text-zinc-800 dark:text-zinc-100">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {t("lessonDurationLabel", { minutes: LESSON_DURATION_MIN })}
                  </span>{" "}
                  {t("lessonEndsAt", { end: formatHm12(endHm) })}
                </p>
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
