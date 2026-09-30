"use client";

import { cn } from "@/lib/utils";
import { formatHm24 } from "@/lib/schedule-date";
import {
  eventKindBadgeClass,
  eventOpenClosedBadgeClass,
  eventTypeBadgeClass,
} from "@/lib/events-shared";
import type { EventItem } from "@/lib/types";
import { Clock } from "lucide-react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

export function EventScheduleCard({
  event,
  typeLabel,
  kindLabel,
  statusLabel,
  statusClosed,
  extraBadge,
  lines,
  onOpen,
  actions,
  hideActionsOnMobile,
  searchHay,
}: {
  event: EventItem;
  typeLabel: string;
  kindLabel: string;
  statusLabel: string;
  statusClosed: boolean;
  extraBadge?: string | null;
  lines: string[];
  onOpen?: () => void;
  actions?: ReactNode;
  hideActionsOnMobile?: boolean;
  searchHay?: string;
}) {
  const openDetails = onOpen
    ? (e: MouseEvent | KeyboardEvent) => {
        const el = e.target instanceof Element ? e.target : null;
        if (el?.closest("a, button")) return;
        if ("key" in e && e.key !== "Enter" && e.key !== " ") return;
        if ("key" in e) e.preventDefault();
        onOpen();
      }
    : undefined;

  return (
    <li data-event-row="" data-event-hay={searchHay}>
      <div
        tabIndex={onOpen ? 0 : undefined}
        onClick={openDetails}
        onKeyDown={openDetails}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
          onOpen &&
            "cursor-pointer outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:hover:shadow-black/30 dark:focus-visible:ring-orange-400/40",
        )}
      >
        <div
          className={cn(
            "relative flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-5 sm:flex-nowrap sm:gap-4 sm:px-5 sm:py-6 sm:pr-5",
            hideActionsOnMobile ? "pr-4" : "pr-12",
          )}
        >
          <span className="absolute inset-y-0 left-0 w-[3px] bg-orange-400" aria-hidden />
          <div className="w-[4.75rem] shrink-0 sm:w-[5.25rem]">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0 text-orange-500 dark:text-orange-300" aria-hidden />
              <span className="text-sm font-semibold tabular-nums text-orange-500 dark:text-orange-300">
                {formatHm24(event.time)}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h3 className="truncate text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-base">
              {event.title}
            </h3>
            {lines.map((line) => (
              <p key={line} className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                {line}
              </p>
            ))}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto sm:flex-none sm:justify-end">
            <span className={eventKindBadgeClass()}>{kindLabel}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                eventTypeBadgeClass(event.type),
              )}
            >
              {typeLabel}
            </span>
            {extraBadge ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800 ring-1 ring-sky-100 dark:bg-sky-950/45 dark:text-sky-100 dark:ring-sky-800/60">
                {extraBadge}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                eventOpenClosedBadgeClass(statusClosed),
              )}
            >
              {statusLabel}
            </span>
          </div>
          {actions ? (
            <div
              className={cn(
                "absolute right-3 top-3.5 z-10 sm:static sm:right-auto sm:top-auto sm:ml-0",
                hideActionsOnMobile && "hidden sm:block",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
