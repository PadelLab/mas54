"use client";

import {
  EMPTY_DATE_FILTER,
  isDateFilterActive,
  type ScheduleDateFilter,
} from "@/components/schedule/app-date-range-picker";
import { EmptyState } from "@/components/empty-state";
import { LIST_CONTROL_CLASS, ListSearchField, ListToolbar } from "@/components/list-search-field";
import { eventKindBadgeClass, eventOpenClosedBadgeClass, foldEventSearch } from "@/lib/events-shared";
import { canonicalDayKey, formatHm24 } from "@/lib/schedule-date";
import { cn } from "@/lib/utils";
import { Calendar, ChevronDown, ChevronRight, Clock, Filter } from "lucide-react";
import type { ReactNode } from "react";

export { EMPTY_DATE_FILTER, isDateFilterActive, type ScheduleDateFilter };

export function rowMatchesDateFilter(date: string, filter: ScheduleDateFilter) {
  if (!isDateFilterActive(filter)) return true;
  const day = canonicalDayKey(date);
  if (!day) return false;
  return day >= filter.from && day <= filter.to;
}

export function rowMatchesSearch(haystack: string, query: string) {
  const q = foldEventSearch(query);
  if (!q) return true;
  return foldEventSearch(haystack).includes(q);
}

export function foldCategoryName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function lessonCategoryBadgeClass(name: string) {
  const n = foldCategoryName(name);
  if (n.includes("ataque") || n.includes("attack")) {
    return "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-900/50";
  }
  return "bg-sky-50 text-sky-800 ring-1 ring-sky-100 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-800/60";
}

export function lessonKindBadgeClass() {
  return cn(
    "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100",
    "dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/50",
  );
}

export function lessonStatusBadgeLabel(t: (key: string) => string, status: string) {
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

type Chip<T extends string> = { id: T; label: string };

export function ScheduleFilterBar<T extends string>({
  chips,
  filter,
  onFilter,
  searchPlaceholder,
  onQueryChange,
}: {
  chips: Chip<T>[];
  filter: T;
  onFilter: (id: T) => void;
  searchPlaceholder: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <ListToolbar
      className="flex-row items-center gap-2"
      leading={
        <ListSearchField
          className="max-w-none min-w-0 flex-1 sm:max-w-lg"
          placeholder={searchPlaceholder}
          onQueryChange={onQueryChange}
        />
      }
      trailing={
        <div className="relative w-fit shrink-0">
          <select
            value={filter}
            onChange={(e) => onFilter(e.target.value as T)}
            className={cn(LIST_CONTROL_CLASS, "w-auto min-w-[7.5rem] appearance-none pl-8 pr-8")}
            aria-label={chips.map((c) => c.label).join(" / ")}
          >
            {chips.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute left-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-zinc-400">
            <Filter className="h-3.5 w-3.5" aria-hidden />
          </span>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" aria-hidden />
        </div>
      }
    />
  );
}

export function ScheduleEmpty({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return <EmptyState icon={Calendar} title={title} description={description} className={cn("py-20", className)} />;
}

export function ScheduleDaySection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 font-display text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200 sm:text-base">
        {heading}
      </h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

type TimelineKind = "lesson" | "event" | "agenda";

export function ScheduleTimelineCard({
  kind,
  title,
  subtitle,
  time,
  endTime,
  kindLabel,
  categoryLabel,
  statusLabel,
  closedLabel,
  onOpen,
}: {
  kind: TimelineKind;
  title: string;
  subtitle?: string | string[] | null;
  time: string;
  endTime?: string;
  kindLabel: string;
  categoryLabel?: string | null;
  statusLabel: string;
  closedLabel?: string | null;
  onOpen?: () => void;
}) {
  const isEvent = kind === "event";
  const clickable = Boolean(onOpen);
  const subtitleLines = Array.isArray(subtitle) ? subtitle : subtitle ? [subtitle] : [];
  const accentBar = isEvent ? "bg-orange-400" : "bg-emerald-400";
  const timeClass = isEvent
    ? "text-orange-500 dark:text-orange-300"
    : "text-emerald-500 dark:text-emerald-300";
  const cardClass = cn(
    "relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
    clickable &&
      "group cursor-pointer transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:shadow-black/30 dark:focus-visible:ring-emerald-400/40",
  );

  const body = (
    <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 py-3 pl-4 pr-3 sm:flex-nowrap sm:gap-4 sm:py-3.5 sm:pl-5 sm:pr-4">
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", accentBar)} aria-hidden />
      <div className="w-[4.75rem] shrink-0 sm:w-[5.25rem]">
        <div className="flex items-center gap-1">
          <Clock className={cn("h-3.5 w-3.5 shrink-0", timeClass)} aria-hidden />
          <span className={cn("text-sm font-semibold tabular-nums", timeClass)}>{formatHm24(time)}</span>
        </div>
        {endTime ? (
          <p className="pl-4.5 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{formatHm24(endTime)}</p>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <h3 className="truncate text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-base">
          {title}
        </h3>
        {subtitleLines.map((line, i) => (
          <p key={`${i}-${line}`} className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
            {line}
          </p>
        ))}
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto sm:flex-none sm:justify-end">
        <span className={isEvent ? eventKindBadgeClass() : lessonKindBadgeClass()}>{kindLabel}</span>
        {categoryLabel ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              lessonCategoryBadgeClass(categoryLabel),
            )}
          >
            {categoryLabel}
          </span>
        ) : null}
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {statusLabel}
        </span>
        {closedLabel ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              eventOpenClosedBadgeClass(true),
            )}
          >
            {closedLabel}
          </span>
        ) : null}
      </div>
      {clickable ? (
        <ChevronRight
          className="hidden h-5 w-5 shrink-0 text-zinc-300 transition group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400 sm:block"
          aria-hidden
        />
      ) : null}
    </div>
  );

  return (
    <li>
      {clickable ? (
        <button type="button" onClick={onOpen} className={cardClass}>
          {body}
        </button>
      ) : (
        <div className={cardClass}>{body}</div>
      )}
    </li>
  );
}
