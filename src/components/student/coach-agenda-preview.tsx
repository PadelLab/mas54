"use client";

import { formatDaySectionTitle, formatHm12, formatHmRange12, parseScheduleDate } from "@/lib/schedule-date";
import type { CoachAgendaEntry } from "@/lib/types";
import { EmptyState, EMPTY_ICON } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export type CoachAgendaDayColumn = {
  date: string;
  weekdayShort: string;
  dayNum: string;
  monthShort: string;
  slots: {
    id: string;
    startTime: string;
    endTime: string;
    note?: string;
    /** `HH:MM` times already booked in this window. */
    bookedTimes: string[];
  }[];
};

function columnForDate(
  date: string,
  slots: CoachAgendaEntry[],
  intlLocale: string,
  bookedByDate: Map<string, string[]>,
): CoachAgendaDayColumn {
  const d = parseScheduleDate(date);
  const weekdayShort = d
    ? d.toLocaleDateString(intlLocale, { weekday: "short" }).replace(/\.$/, "")
    : "";
  const dayNum = d ? String(d.getDate()) : date.slice(8, 10);
  const monthShort = d ? d.toLocaleDateString(intlLocale, { month: "short" }) : "";
  const dayBooked = bookedByDate.get(date) ?? [];
  return {
    date,
    weekdayShort: weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1),
    dayNum,
    monthShort,
    slots: slots.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      note: s.note,
      bookedTimes: dayBooked.filter((t) => t >= s.startTime && t < s.endTime),
    })),
  };
}

function buildColumns(
  entries: CoachAgendaEntry[],
  coachId: string,
  intlLocale: string,
  today: string,
  bookedByDate: Map<string, string[]>,
  maxDays = 8,
  onlyDate?: string,
): CoachAgendaDayColumn[] {
  const mine = entries
    .filter((e) => e.coachId === coachId && e.kind !== "unavailable" && e.date >= today)
    .slice()
    .sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return a.startTime.localeCompare(b.startTime);
    });

  const byDate = new Map<string, typeof mine>();
  for (const e of mine) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  if (onlyDate) {
    return [columnForDate(onlyDate, byDate.get(onlyDate) ?? [], intlLocale, bookedByDate)];
  }

  return Array.from(byDate.entries())
    .slice(0, maxDays)
    .map(([date, slots]) => columnForDate(date, slots, intlLocale, bookedByDate));
}

export function CoachAgendaPreview({
  coachId,
  coachName,
  entries,
  intlLocale,
  today,
  selectedDate,
  onSelectDate,
  compact = false,
  /** If set, show only that day's card (no upcoming-days strip). */
  onlyDate,
  /** `HH:MM` already taken by pending/confirmed lessons, by date. */
  bookedTimesByDate,
}: {
  coachId: string;
  coachName?: string;
  entries: CoachAgendaEntry[];
  intlLocale: string;
  today: string;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  compact?: boolean;
  onlyDate?: string;
  bookedTimesByDate?: Map<string, string[]>;
}) {
  const t = useTranslations("StudentBooking");
  const columns = useMemo(
    () => buildColumns(entries, coachId, intlLocale, today, bookedTimesByDate ?? new Map(), 8, onlyDate),
    [entries, coachId, intlLocale, today, bookedTimesByDate, onlyDate],
  );

  const emptySingleDay = Boolean(onlyDate && columns[0] && columns[0].slots.length === 0);

  if (columns.length === 0 || emptySingleDay) {
    return (
      <EmptyState
        icon={CalendarClock}
        iconClass={EMPTY_ICON.green}
        title={t("agendaPreviewEmptyTitle")}
        description={t("agendaPreviewEmptyBody")}
        className={cn("animate-fade-slide px-5 py-8", compact && "py-6")}
      />
    );
  }

  return (
    <div className="animate-fade-slide space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
            {onlyDate ? t("agendaDayTitle") : t("agendaDaysTitle")}
          </p>
          <p className="mt-1 font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {coachName ? t("agendaPreviewTitleNamed", { name: coachName }) : t("agendaPreviewTitle")}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
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

      <div className={cn("-mx-1 px-1 pb-1", !onlyDate && "overflow-x-auto scrollbar-themed")}>
        <div className={cn("flex gap-3", onlyDate ? "justify-start" : "min-w-min")}>
          {columns.map((col, index) => {
            const active = selectedDate === col.date || Boolean(onlyDate);
            const interactive = Boolean(onSelectDate) && !onlyDate;
            return (
              <div
                key={col.date}
                className={cn(
                  "shrink-0 motion-safe:animate-fade-slide",
                  onlyDate ? "w-full max-w-sm" : "w-[10.75rem]",
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => onSelectDate?.(col.date)}
                  className={cn(
                    "flex w-full flex-col overflow-hidden rounded-3xl border text-left transition duration-200",
                    active
                      ? "border-court/40 bg-court text-white shadow-lg shadow-court/20 dark:border-emerald-400/40 dark:bg-emerald-600 dark:shadow-emerald-950/40"
                      : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600",
                    !interactive && "cursor-default hover:shadow-none",
                  )}
                >
                  <div
                    className={cn(
                      "border-b px-3.5 py-3",
                      active ? "border-white/15" : "border-zinc-100 dark:border-zinc-800",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-wider",
                        active ? "text-white/70" : "text-zinc-400 dark:text-zinc-500",
                      )}
                    >
                      {col.weekdayShort}
                    </p>
                    <p className="mt-0.5 font-display text-2xl font-bold tabular-nums leading-none tracking-tight">
                      {col.dayNum}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs capitalize",
                        active ? "text-white/65" : "text-zinc-500 dark:text-zinc-400",
                      )}
                    >
                      {col.monthShort}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2 px-2.5 py-3">
                    {col.slots.map((slot) => (
                      <li
                        key={slot.id}
                        title={
                          slot.note
                            ? `${formatHmRange12(slot.startTime, slot.endTime)} · ${slot.note}`
                            : formatHmRange12(slot.startTime, slot.endTime)
                        }
                        className={cn(
                          "rounded-2xl px-2.5 py-2",
                          active ? "bg-white/15" : "bg-emerald-50/90 dark:bg-emerald-950/40",
                        )}
                      >
                        <p
                          className={cn(
                            "text-[12px] font-semibold tabular-nums leading-tight tracking-tight",
                            active ? "text-white" : "text-emerald-900 dark:text-emerald-100",
                          )}
                        >
                          {formatHm12(slot.startTime)}
                          <span className="mx-1 opacity-50">–</span>
                          {formatHm12(slot.endTime)}
                        </p>
                        {slot.note ? (
                          <p
                            className={cn(
                              "mt-1 truncate text-[11px] leading-snug",
                              active ? "text-white/60" : "text-emerald-800/70 dark:text-emerald-200/70",
                            )}
                          >
                            {slot.note}
                          </p>
                        ) : null}
                        {slot.bookedTimes.length > 0 ? (
                          <p
                            className={cn(
                              "mt-1.5 text-[10px] font-medium leading-snug",
                              active ? "text-white/55" : "text-zinc-500 dark:text-zinc-400",
                            )}
                          >
                            {t("agendaBookedTimes", {
                              times: slot.bookedTimes.map(formatHm12).join(", "),
                            })}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </button>
                {active && !compact ? (
                  <p className="mt-2 px-1 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatDaySectionTitle(col.date, intlLocale)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
