"use client";

import { MetricStatCard } from "@/components/metric-stat-card";
import { CalendarDays, ClipboardCheck, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPeriodSelect } from "@/components/chart-period-select";
import {
  activitySelectionCounts,
  categorySelectionCounts,
  filterLessonsByDateRange,
  parseYmdLocalDate,
} from "@/lib/admin-student-analytics";
import { type ChartPeriod, rangeForChartPeriod } from "@/lib/chart-period";
import { lessonCalendarTimes } from "@/lib/lesson-calendar";
import type { Lesson, LessonActivityCatalog } from "@/lib/types";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { cn, pageTitleClass } from "@/lib/utils";

const CARD =
  "min-w-0 rounded-[1.35rem] border border-zinc-100/80 bg-white p-4 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.18)] dark:border-zinc-800/90 dark:bg-zinc-900/85 dark:shadow-black/30 sm:p-5";

const CHART_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#06b6d4", "#f59e0b"];
const WEEKDAY_COLORS = ["#3b82f6", "#ef4444", "#f97316", "#22c55e", "#a855f7", "#eab308", "#06b6d4"];
const HOUR_STROKE = "#3b82f6";
const HOUR_LABELS = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"] as const;

function chartLessons(lessons: Lesson[], period: ChartPeriod): Lesson[] {
  let scoped = lessons;
  if (period !== "all") {
    const { from, to } = rangeForChartPeriod(period);
    scoped = filterLessonsByDateRange(lessons, from, to);
  }
  return scoped.filter((lesson) => Boolean(lesson.coachId) && lesson.status !== "declined");
}

function isPastConfirmedLesson(lesson: Lesson): boolean {
  if (lesson.status !== "confirmed") return false;
  const times = lessonCalendarTimes(lesson.date, lesson.time);
  if (times) return times.endMs < Date.now();
  const parsed = parseYmdLocalDate(lesson.date);
  if (!parsed) return false;
  parsed.setHours(23, 59, 59, 999);
  return parsed.getTime() < Date.now();
}

function hourBucketLabel(hour: number): (typeof HOUR_LABELS)[number] {
  if (hour <= 6) return "06:00";
  if (hour >= 22) return "22:00";
  const even = hour % 2 === 0 ? hour : hour - 1;
  return `${String(even).padStart(2, "0")}:00` as (typeof HOUR_LABELS)[number];
}

function TooltipCard({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
      {label ? <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">{label}</p> : null}
      {payload.map((entry, idx) => (
        <p key={`${String(entry.dataKey)}-${idx}`} className="text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500 dark:text-zinc-400">{entry.name}</span>:{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  period,
  onPeriodChange,
  periodLabels,
  children,
}: {
  title: string;
  subtitle: string;
  period: ChartPeriod;
  onPeriodChange: (next: ChartPeriod) => void;
  periodLabels: { aria: string; all: string; week: string; month: string; quarter: string; year: string };
  children: ReactNode;
}) {
  return (
    <article className={CARD}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{subtitle}</p>
        </div>
        <ChartPeriodSelect
          value={period}
          onChange={onPeriodChange}
          ariaLabel={periodLabels.aria}
          allLabel={periodLabels.all}
          weekLabel={periodLabels.week}
          monthLabel={periodLabels.month}
          quarterLabel={periodLabels.quarter}
          yearLabel={periodLabels.year}
        />
      </div>
      <div className="mt-4 min-h-[280px]">{children}</div>
    </article>
  );
}

export function AdminClassOverview({
  lessons,
  lessonActivityCatalog,
}: {
  lessons: Lesson[];
  lessonActivityCatalog: LessonActivityCatalog;
}) {
  const t = useTranslations("AdminHome.students");
  const locale = useLocale();
  const intlLocale = appLocaleToIntlLocale(locale);
  const uid = useId().replace(/:/g, "");

  const [categoryPeriod, setCategoryPeriod] = useState<ChartPeriod>("all");
  const [activityPeriod, setActivityPeriod] = useState<ChartPeriod>("all");
  const [weekdayPeriod, setWeekdayPeriod] = useState<ChartPeriod>("all");
  const [hourPeriod, setHourPeriod] = useState<ChartPeriod>("all");

  const periodLabels = {
    aria: t("chartPeriodAria"),
    all: t("periodAll"),
    week: t("periodWeek"),
    month: t("periodMonth"),
    quarter: t("periodQuarter"),
    year: t("periodYear"),
  };

  const pendingAccept = useMemo(() => lessons.filter((l) => l.status === "pending").length, [lessons]);
  const totalClasses = useMemo(() => lessons.filter((l) => l.status !== "declined").length, [lessons]);
  const pendingEvaluations = useMemo(() => lessons.filter(isPastConfirmedLesson).length, [lessons]);

  const categoryLessons = useMemo(() => chartLessons(lessons, categoryPeriod), [lessons, categoryPeriod]);
  const activityLessons = useMemo(() => chartLessons(lessons, activityPeriod), [lessons, activityPeriod]);
  const weekdayLessons = useMemo(() => chartLessons(lessons, weekdayPeriod), [lessons, weekdayPeriod]);
  const hourLessons = useMemo(() => chartLessons(lessons, hourPeriod), [lessons, hourPeriod]);

  const categoryData = useMemo(
    () => categorySelectionCounts(categoryLessons, lessonActivityCatalog).map((x) => ({ name: x.name, count: x.count })),
    [categoryLessons, lessonActivityCatalog],
  );
  const categoryTotal = useMemo(() => categoryData.reduce((sum, x) => sum + x.count, 0), [categoryData]);

  const activityData = useMemo(
    () =>
      activitySelectionCounts(activityLessons, lessonActivityCatalog)
        .slice(0, 5)
        .map((x) => ({ name: x.name, count: x.count })),
    [activityLessons, lessonActivityCatalog],
  );

  const weekdayData = useMemo(() => {
    const counts = new Map<number, number>();
    for (const lesson of weekdayLessons) {
      const parsed = parseYmdLocalDate(lesson.date);
      const d = parsed ?? new Date(lesson.date);
      if (Number.isNaN(d.getTime())) continue;
      counts.set(d.getDay(), (counts.get(d.getDay()) ?? 0) + 1);
    }
    return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
      name: new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(new Date(2026, 0, 4 + weekday)),
      count: counts.get(weekday) ?? 0,
    }));
  }, [weekdayLessons, intlLocale]);

  const hourData = useMemo(() => {
    const counts = Object.fromEntries(HOUR_LABELS.map((label) => [label, 0])) as Record<(typeof HOUR_LABELS)[number], number>;
    for (const lesson of hourLessons) {
      const m = /^(\d{1,2}):(\d{2})/.exec((lesson.time ?? "").trim());
      if (!m) continue;
      const hour = Number(m[1]);
      if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
      counts[hourBucketLabel(hour)] += 1;
    }
    return HOUR_LABELS.map((label) => ({ label, count: counts[label] }));
  }, [hourLessons]);

  return (
    <div className="w-full space-y-8">
      <section>
        <h2 className={cn(pageTitleClass, "text-court dark:text-zinc-100")}>
          {t("categoriesTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{t("categoriesOverviewSubtitle")}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricStatCard
          href="/admin/classes/status/pending"
          icon={<FileText className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#e8f3fb] text-[#2b9adf]"
          label={t("statClassesToAccept")}
          value={pendingAccept}
        />
        <MetricStatCard
          href="/admin/classes"
          icon={<CalendarDays className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#e6f7ee] text-[#16a34a]"
          label={t("statTotalClasses")}
          value={totalClasses}
        />
        <MetricStatCard
          href="/admin/classes/status/confirmed"
          icon={<ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#eee8fb] text-[#7c5cbf]"
          label={t("statPendingEvaluations")}
          value={pendingEvaluations}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("categoryComparisonTitle")}
          subtitle={t("categoryComparisonSubtitle")}
          period={categoryPeriod}
          onPeriodChange={setCategoryPeriod}
          periodLabels={periodLabels}
        >
          {categoryData.length === 0 ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-zinc-500">{t("noCategorySelectionsInPeriod")}</p>
          ) : (
            <div className="flex h-full min-h-0 flex-col items-center gap-4 sm:flex-row">
              <div className="h-[220px] w-full max-w-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={`cat-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                          const cx = viewBox.cx ?? 0;
                          const cy = viewBox.cy ?? 0;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={cx} dy="-0.15em" className="fill-court text-[1.65rem] font-bold dark:fill-zinc-100">
                                {categoryTotal}
                              </tspan>
                              <tspan x={cx} dy="1.45em" className="fill-zinc-400 text-[11px] font-medium">
                                {t("genderDonutTotal")}
                              </tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                    <Tooltip content={TooltipCard} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex w-full min-w-0 flex-col gap-3">
                {categoryData.map((row, i) => {
                  const pct = categoryTotal > 0 ? Math.round((row.count / categoryTotal) * 1000) / 10 : 0;
                  const pctLabel = Number.isInteger(pct) ? `${pct}` : pct.toFixed(1);
                  return (
                    <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="truncate">{row.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                        {pctLabel}% ({row.count})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t("activityTopLabel")}
          subtitle={t("activityTopSubtitle")}
          period={activityPeriod}
          onPeriodChange={setActivityPeriod}
          periodLabels={periodLabels}
        >
          {activityData.length === 0 ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-zinc-500">{t("noSelectionsInPeriod")}</p>
          ) : (
            <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} layout="vertical" margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 8" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={128}
                  tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={TooltipCard} cursor={false} />
                <Bar dataKey="count" name={t("selectionsSuffix")} radius={[0, 8, 8, 0]} maxBarSize={22} activeBar={false}>
                  {activityData.map((_, i) => (
                    <Cell key={`act-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t("topWeekdayLabel")}
          subtitle={t("weekdayChartSubtitle")}
          period={weekdayPeriod}
          onPeriodChange={setWeekdayPeriod}
          periodLabels={periodLabels}
        >
          {weekdayData.every((x) => x.count === 0) ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-zinc-500">{t("noSelectionsInPeriod")}</p>
          ) : (
            <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 8" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-grid)" }}
                />
                <YAxis
                  tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={TooltipCard} cursor={false} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={44} name={t("selectionsSuffix")} activeBar={false}>
                  {weekdayData.map((_, i) => (
                    <Cell key={`wd-${i}`} fill={WEEKDAY_COLORS[i % WEEKDAY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title={t("peakHoursTitle")}
          subtitle={t("peakHoursSubtitle")}
          period={hourPeriod}
          onPeriodChange={setHourPeriod}
          periodLabels={periodLabels}
        >
          {hourData.every((x) => x.count === 0) ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-zinc-500">{t("noSelectionsInPeriod")}</p>
          ) : (
            <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourData} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id={`hours-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HOUR_STROKE} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={HOUR_STROKE} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-grid)" }}
                />
                <YAxis
                  tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={TooltipCard} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={HOUR_STROKE}
                  strokeWidth={2.5}
                  fill={`url(#hours-${uid})`}
                  name={t("selectionsSuffix")}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </section>
    </div>
  );
}
