"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { foldEventSearch } from "@/lib/events-shared";
import { cn } from "@/lib/utils";

/** Same highlight as schedule chips: solid white + zinc-300 ring on hover. */
export const CONTROL_SURFACE =
  "bg-white/80 ring-1 ring-zinc-200/80 hover:bg-white hover:ring-zinc-300 dark:bg-zinc-800/80 dark:ring-zinc-600 dark:hover:bg-zinc-800 dark:hover:ring-zinc-500";

/** Shared focus: only the border/ring color changes — no outline (native flashes black). */
export const CONTROL_FOCUS_CLASS = cn(
  "outline-none focus:outline-none",
  "focus:border-zinc-400 focus:ring-zinc-400",
  "dark:focus:border-zinc-500 dark:focus:ring-zinc-500",
);

/** Shared chrome: search, date picker, and form fields. */
export const LIST_CONTROL_CLASS = cn(
  CONTROL_SURFACE,
  "box-border h-10 min-h-10 w-full appearance-none rounded-lg border-0 py-0 px-3 text-sm font-medium leading-none text-zinc-800 shadow-none outline-none transition-colors placeholder:text-zinc-400 focus:bg-white dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-800",
  CONTROL_FOCUS_CLASS,
);

/**
 * Fields on a white card (login, signup, password).
 * Real border — the LIST_CONTROL ring vanishes on white and autofill covers the ring.
 */
export const AUTH_CONTROL_CLASS = cn(
  "box-border h-11 min-h-11 w-full appearance-none rounded-lg border border-zinc-300 bg-white py-0 px-3 text-sm font-medium leading-none text-zinc-800 shadow-none outline-none transition-colors",
  "placeholder:text-zinc-400 ring-0",
  "hover:border-zinc-300 hover:bg-white hover:ring-0",
  "focus:bg-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
  "dark:hover:border-zinc-500 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900",
  CONTROL_FOCUS_CLASS,
);

export const AUTH_FIELD_LABEL_CLASS =
  "mb-1.5 block text-sm font-semibold normal-case tracking-normal text-zinc-800 dark:text-zinc-200";

/** Default label for panel forms. */
export const FORM_FIELD_LABEL_CLASS =
  "mb-1.5 block text-xs font-semibold normal-case tracking-normal text-zinc-800 dark:text-zinc-300";

/** Textarea aligned with field chrome (e.g. category description). */
export const FORM_TEXTAREA_CLASS = cn(
  LIST_CONTROL_CLASS,
  "h-auto min-h-[120px] py-2.5 leading-normal font-normal",
);

/** Primary submit button on panel forms. */
export const FORM_SUBMIT_BUTTON_CLASS = "h-10 min-h-10 rounded-lg px-4 py-0";

export const LIST_SEARCH_INPUT_CLASS = `${LIST_CONTROL_CLASS} block pl-10 pr-3`;

export const LIST_SEARCH_LABEL_CLASS = "relative flex h-10 min-w-0 w-full max-w-lg items-center";

export function ListToolbar({
  leading,
  trailing,
  className,
}: {
  leading: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      {leading}
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 sm:ml-auto">{trailing}</div>
      ) : null}
    </div>
  );
}

export function applyEventListSearch(root: HTMLElement, query: string) {
  const q = foldEventSearch(query);
  let visible = 0;
  root.querySelectorAll<HTMLElement>("[data-event-row]").forEach((row) => {
    const show = !q || (row.dataset.eventHay ?? "").includes(q);
    row.hidden = !show;
    if (show) visible += 1;
  });
  root.querySelectorAll<HTMLElement>("[data-event-day]").forEach((day) => {
    day.hidden = !day.querySelector("[data-event-row]:not([hidden])");
  });
  const emptyEl = root.querySelector<HTMLElement>("[data-event-search-empty]");
  const listEl = root.querySelector<HTMLElement>("[data-event-search-list]");
  if (emptyEl) emptyEl.hidden = visible > 0;
  if (listEl) listEl.hidden = visible === 0;
}

export function ListSearchField({
  placeholder,
  onQueryChange,
  className,
}: {
  placeholder: string;
  onQueryChange: (query: string) => void;
  className?: string;
}) {
  const timerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <label className={cn(LIST_SEARCH_LABEL_CLASS, className)}>
      <span className="sr-only">{placeholder}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
      <input
        type="text"
        inputMode="search"
        defaultValue=""
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={LIST_SEARCH_INPUT_CLASS}
        onChange={(e) => {
          const next = e.target.value;
          if (timerRef.current != null) window.clearTimeout(timerRef.current);
          if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
          const run = () => {
            frameRef.current = window.requestAnimationFrame(() => {
              onQueryChangeRef.current(next);
            });
          };
          if (next.trim() === "") {
            run();
            return;
          }
          timerRef.current = window.setTimeout(run, 120);
        }}
      />
    </label>
  );
}
