"use client";

import { useAuth } from "@/contexts/auth-context";
import { StudentScreenShell } from "@/components/student/student-screen-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  hmToMinutes,
  isCoachAgendaUnavailable,
  isCoachLessonBusy,
  LESSON_DURATION_MIN,
  lessonStartsOverlap,
  minutesToHm,
} from "@/lib/coach-availability";
import {
  appLocaleToIntlLocale,
  formatDaySectionTitle,
  formatHm12,
  formatHmRange12,
  parseScheduleDate,
} from "@/lib/schedule-date";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  MoreHorizontal,
  Pencil,
  Sun,
  Sunrise,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

/** Selection grid every 30 min; each mark is a 1h lesson start. */
const GRID_MINUTES = 30;
const DAY_START_MIN = 6 * 60;
const DAY_END_MIN = 24 * 60;
const STRIP_DAYS = 21;

const DAY_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let m = DAY_START_MIN; m + LESSON_DURATION_MIN <= DAY_END_MIN; m += GRID_MINUTES) {
    out.push(minutesToHm(m));
  }
  return out;
})();

type PeriodId = "morning" | "afternoon" | "evening";
type ViewMode = "list" | "editor" | "preview";

const PERIODS: {
  id: PeriodId;
  from: number;
  to: number;
  icon: typeof Sun;
}[] = [
  { id: "morning", from: 6 * 60, to: 12 * 60, icon: Sunrise },
  { id: "afternoon", from: 12 * 60, to: 18 * 60, icon: Sun },
  { id: "evening", from: 18 * 60, to: 24 * 60, icon: Moon },
];

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const d = parseScheduleDate(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayParts(ymd: string, intlLocale: string) {
  const d = parseScheduleDate(ymd);
  if (!d) return { weekdayShort: "", dayNum: "", monthShort: "", weekdayLong: "" };
  const weekdayShort = d
    .toLocaleDateString(intlLocale, { weekday: "short" })
    .replace(/\.$/, "");
  const weekdayLong = d.toLocaleDateString(intlLocale, { weekday: "long" });
  return {
    weekdayShort: weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1),
    weekdayLong: weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1),
    dayNum: String(d.getDate()),
    monthShort: d.toLocaleDateString(intlLocale, { month: "short" }),
  };
}

/** Rebuilds marked starts (1h steps from the start of each window). */
function expandWindowsToSlots(windows: { startTime: string; endTime: string }[]): Set<string> {
  const out = new Set<string>();
  for (const w of windows) {
    let t = hmToMinutes(w.startTime);
    const end = hmToMinutes(w.endTime);
    if (t < 0 || end < 0) continue;
    while (t + LESSON_DURATION_MIN <= end) {
      out.add(minutesToHm(t));
      t += LESSON_DURATION_MIN;
    }
  }
  return out;
}

/** Each selected slot = 1h lesson start; contiguous windows are merged. */
function mergeSlotsToWindows(slots: string[]): { startTime: string; endTime: string }[] {
  const sorted = [...slots].sort((a, b) => a.localeCompare(b));
  if (sorted.length === 0) return [];
  const ranges: { startTime: string; endTime: string }[] = [];
  let start = sorted[0]!;
  let end = minutesToHm(hmToMinutes(start) + LESSON_DURATION_MIN);
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const curEnd = minutesToHm(hmToMinutes(cur) + LESSON_DURATION_MIN);
    if (cur === end || hmToMinutes(cur) < hmToMinutes(end)) {
      if (hmToMinutes(curEnd) > hmToMinutes(end)) end = curEnd;
      continue;
    }
    ranges.push({ startTime: start, endTime: end });
    start = cur;
    end = curEnd;
  }
  ranges.push({ startTime: start, endTime: end });
  return ranges;
}

function slotsInPeriod(id: PeriodId): string[] {
  const p = PERIODS.find((x) => x.id === id)!;
  return DAY_SLOTS.filter((s) => {
    const m = hmToMinutes(s);
    return m >= p.from && m < p.to;
  });
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

/** Selection: only the border darkens (same as booking). */
function dayCardClass(selected: boolean) {
  return cn(
    "flex min-h-[6.5rem] min-w-0 flex-col rounded-xl border bg-white px-2 py-2 text-left transition duration-200 sm:min-h-[7.25rem] sm:px-2.5 sm:py-2.5 dark:bg-zinc-900/80",
    selected
      ? "border-court dark:border-emerald-500"
      : "border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
  );
}

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

export default function CoachAvailabilityPage() {
  const {
    user,
    coachAgendaEntries,
    coachBlockedDates,
    lessons,
    addCoachAgendaEntry,
    removeCoachAgendaEntry,
  } = useAuth();
  const t = useTranslations("CoachAvailability");
  const tConfirm = useTranslations("ConfirmDialog");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const visibleDayCount = useVisibleDayCount();

  const [view, setView] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState(todayYmd);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() => new Set());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isNewDay, setIsNewDay] = useState(true);
  const [windowStart, setWindowStart] = useState(0);
  const [menuOpenYmd, setMenuOpenYmd] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<
    | { kind: "remove"; ymd: string }
    | { kind: "discard"; onConfirm: () => void }
    | null
  >(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const today = todayYmd();

  useEffect(() => {
    if (!menuOpenYmd) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenYmd(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenYmd(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenYmd]);

  const mine = useMemo(
    () =>
      coachAgendaEntries
        .filter((e) => e.coachId === user?.id && e.kind !== "unavailable")
        .slice()
        .sort((a, b) => {
          const dc = a.date.localeCompare(b.date);
          if (dc !== 0) return dc;
          return a.startTime.localeCompare(b.startTime);
        }),
    [coachAgendaEntries, user?.id],
  );

  const dayEntries = useMemo(
    () => mine.filter((e) => e.date === selectedDate),
    [mine, selectedDate],
  );

  const upcomingDays = useMemo(() => {
    const m = new Map<string, typeof mine>();
    for (const e of mine) {
      if (e.date < today) continue;
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [mine, today]);

  const historyDays = useMemo(() => {
    const m = new Map<string, typeof mine>();
    for (const e of mine) {
      if (e.date >= today) continue;
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [mine, today]);

  const programmedByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const [ymd, items] of upcomingDays) {
      m.set(ymd, expandWindowsToSlots(items).size);
    }
    return m;
  }, [upcomingDays]);

  const stripDays = useMemo(() => {
    const days: {
      ymd: string;
      weekdayShort: string;
      dayNum: string;
      monthShort: string;
      slotCount: number;
      rangeLabel: string | null;
    }[] = [];
    for (let i = 0; i < STRIP_DAYS; i++) {
      const ymd = addDaysYmd(today, i);
      const parts = dayParts(ymd, intlLocale);
      const items = mine.filter((e) => e.date === ymd);
      const span = spanRange(items);
      days.push({
        ymd,
        weekdayShort: parts.weekdayShort,
        dayNum: parts.dayNum,
        monthShort: parts.monthShort,
        slotCount: programmedByDate.get(ymd) ?? 0,
        rangeLabel: span ? formatHmRange12(span.startTime, span.endTime) : null,
      });
    }
    return days;
  }, [today, intlLocale, programmedByDate, mine]);

  const maxWindowStart = Math.max(0, stripDays.length - visibleDayCount);

  useEffect(() => {
    if (view !== "editor") return;
    const idx = stripDays.findIndex((d) => d.ymd === selectedDate);
    if (idx < 0) return;
    setWindowStart((start) => {
      if (idx < start) return idx;
      if (idx >= start + visibleDayCount) {
        return Math.min(idx - visibleDayCount + 1, maxWindowStart);
      }
      return start;
    });
  }, [view, selectedDate, stripDays, visibleDayCount, maxWindowStart]);

  useEffect(() => {
    setWindowStart((start) => Math.min(start, maxWindowStart));
  }, [maxWindowStart]);

  useEffect(() => {
    if ((view !== "editor" && view !== "preview") || saving) return;
    setSelectedSlots(expandWindowsToSlots(dayEntries));
    setNote(dayEntries.find((e) => e.note)?.note ?? "");
    setErr(null);
  }, [view, selectedDate, dayEntries, saving]);

  const fullDateTitle = useMemo(() => {
    const d = parseScheduleDate(selectedDate);
    if (!d) return selectedDate;
    return d.toLocaleDateString(intlLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, intlLocale]);

  const dayBlocked = useMemo(
    () =>
      Boolean(user?.id) &&
      coachBlockedDates.some((b) => b.coachId === user!.id && b.date === selectedDate),
    [coachBlockedDates, selectedDate, user],
  );

  const unavailableSlots = useMemo(() => {
    const out = new Set<string>();
    if (!user?.id) return out;
    for (const slot of DAY_SLOTS) {
      if (dayBlocked) {
        out.add(slot);
        continue;
      }
      if (isCoachAgendaUnavailable(coachAgendaEntries, user.id, selectedDate, slot)) {
        out.add(slot);
        continue;
      }
      if (isCoachLessonBusy(lessons, user.id, selectedDate, slot)) {
        out.add(slot);
      }
    }
    return out;
  }, [user?.id, dayBlocked, coachAgendaEntries, selectedDate, lessons]);

  const dirty = useMemo(() => {
    const saved = expandWindowsToSlots(dayEntries);
    if (saved.size !== selectedSlots.size) return true;
    for (const s of selectedSlots) if (!saved.has(s)) return true;
    const savedNote = dayEntries.find((e) => e.note)?.note ?? "";
    return (note.trim() || "") !== (savedNote || "");
  }, [dayEntries, selectedSlots, note]);

  const conflictSlots = useMemo(() => {
    const out = new Set<string>();
    for (const s of selectedSlots) {
      for (const other of DAY_SLOTS) {
        if (other === s) continue;
        if (lessonStartsOverlap(s, other)) out.add(other);
      }
    }
    return out;
  }, [selectedSlots]);

  const periodLabels: Record<PeriodId, string> = {
    morning: t("presetMorning"),
    afternoon: t("presetAfternoon"),
    evening: t("presetEvening"),
  };

  if (!user) return null;

  const openAdd = () => {
    setIsNewDay(true);
    setSelectedDate(today);
    setSelectedSlots(new Set());
    setNote("");
    setMsg(null);
    setErr(null);
    setWindowStart(0);
    setView("editor");
  };

  const openEdit = (ymd: string) => {
    if (ymd < today) return;
    setIsNewDay(false);
    setSelectedDate(ymd);
    setMsg(null);
    setErr(null);
    setView("editor");
  };

  const openPreview = (ymd: string) => {
    setIsNewDay(false);
    setSelectedDate(ymd);
    setMsg(null);
    setErr(null);
    setView("preview");
  };

  const backToList = () => {
    if (dirty) {
      setPendingConfirm({
        kind: "discard",
        onConfirm: () => {
          setView("list");
          setMsg(null);
          setErr(null);
        },
      });
      return;
    }
    setView("list");
    setMsg(null);
    setErr(null);
  };

  const selectDate = (ymd: string) => {
    if (ymd < today) return;
    if (view === "editor" && dirty && ymd !== selectedDate) {
      setPendingConfirm({
        kind: "discard",
        onConfirm: () => {
          setSelectedDate(ymd);
          setIsNewDay(!mine.some((x) => x.date === ymd));
          setMsg(null);
        },
      });
      return;
    }
    setSelectedDate(ymd);
    setIsNewDay(!mine.some((x) => x.date === ymd));
    setMsg(null);
  };

  const toggleSlot = (slot: string) => {
    if (unavailableSlots.has(slot) || conflictSlots.has(slot)) return;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
        return next;
      }
      for (const s of [...next]) {
        if (lessonStartsOverlap(slot, s)) next.delete(s);
      }
      next.add(slot);
      return next;
    });
    setMsg(null);
  };

  const togglePeriod = (id: PeriodId) => {
    const periodSlots = slotsInPeriod(id).filter((s) => !unavailableSlots.has(s));
    if (periodSlots.length === 0) return;
    setSelectedSlots((prev) => {
      const selectableNow = periodSlots.filter(
        (s) => ![...prev].some((p) => p !== s && lessonStartsOverlap(p, s)),
      );
      const allOn = selectableNow.length > 0 && selectableNow.every((s) => prev.has(s));
      const next = new Set(prev);
      if (allOn) {
        periodSlots.forEach((s) => next.delete(s));
        return next;
      }
      // Mark hourly starts within the period (avoids overlap like 18:00 + 18:30).
      const ordered = [...periodSlots].sort((a, b) => a.localeCompare(b));
      for (const s of ordered) {
        if (unavailableSlots.has(s)) continue;
        if ([...next].some((p) => lessonStartsOverlap(p, s))) continue;
        next.add(s);
      }
      return next;
    });
    setMsg(null);
  };

  const clearSlots = () => {
    setSelectedSlots(new Set());
    setMsg(null);
  };

  const saveDay = async () => {
    setErr(null);
    setMsg(null);
    if (!selectedDate) {
      setErr(t("errorBlockDate"));
      return;
    }
    if (selectedDate < today) {
      setErr(t("errorPastDay"));
      return;
    }
    const slotsSnapshot = [...selectedSlots].filter((s) => !unavailableSlots.has(s));
    if (slotsSnapshot.length === 0) {
      setErr(t("needsOneSlot"));
      return;
    }
    setSaving(true);
    const noteSnapshot = note.trim();
    const oldIds = dayEntries.map((entry) => entry.id);
    try {
      const windows = mergeSlotsToWindows(slotsSnapshot);
      for (const w of windows) {
        const startM = hmToMinutes(w.startTime);
        const endM = hmToMinutes(w.endTime);
        if (startM < 0 || endM < 0 || endM <= startM) {
          setErr(t("errorSave"));
          return;
        }
      }
      // Create the new windows first; only then remove the old ones (avoids data loss if add fails).
      for (const w of windows) {
        const res = await addCoachAgendaEntry({
          date: selectedDate,
          startTime: w.startTime,
          endTime: w.endTime,
          kind: "available",
          note: noteSnapshot,
        });
        if (!res.ok) {
          setErr(res.message ?? t("errorSave"));
          return;
        }
      }
      await Promise.all(oldIds.map((id) => removeCoachAgendaEntry(id)));
      setMsg(windows.length === 0 ? t("dayCleared") : t("daySaved"));
      setTimeout(() => {
        setMsg(null);
        setView("list");
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  const removeDay = (ymd: string) => {
    if (ymd < today) return;
    setPendingConfirm({ kind: "remove", ymd });
  };

  const runConfirmedRemove = async (ymd: string) => {
    const entries = mine.filter((e) => e.date === ymd);
    await Promise.all(entries.map((entry) => removeCoachAgendaEntry(entry.id)));
  };

  const renderDayCard = (ymd: string, items: typeof mine, readonly: boolean) => {
    const parts = dayParts(ymd, intlLocale);
    const isToday = ymd === today;
    const noteText = items.find((i) => i.note)?.note;
    const slotCount = expandWindowsToSlots(items).size;
    const span = spanRange(items);
    const rangesLabel = span ? formatHmRange12(span.startTime, span.endTime) : "";
    return (
      <section key={ymd}>
        <h2 className="mb-2.5 flex min-w-0 flex-wrap items-center gap-2 font-display text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200 sm:gap-2.5 sm:text-lg">
          <span className="min-w-0">{formatDaySectionTitle(ymd, intlLocale)}</span>
          {isToday ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              {t("todayBadge")}
            </span>
          ) : null}
        </h2>

        <article
          role="button"
          tabIndex={0}
          onClick={() => openPreview(ymd)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPreview(ymd);
            }
          }}
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-2xl border px-4 py-5 shadow-sm shadow-zinc-900/[0.03] transition hover:border-zinc-300 dark:hover:border-zinc-600 sm:gap-5 sm:px-5 sm:py-6",
            readonly
              ? "border-zinc-200/70 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40"
              : "border-zinc-200/80 bg-white/95 dark:border-zinc-700 dark:bg-zinc-900/70",
          )}
        >
          <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 sm:h-[4.75rem] sm:w-[4.75rem]">
            <span
              className={cn(
                "w-full py-0.5 text-center text-[10px] font-bold uppercase tracking-wide",
                readonly
                  ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  : "bg-red-600 text-white dark:bg-red-500",
              )}
            >
              {parts.weekdayShort}
            </span>
            <span className="mt-0.5 font-display text-xl font-bold tabular-nums leading-none text-zinc-900 dark:text-zinc-50 sm:mt-1 sm:text-2xl">
              {parts.dayNum}
            </span>
            <span className="mt-0.5 text-[10px] capitalize text-zinc-400 dark:text-zinc-500 sm:text-[11px]">
              {parts.monthShort}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg">
                  {parts.weekdayLong}
                </p>
                <div className="mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-hidden">
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      readonly
                        ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200",
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", readonly ? "bg-zinc-400" : "bg-emerald-500")}
                    />
                    {t("kindAvailable")}
                  </span>
                  <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {t("slotsCountShort", { count: slotCount })}
                  </span>
                </div>
                <p className="mt-2 inline-flex min-w-0 items-center gap-1.5 text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span className="min-w-0 truncate">{rangesLabel}</span>
                </p>
                {noteText ? (
                  <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">{noteText}</p>
                ) : null}
              </div>

              {readonly ? null : (
                <div
                  className="relative shrink-0"
                  ref={menuOpenYmd === ymd ? menuRef : undefined}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label={t("dayActions")}
                    aria-haspopup="menu"
                    aria-expanded={menuOpenYmd === ymd}
                    onClick={() => setMenuOpenYmd((cur) => (cur === ymd ? null : ymd))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpenYmd === ymd ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-900/10 dark:border-zinc-600 dark:bg-zinc-900"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => {
                          setMenuOpenYmd(null);
                          openEdit(ymd);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                        {t("editDay")}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        onClick={() => {
                          setMenuOpenYmd(null);
                          removeDay(ymd);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("removeDay")}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </article>
      </section>
    );
  };

  const visibleDays = stripDays.slice(windowStart, windowStart + visibleDayCount);
  const canPrev = windowStart > 0;
  const canNext = windowStart < maxWindowStart;

  const navBtnClass = (enabled: boolean) =>
    cn(
      "flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl border transition-colors",
      enabled
        ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
        : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-600",
    );

  const confirmDialog = (
    <ConfirmDialog
      open={pendingConfirm !== null}
      tone={pendingConfirm?.kind === "remove" ? "danger" : "default"}
      description={
        pendingConfirm?.kind === "remove" ? t("confirmRemoveDay") : t("confirmDiscard")
      }
      confirmLabel={pendingConfirm?.kind === "remove" ? tConfirm("remove") : tConfirm("confirm")}
      onCancel={() => setPendingConfirm(null)}
      onConfirm={() => {
        const next = pendingConfirm;
        setPendingConfirm(null);
        if (!next) return;
        if (next.kind === "remove") {
          void runConfirmedRemove(next.ymd);
          return;
        }
        next.onConfirm();
      }}
    />
  );

  /* ───────────── LIST (home screen — timeline pattern) ───────────── */
  if (view === "list") {
    return (
      <>
      <StudentScreenShell
        className="w-full"
        title={t("title")}
        description={t("subtitle")}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Button type="button" className="h-10 rounded-xl px-4 font-semibold" onClick={openAdd}>
              <CalendarPlus className="h-4 w-4" />
              {t("addToAgenda")}
            </Button>
          </div>

          {upcomingDays.length === 0 && historyDays.length === 0 ? (
            <EmptyState icon={Calendar} title={t("agendaEmptyTitle")} description={t("agendaEmpty")} className="py-20" />
          ) : (
            <div className="space-y-6">
              {upcomingDays.map(([ymd, items]) => renderDayCard(ymd, items, false))}
              {historyDays.map(([ymd, items]) => renderDayCard(ymd, items, true))}
            </div>
          )}
        </div>
      </StudentScreenShell>
      {confirmDialog}
      </>
    );
  }

  const isPreview = view === "preview";
  const isPastDay = selectedDate < today;

  /* ───────────── EDITOR / PREVIEW ───────────── */
  return (
    <>
    <StudentScreenShell
      className="w-full"
      title={isPreview ? t("previewTitle") : isNewDay ? t("addTitle") : t("editTitle")}
      description={isPreview ? (isPastDay ? t("previewPastHint") : t("previewHint")) : undefined}
    >
      <div className="animate-fade-slide space-y-5">
        {isPreview ? null : (
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
              const selected = selectedDate === day.ymd;
              const available = day.slotCount > 0;
              return (
                <button
                  key={day.ymd}
                  type="button"
                  onClick={() => selectDate(day.ymd)}
                  className={dayCardClass(selected)}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {day.weekdayShort}
                  </p>
                  <p className="mt-0.5 font-display text-[1.5rem] font-bold tabular-nums leading-none tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[1.75rem]">
                    {day.dayNum}
                  </p>
                  <p className="mt-1 text-xs capitalize text-zinc-500 dark:text-zinc-400">{day.monthShort}</p>
                  <p
                    className={cn(
                      "mt-auto inline-flex items-start gap-1.5 pt-2 text-[10px] font-medium leading-snug",
                      available ? "text-emerald-700 dark:text-emerald-200" : "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        available ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600",
                      )}
                    />
                    <span className="min-w-0 break-words">
                      {available && day.rangeLabel ? day.rangeLabel : t("noSlotsShort")}
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
        )}

        <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-900/80">
          <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CalendarDays className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <p className="text-base font-semibold capitalize tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
                {fullDateTitle}
              </p>
            </div>

            {isPreview ? null : (
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-zinc-500 dark:text-zinc-400 sm:gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-4 w-5 rounded border border-emerald-600/50 bg-white dark:border-emerald-500/60 dark:bg-zinc-900" />
                {t("legendAvailable")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-4 w-5 items-center justify-center rounded bg-court text-[9px] text-white dark:bg-emerald-600">
                  ✓
                </span>
                {t("legendSelected")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-4 w-5 rounded border border-zinc-200 dark:border-zinc-600"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(-45deg, #d4d4d8 0 2px, #f4f4f5 2px 5px)",
                  }}
                />
                {t("legendUnavailable")}
              </span>
            </div>
            )}
          </div>

          <div className="mt-5 space-y-6">
            {PERIODS.map((period) => {
              const slots = slotsInPeriod(period.id);
              const selectable = slots.filter(
                (s) => !unavailableSlots.has(s) && !conflictSlots.has(s),
              );
              const allOn = selectable.length > 0 && selectable.every((s) => selectedSlots.has(s));
              const Icon = period.icon;
              const rangeStart = slots[0];
              const rangeEnd = slots[slots.length - 1];
              return (
                <div key={period.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {periodLabels[period.id]}
                        </p>
                        {rangeStart && rangeEnd ? (
                          <p className="text-xs text-zinc-400">
                            {formatHm12(rangeStart)} – {formatHm12(rangeEnd)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {isPreview ? null : (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-court focus:ring-court dark:border-zinc-600"
                        checked={allOn}
                        disabled={slots.every((s) => unavailableSlots.has(s))}
                        onChange={() => togglePeriod(period.id)}
                      />
                      {t("selectPeriod")}
                    </label>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => {
                      const on = selectedSlots.has(slot);
                      const blocked = unavailableSlots.has(slot) || (!on && conflictSlots.has(slot));
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isPreview || blocked}
                          onClick={() => toggleSlot(slot)}
                          aria-pressed={on}
                          title={isPreview ? undefined : blocked ? t("legendUnavailable") : undefined}
                          className={cn(
                            "inline-flex h-10 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold tabular-nums transition-colors",
                            isPreview &&
                              on &&
                              "cursor-default border-court bg-court text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600",
                            isPreview &&
                              !on &&
                              "cursor-default border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-500",
                            !isPreview &&
                              blocked &&
                              "cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500",
                            !isPreview &&
                              !blocked &&
                              on &&
                              "border-court bg-court text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600",
                            !isPreview &&
                              !blocked &&
                              !on &&
                              "border-emerald-700/40 bg-white text-zinc-800 hover:bg-emerald-50/60 dark:border-emerald-700/50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-emerald-950/30",
                          )}
                          style={
                            !isPreview && blocked
                              ? {
                                  backgroundImage:
                                    "repeating-linear-gradient(-45deg, #e4e4e7 0 3px, #f4f4f5 3px 7px)",
                                }
                              : undefined
                          }
                        >
                          {formatHm12(slot)}
                          {on && (isPreview || !blocked) ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {err ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
          {msg ? <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{msg}</p> : null}

          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            {isPreview ? (
              <>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t("slotsCountShort", { count: selectedSlots.size })}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl font-medium sm:min-w-[7rem]"
                    onClick={() => {
                      setView("list");
                      setMsg(null);
                      setErr(null);
                    }}
                  >
                    {t("closePreview")}
                  </Button>
                  {isPastDay ? null : (
                    <Button
                      type="button"
                      className="h-11 rounded-xl px-5 font-semibold sm:min-w-[9rem]"
                      onClick={() => openEdit(selectedDate)}
                    >
                      <Pencil className="h-4 w-4" />
                      {t("editDay")}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl font-medium"
              onClick={clearSlots}
              disabled={selectedSlots.size === 0}
            >
              <Trash2 className="h-4 w-4" />
              {t("clearSelection")}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl font-medium sm:min-w-[7rem]"
                onClick={backToList}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl px-5 font-semibold sm:min-w-[11rem]"
                disabled={saving || selectedSlots.size === 0 || (!dirty && !isNewDay)}
                onClick={() => void saveDay()}
              >
                <Check className="h-4 w-4" />
                {saving ? t("saving") : t("saveAvailability")}
              </Button>
            </div>
              </>
            )}
          </div>
        </section>
      </div>
    </StudentScreenShell>
    {confirmDialog}
    </>
  );
}
