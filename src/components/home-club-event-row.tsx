"use client";

import { formatHm24 } from "@/lib/schedule-date";
import type { EventItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, MapPin, Trophy } from "lucide-react";
import { CLUB_VENUE_LABEL } from "@/lib/club-venue";

export function homeEventVenue(_event: EventItem): string {
  return CLUB_VENUE_LABEL;
}

export function HomeClubEventRow({
  event,
  typeLabel,
  venue,
  intlLocale,
}: {
  event: EventItem;
  typeLabel: string;
  venue: string;
  intlLocale: string;
}) {
  const Icon = event.type === "tournament" ? Trophy : CalendarDays;
  return (
    <li className="flex items-start gap-3 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {typeLabel}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{event.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {formatDate(event.date, intlLocale)} - {formatHm24(event.time)}
        </p>
        {venue ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="truncate">{venue}</span>
          </p>
        ) : null}
      </div>
    </li>
  );
}
