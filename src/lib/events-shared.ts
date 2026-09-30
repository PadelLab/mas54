import { appLocaleToIntlLocale, eventScheduleStartUtcMs, formatDaySectionTitle } from "@/lib/schedule-date";
import { isAppLocale, APP_LOCALE_INTL } from "@/lib/app-locale";
import { EVENT_TYPES, type EventItem, type EventType } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEGACY_EVENT_TYPE: Record<string, EventType> = {
  torneio: "tournament",
  clinica: "clinic",
  aula_grupo: "group_lesson",
  outro: "other",
  tournament: "tournament",
  clinic: "clinic",
  social: "social",
  group_lesson: "group_lesson",
  other: "other",
};

export function parseEventType(raw: string | null | undefined): EventType {
  const v = String(raw ?? "").trim();
  if ((EVENT_TYPES as readonly string[]).includes(v)) return v as EventType;
  return LEGACY_EVENT_TYPE[v] ?? "other";
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  tournament: "Tournament",
  clinic: "Clinic",
  social: "Social",
  group_lesson: "Group lesson",
  other: "Other",
};

export const EVENT_SELECT_CLASS =
  "mt-1 w-full rounded-xl border border-court/15 bg-white px-4 py-3 text-sm text-court outline-none transition-colors focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500";

export const EVENT_SELECT_CLASS_COACH =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500";

/** Open until the event date/time; then closes automatically. */
export function isClubEventClosed(event: Pick<EventItem, "date" | "time">, nowMs = Date.now()) {
  const start = eventScheduleStartUtcMs(event.date, event.time || "00:00");
  if (start == null) return false;
  return start < nowMs;
}

export const EVENT_TYPE_I18N_KEY: Record<
  EventType,
  "eventTypeTournament" | "eventTypeClinic" | "eventTypeSocial" | "eventTypeGroupLesson" | "eventTypeOther"
> = {
  tournament: "eventTypeTournament",
  clinic: "eventTypeClinic",
  social: "eventTypeSocial",
  group_lesson: "eventTypeGroupLesson",
  other: "eventTypeOther",
};

export function eventTypeBadgeClass(type: EventType) {
  switch (type) {
    case "tournament":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-900/50";
    case "social":
      return "bg-violet-50 text-violet-800 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900/50";
    case "clinic":
      return "bg-sky-50 text-sky-800 ring-1 ring-sky-100 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-800/60";
    case "group_lesson":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/50";
    default:
      return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700";
  }
}

export function eventOpenClosedBadgeClass(closed: boolean) {
  return closed
    ? "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700"
    : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/50";
}

export function sortEventsByDateTimeDesc(events: EventItem[]) {
  return [...events].sort((a, b) => {
    const da = eventScheduleStartUtcMs(a.date, a.time || "00:00") ?? 0;
    const db = eventScheduleStartUtcMs(b.date, b.time || "00:00") ?? 0;
    return db - da;
  });
}

export function groupEventsByDate(sortedEvents: EventItem[]) {
  const groups: { date: string; items: EventItem[] }[] = [];
  for (const ev of sortedEvents) {
    const last = groups[groups.length - 1];
    if (last && last.date === ev.date) last.items.push(ev);
    else groups.push({ date: ev.date, items: [ev] });
  }
  return groups;
}

export function formatEventDayHeading(iso: string, locale: string) {
  const tag = isAppLocale(locale) ? APP_LOCALE_INTL[locale] : appLocaleToIntlLocale(locale);
  const str = formatDaySectionTitle(iso, tag);
  if (!str) return iso;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function foldEventSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Public URL segment for the event (not the internal id). */
export function slugifyEventTitle(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "event";
}

export function eventPublicKey(event: Pick<EventItem, "id" | "slug">): string {
  const slug = (event.slug ?? "").trim();
  return slug || event.id;
}

export function findEventByPublicKey(events: EventItem[], key: string): EventItem | undefined {
  const k = decodeURIComponent(key).trim();
  if (!k) return undefined;
  return events.find((e) => e.slug === k) ?? events.find((e) => e.id === k);
}

export function eventKindBadgeClass() {
  return cn(
    "inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 ring-1 ring-orange-100",
    "dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-900/50",
  );
}
