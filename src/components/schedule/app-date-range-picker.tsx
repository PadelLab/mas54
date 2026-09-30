"use client";

import { Calendar } from "@/components/ui/calendar";
import { CONTROL_FOCUS_CLASS, CONTROL_SURFACE } from "@/components/list-search-field";
import {
  formatDaySectionTitle,
  parseScheduleDate,
  toYmdLocal,
} from "@/lib/schedule-date";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

export type ScheduleDateFilter = {
  from: string;
  to: string;
};

export const EMPTY_DATE_FILTER: ScheduleDateFilter = { from: "", to: "" };

export function isDateFilterActive(filter: ScheduleDateFilter) {
  return Boolean(filter.from && filter.to);
}

function dateFilterToRange(filter: ScheduleDateFilter): DateRange | undefined {
  if (!filter.from) return undefined;
  const from = parseScheduleDate(filter.from);
  const to = parseScheduleDate(filter.to || filter.from);
  if (!from) return undefined;
  return { from, to: to ?? from };
}

function rangeToFilter(range: DateRange | undefined): ScheduleDateFilter {
  if (!range?.from) return EMPTY_DATE_FILTER;
  const from = toYmdLocal(range.from);
  const to = range.to ? toYmdLocal(range.to) : from;
  return from <= to ? { from, to } : { from: to, to: from };
}

export function dateFilterButtonLabel(
  filter: ScheduleDateFilter,
  intlLocale: string,
  selectDate: string,
) {
  if (!isDateFilterActive(filter)) return selectDate;
  const start = formatDaySectionTitle(filter.from, intlLocale);
  const end = formatDaySectionTitle(filter.to, intlLocale);
  if (!start) return selectDate;
  if (filter.from === filter.to) return start;
  return `${start} – ${end}`;
}

function isSameLocalDay(a?: Date, b?: Date) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function useDateRangeFilterState(
  dateFilter: ScheduleDateFilter,
  onDateFilterChange: (next: ScheduleDateFilter) => void,
  active: boolean,
  onCompleteRange?: () => void,
) {
  const [pending, setPending] = useState<DateRange | undefined>(() => dateFilterToRange(dateFilter));
  const pendingRef = useRef(pending);
  const onDateFilterChangeRef = useRef(onDateFilterChange);
  const onCompleteRangeRef = useRef(onCompleteRange);
  pendingRef.current = pending;
  onDateFilterChangeRef.current = onDateFilterChange;
  onCompleteRangeRef.current = onCompleteRange;

  useEffect(() => {
    if (active) setPending(dateFilterToRange(dateFilter));
  }, [active, dateFilter]);

  const commitPending = useCallback(() => {
    const current = pendingRef.current;
    if (!current?.from) return;
    onDateFilterChangeRef.current(
      rangeToFilter({ from: current.from, to: current.to ?? current.from }),
    );
  }, []);

  const clearDates = useCallback(() => {
    setPending(undefined);
    pendingRef.current = undefined;
    onDateFilterChangeRef.current(EMPTY_DATE_FILTER);
  }, []);

  const onSelectRange = useCallback((range: DateRange | undefined, selectedDay: Date) => {
    const current = pendingRef.current;
    const hadCompleteRange = Boolean(
      current?.from && current?.to && !isSameLocalDay(current.from, current.to),
    );
    if (hadCompleteRange) {
      if (!selectedDay) return;
      const next = { from: selectedDay, to: undefined };
      pendingRef.current = next;
      setPending(next);
      return;
    }
    if (!range?.from) {
      pendingRef.current = undefined;
      setPending(undefined);
      return;
    }
    if (!range.to || isSameLocalDay(range.from, range.to)) {
      const next = { from: range.from, to: undefined };
      pendingRef.current = next;
      setPending(next);
      return;
    }
    pendingRef.current = range;
    setPending(range);
    onDateFilterChangeRef.current(rangeToFilter(range));
    onCompleteRangeRef.current?.();
  }, []);

  return { pending, onSelectRange, commitPending, clearDates };
}

export function DateRangeCalendarPanel({
  pending,
  dateFilter,
  onSelectRange,
  dateRangeHint,
  clearDateLabel,
  onClear,
}: {
  pending: DateRange | undefined;
  dateFilter: ScheduleDateFilter;
  onSelectRange: (range: DateRange | undefined, selectedDay: Date) => void;
  dateRangeHint: string;
  clearDateLabel?: string;
  onClear?: () => void;
}) {
  const showClear = Boolean(onClear && clearDateLabel && isDateFilterActive(dateFilter));
  return (
    <div>
      <Calendar
        mode="range"
        selected={pending}
        onSelect={onSelectRange}
        defaultMonth={pending?.from ?? parseScheduleDate(dateFilter.from) ?? undefined}
      />
      <p className="mt-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">{dateRangeHint}</p>
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {clearDateLabel}
        </button>
      ) : null}
    </div>
  );
}

export function AppDateRangePicker({
  dateFilter,
  onDateFilterChange,
  intlLocale,
  selectDateLabel,
  clearDateLabel,
  dateRangeHint,
  triggerClassName,
  showChevron = false,
}: {
  dateFilter: ScheduleDateFilter;
  onDateFilterChange: (next: ScheduleDateFilter) => void;
  intlLocale: string;
  selectDateLabel: string;
  clearDateLabel: string;
  dateRangeHint: string;
  triggerClassName?: string;
  showChevron?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { pending, onSelectRange, commitPending, clearDates } = useDateRangeFilterState(
    dateFilter,
    onDateFilterChange,
    open,
    () => setOpen(false),
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current?.contains(event.target as Node)) return;
      commitPending();
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, commitPending]);

  const active = isDateFilterActive(dateFilter);
  const dateButtonLabel = dateFilterButtonLabel(dateFilter, intlLocale, selectDateLabel);

  return (
    <div ref={wrapRef} className="relative flex h-10 min-h-10 w-full min-w-0 items-center gap-1.5 sm:w-auto">
      <button
        type="button"
        onClick={() => {
          if (open) {
            commitPending();
            setOpen(false);
            return;
          }
          setOpen(true);
        }}
        className={cn(
          CONTROL_SURFACE,
          CONTROL_FOCUS_CLASS,
          "inline-flex h-10 min-h-10 w-full min-w-0 max-w-full items-center gap-2 rounded-lg border-0 px-3 py-0 text-sm font-medium leading-none text-zinc-600 outline-0 transition-all focus:bg-white dark:text-zinc-300 dark:focus:bg-zinc-800 sm:w-auto sm:max-w-[22rem]",
          triggerClassName,
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={selectDateLabel}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
        <span className="truncate">{dateButtonLabel}</span>
        {showChevron ? <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden /> : null}
      </button>
      {active ? (
        <button
          type="button"
          onClick={() => {
            clearDates();
            setOpen(false);
          }}
          className={cn(
            CONTROL_SURFACE,
            "inline-flex h-10 w-10 items-center justify-center rounded-lg border-0 text-zinc-400 transition-all hover:text-zinc-700 dark:hover:text-zinc-200",
          )}
          aria-label={clearDateLabel}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {open ? (
        <div className="absolute left-0 right-0 top-12 z-30 w-full max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md border border-zinc-200 bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950 sm:left-auto sm:right-0 sm:w-auto sm:min-w-[18.75rem]">
          <DateRangeCalendarPanel
            pending={pending}
            dateFilter={dateFilter}
            onSelectRange={onSelectRange}
            dateRangeHint={dateRangeHint}
          />
        </div>
      ) : null}
    </div>
  );
}
