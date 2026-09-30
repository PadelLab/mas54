import type { CoachAgendaEntry, CoachBlockedDate, CoachWeeklyWindow, Lesson } from "@/lib/types";

/** Fixed duration of each lesson (minutes). */
export const LESSON_DURATION_MIN = 60;

/** `Date#getDay()`: 0 = Sunday … 6 = Saturday. */
export function weekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d).getDay();
}

export function hmToMinutes(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  // `24:00` = exclusive end of day (e.g. slot 23:30 → 24:00).
  if (h === 24 && min === 0) return 24 * 60;
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return -1;
  }
  return h * 60 + min;
}

export function minutesToHm(total: number): string {
  if (total === 24 * 60) return "24:00";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Interval [start, end) in minutes. */
export function isTimeInsideWindow(timeHm: string, startHm: string, endHm: string): boolean {
  const t = hmToMinutes(timeHm);
  const a = hmToMinutes(startHm);
  const b = hmToMinutes(endHm);
  if (t < 0 || a < 0 || b < 0 || b <= a) return false;
  return t >= a && t < b;
}

export type SlotUnavailableReason =
  | "blocked_day"
  | "outside_hours"
  | "busy_lesson"
  | "coach_unavailable";

/** Overlapping [start, end) intervals in minutes. */
export function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/** Two lesson starts (each lasting LESSON_DURATION_MIN) overlap. */
export function lessonStartsOverlap(startA: string, startB: string): boolean {
  const a0 = hmToMinutes(startA);
  const b0 = hmToMinutes(startB);
  if (a0 < 0 || b0 < 0) return false;
  return rangesOverlap(a0, a0 + LESSON_DURATION_MIN, b0, b0 + LESSON_DURATION_MIN);
}

/**
 * Publishable starts in a window: every LESSON_DURATION_MIN from the start,
 * as long as the full lesson fits (e.g. 18:00–20:00 → 18:00 and 19:00; not 18:30).
 */
export function isPublishedLessonStart(timeHm: string, startHm: string, endHm: string): boolean {
  const t = hmToMinutes(timeHm);
  const a = hmToMinutes(startHm);
  const b = hmToMinutes(endHm);
  if (t < 0 || a < 0 || b < 0 || b <= a) return false;
  if (t < a || t + LESSON_DURATION_MIN > b) return false;
  return (t - a) % LESSON_DURATION_MIN === 0;
}

/** Lessons that occupy the 1h slot starting at `time` (requested or confirmed). */
export function isCoachLessonBusy(
  lessons: Lesson[],
  coachId: string,
  date: string,
  time: string,
): boolean {
  const start = hmToMinutes(time);
  if (start < 0) return false;
  const end = start + LESSON_DURATION_MIN;
  return lessons.some((l) => {
    if (l.coachId !== coachId || l.date !== date) return false;
    if (l.status !== "pending" && l.status !== "confirmed") return false;
    const lessonStart = hmToMinutes(l.time);
    if (lessonStart < 0) return false;
    return rangesOverlap(start, end, lessonStart, lessonStart + LESSON_DURATION_MIN);
  });
}

/** Slot the coach marked unavailable (overlaps the 1h lesson). */
export function isCoachAgendaUnavailable(
  agenda: CoachAgendaEntry[],
  coachId: string,
  date: string,
  time: string,
): boolean {
  const start = hmToMinutes(time);
  if (start < 0) return false;
  const end = start + LESSON_DURATION_MIN;
  return agenda.some((a) => {
    if (a.coachId !== coachId || a.kind !== "unavailable" || a.date !== date) return false;
    const a0 = hmToMinutes(a.startTime);
    const a1 = hmToMinutes(a.endTime);
    if (a0 < 0 || a1 < 0 || a1 <= a0) return false;
    return rangesOverlap(start, end, a0, a1);
  });
}

export function isCoachSlotAvailable(input: {
  coachId: string;
  date: string;
  time: string;
  weekly: CoachWeeklyWindow[];
  agenda: CoachAgendaEntry[];
  blockedDates: CoachBlockedDate[];
  lessons: Lesson[];
}): { ok: true } | { ok: false; reason: SlotUnavailableReason } {
  const { coachId, date, time, weekly, agenda, blockedDates, lessons } = input;

  if (blockedDates.some((b) => b.coachId === coachId && b.date === date)) {
    return { ok: false, reason: "blocked_day" };
  }

  // A request/confirmed lesson already exists for this coach + day + time → unavailable to other students.
  if (isCoachLessonBusy(lessons, coachId, date, time)) {
    return { ok: false, reason: "busy_lesson" };
  }

  // Coach blocked this slot on the agenda.
  if (isCoachAgendaUnavailable(agenda, coachId, date, time)) {
    return { ok: false, reason: "coach_unavailable" };
  }

  const mineWeekly = weekly.filter((w) => w.coachId === coachId);
  const openAgenda = agenda.filter((a) => a.coachId === coachId && a.kind !== "unavailable");
  if (mineWeekly.length === 0 && openAgenda.length === 0) return { ok: true };

  const weekday = weekdayFromYmd(date);
  const weeklyOk = mineWeekly
    .filter((w) => w.weekday === weekday)
    .some((w) => isPublishedLessonStart(time, w.startTime, w.endTime));
  const agendaOk = openAgenda
    .filter((a) => a.date === date)
    .some((a) => isPublishedLessonStart(time, a.startTime, a.endTime));

  if (weeklyOk || agendaOk) return { ok: true };
  return { ok: false, reason: "outside_hours" };
}

/** Suggested / shortcut times the student cannot pick. */
export function unavailableSuggestedTimes(input: {
  coachId: string;
  date: string;
  times: readonly string[];
  weekly: CoachWeeklyWindow[];
  agenda: CoachAgendaEntry[];
  blockedDates: CoachBlockedDate[];
  lessons: Lesson[];
}): Set<string> {
  const out = new Set<string>();
  for (const time of input.times) {
    const r = isCoachSlotAvailable({ ...input, time });
    if (!r.ok) out.add(time);
  }
  return out;
}
