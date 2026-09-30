import type { Lesson, User } from "@/lib/types";
import { APP_LOCALE_INTL, isAppLocale } from "@/lib/app-locale";
import { hasAdminPrivileges } from "@/lib/role-utils";
import { formatDaySectionTitle } from "@/lib/schedule-date";

/** Regular coach: only their own lessons. Superadmin / coach-admin: all. */
export function lessonsVisibleOnClasses(lessons: Lesson[], user: Pick<User, "id" | "role"> | null) {
  if (!user) return [];
  if (hasAdminPrivileges(user.role)) return lessons;
  return lessons.filter((l) => l.coachId === user.id);
}

export const LESSON_STATUSES = ["pending", "confirmed", "declined", "completed"] as const;
export type LessonStatusFilter = (typeof LESSON_STATUSES)[number];

export const STATUS_META: Record<Lesson["status"], { bar: string; pill: string }> = {
  pending: {
    bar: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-1 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900/50",
  },
  confirmed: {
    bar: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/50",
  },
  declined: {
    bar: "bg-red-500",
    pill: "bg-red-50 text-red-800 ring-1 ring-red-100 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900/50",
  },
  completed: {
    bar: "bg-zinc-400",
    pill: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export function isLessonStatusFilter(s: string): s is LessonStatusFilter {
  return (LESSON_STATUSES as readonly string[]).includes(s);
}

const LESSON_STATUS_ALIASES: Record<string, LessonStatusFilter> = {
  pendente: "pending",
  confirmada: "confirmed",
  recusada: "declined",
  concluida: "completed",
};

/** Accepts English slugs and leftover Portuguese URLs. */
export function parseLessonStatusParam(s: string): LessonStatusFilter | null {
  if (isLessonStatusFilter(s)) return s;
  return LESSON_STATUS_ALIASES[s] ?? null;
}

export function localeTagForLessonDates(locale: string) {
  return isAppLocale(locale) ? APP_LOCALE_INTL[locale] : "en-US";
}

export function formatLessonDayHeading(iso: string, locale: string) {
  const tag = localeTagForLessonDates(locale);
  const str = formatDaySectionTitle(iso, tag);
  if (!str) return iso;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Newest first (day and time descending). */
export function sortLessonsByDateTime(lessons: Lesson[]) {
  return [...lessons].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return b.time.localeCompare(a.time);
  });
}

export function groupLessonsByDate(sortedLessons: Lesson[]) {
  const groups: { date: string; items: Lesson[] }[] = [];
  for (const l of sortedLessons) {
    const last = groups[groups.length - 1];
    if (last && last.date === l.date) last.items.push(l);
    else groups.push({ date: l.date, items: [l] });
  }
  return groups;
}
