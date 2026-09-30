"use client";

import { MetricStatCard } from "@/components/metric-stat-card";
import { ChevronDown, Globe2, GraduationCap, Timer, User as UserIcon, UserMinus, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import {
  activeStudents,
  averageAgeYears,
  ADMIN_NATIONALITY_OTHER_KEY,
  genderCounts,
  latestBucketGrowth,
  cumulativeSignupGrowth,
  nationalityDistribution,
  signupSeriesForGranularity,
  studentsOnly,
  type SignupGranularity,
} from "@/lib/admin-student-analytics";
import type { User } from "@/lib/types";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { cn, pageTitleClass } from "@/lib/utils";

const GENDER_SLICE_COLORS = ["#0f766e", "#c2410c", "#6d28d9", "#64748b"];
const NATIONALITY_SLICE_COLORS = ["#2563eb", "#db2777", "#0891b2", "#ca8a04", "#7c3aed", "#475569"];
const LINE_CURRENT = "#2563eb";
const LINE_PREVIOUS = "#d4d4d8";
const CARD =
  "min-w-0 rounded-[1.35rem] border border-zinc-100/80 bg-white p-4 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.18)] dark:border-zinc-800/90 dark:bg-zinc-900/85 dark:shadow-black/30 sm:p-5";

function intlLocaleTag(locale: string) {
  return appLocaleToIntlLocale(locale);
}

function TooltipCard({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
      {label ? <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">{label}</p> : null}
      {payload.map((entry, idx) => (
        <p key={`${String(entry.dataKey)}-${idx}`} className="text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500 dark:text-zinc-400">{entry.name}</span>: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function formatPct(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function GrowthCaption({
  change,
  locale,
  vsLabel,
}: {
  change: number | null | undefined;
  locale: string;
  vsLabel: string;
}) {
  if (change == null) return null;
  if (change === 0) {
    return (
      <p className="mt-1 text-xs font-medium text-zinc-400 dark:text-zinc-500">
        {formatPct(0, locale)}% {vsLabel}
      </p>
    );
  }
  const up = change > 0;
  return (
    <p className={cn("mt-1 text-xs font-medium", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
      {formatPct(Math.abs(change), locale)}% {up ? "↑" : "↓"} {vsLabel}
    </p>
  );
}

export function AdminStudentInsights({
  users,
}: {
  users: User[];
}) {
  const t = useTranslations("AdminHome.students");
  const tNav = useTranslations("Nav");
  const locale = useLocale();
  const intlLocale = intlLocaleTag(locale);
  const uid = useId().replace(/:/g, "");
  const gradCurrent = `g-current-${uid}`;

  const [signupGranularity, setSignupGranularity] = useState<SignupGranularity>("month");

  const students = useMemo(() => studentsOnly(users), [users]);
  const active = useMemo(() => activeStudents(students), [students]);
  const avgAge = useMemo(() => averageAgeYears(students), [students]);
  const deactivatedStudents = useMemo(() => students.filter((s) => s.status === "deactivated").length, [students]);
  const comparisonSeries = useMemo(
    () => signupSeriesForGranularity(students, signupGranularity, intlLocale),
    [students, signupGranularity, intlLocale],
  );
  const signupTotal = useMemo(() => comparisonSeries.reduce((sum, x) => sum + x.current, 0), [comparisonSeries]);
  const signupTotalGrowth = useMemo(
    () => cumulativeSignupGrowth(comparisonSeries, signupGranularity),
    [comparisonSeries, signupGranularity],
  );
  const signupGrowth = useMemo(
    () => latestBucketGrowth(comparisonSeries, signupGranularity),
    [comparisonSeries, signupGranularity],
  );
  const nationalitySlices = useMemo(() => {
    const slices = nationalityDistribution(students, intlLocale, 6);
    return slices.map((slice) => ({
      ...slice,
      label: slice.key === ADMIN_NATIONALITY_OTHER_KEY ? t("nationalityOther") : slice.label,
    }));
  }, [students, intlLocale, t]);
  const nationalityTotal = useMemo(
    () => nationalitySlices.reduce((sum, x) => sum + x.count, 0),
    [nationalitySlices],
  );
  const vsLastBucketLabel =
    signupGranularity === "week" ? t("vsLastWeek") : signupGranularity === "year" ? t("vsLastYear") : t("vsLastMonth");
  const signupsTitle =
    signupGranularity === "week"
      ? t("chartSignupsWeeklyTitle")
      : signupGranularity === "year"
        ? t("chartSignupsYearlyTitle")
        : t("chartSignupsTitle");
  const signupsSubtitle =
    signupGranularity === "week"
      ? t("chartSignupsWeeklyEvolution")
      : signupGranularity === "year"
        ? t("chartSignupsYearlyEvolution")
        : t("chartSignupsEvolution");
  const genders = useMemo(() => genderCounts(students), [students]);
  const genderData = useMemo(
    () => [
      { name: t("chartGenderMale"), count: genders.male },
      { name: t("chartGenderFemale"), count: genders.female },
      { name: t("chartGenderOther"), count: genders.other },
      { name: t("chartGenderUnspecified"), count: genders.unspecified },
    ],
    [genders, t],
  );
  const genderTotal = useMemo(() => genderData.reduce((sum, x) => sum + x.count, 0), [genderData]);

  return (
    <div className="w-full space-y-8">
      <section className="p-0">
        <h2 className={cn(pageTitleClass, "text-court dark:text-zinc-100")}>
          {tNav("analytics")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{t("studentsOverviewSubtitle")}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricStatCard
          icon={<GraduationCap className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#fff0e6] text-[#e85d04]"
          label={t("statTotalStudents")}
          value={students.length}
        />
        <MetricStatCard
          icon={<UserIcon className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#e6f7ee] text-[#16a34a]"
          label={t("statActiveStudents")}
          value={active.length}
        />
        <MetricStatCard
          icon={<UserMinus className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#fde8e8] text-[#e11d48]"
          label={t("statDisabledStudents")}
          value={deactivatedStudents}
        />
        <MetricStatCard
          icon={<Timer className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#e8f3fb] text-[#2b9adf]"
          label={t("statAvgAge")}
          value={avgAge != null ? `${avgAge}${t("statAgeYearsSuffix")}` : 0}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <article className={cn(CARD, "xl:col-span-5")}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              <Users className="h-4 w-4" strokeWidth={2} />
            </span>
            <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">{t("chartGenderTitle")}</h3>
          </div>
          <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {genderTotal === 0 ? (
              <div className="h-full w-full bg-zinc-200 dark:bg-zinc-700" />
            ) : (
              genderData.map((row, i) =>
                row.count <= 0 ? null : (
                  <div
                    key={row.name}
                    className="h-full"
                    style={{
                      width: `${(row.count / genderTotal) * 100}%`,
                      backgroundColor: GENDER_SLICE_COLORS[i % GENDER_SLICE_COLORS.length],
                    }}
                  />
                ),
              )
            )}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {genderData.map((row, i) => {
              const pct = genderTotal > 0 ? Math.round((row.count / genderTotal) * 1000) / 10 : 0;
              const pctLabel = Number.isInteger(pct) ? `${pct}` : pct.toFixed(1);
              return (
                <li key={row.name} className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
                  <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: GENDER_SLICE_COLORS[i % GENDER_SLICE_COLORS.length] }}
                    />
                    {row.name}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums leading-none text-zinc-900 dark:text-zinc-50">
                    {row.count} <span className="text-sm font-medium text-zinc-400">({pctLabel}%)</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </article>

        <article className={cn(CARD, "xl:col-span-7")}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
              <Globe2 className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">{t("chartNationalityTitle")}</h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">{t("chartNationalitySubtitle")}</p>
            </div>
          </div>
          {nationalitySlices.length === 0 ? (
            <p className="flex min-h-[16.5rem] items-center justify-center text-sm text-zinc-500">{t("noNationalityData")}</p>
          ) : (
            <div className="mt-2 flex min-h-[16.5rem] flex-col items-center gap-4 sm:flex-row">
              <div className="h-[220px] w-full max-w-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nationalitySlices}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {nationalitySlices.map((_, i) => (
                        <Cell key={`n-${i}`} fill={NATIONALITY_SLICE_COLORS[i % NATIONALITY_SLICE_COLORS.length]} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                          const cx = viewBox.cx ?? 0;
                          const cy = viewBox.cy ?? 0;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={cx} dy="-0.15em" className="fill-zinc-900 text-[1.65rem] font-bold dark:fill-zinc-100">
                                {nationalityTotal}
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
                {nationalitySlices.map((row, i) => {
                  const pct = nationalityTotal > 0 ? Math.round((row.count / nationalityTotal) * 1000) / 10 : 0;
                  const pctLabel = Number.isInteger(pct) ? `${pct}` : pct.toFixed(1);
                  return (
                    <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: NATIONALITY_SLICE_COLORS[i % NATIONALITY_SLICE_COLORS.length] }}
                        />
                        <span className="truncate">{row.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                        {row.count} ({pctLabel}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </article>
      </section>

      <section className={CARD}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">{signupsTitle}</h3>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{signupsSubtitle}</p>
          </div>
          <label className="relative inline-flex w-fit shrink-0 self-start">
            <span className="sr-only">{t("granularityAria")}</span>
            <select
              value={signupGranularity}
              onChange={(e) => setSignupGranularity(e.target.value as SignupGranularity)}
              className="h-9 appearance-none rounded-xl bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-zinc-600 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.2)] ring-1 ring-zinc-200/80 outline-none dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
            >
              <option value="month">{t("granularityMonthly")}</option>
              <option value="week">{t("granularityWeekly")}</option>
              <option value="year">{t("granularityYearly")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="min-w-0 flex-1 basis-[10.5rem] rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
            <p className="text-xs text-zinc-400">{t("totalNewStudents")}</p>
            <p className="mt-1 font-display text-2xl font-bold text-court dark:text-zinc-100">{signupTotal}</p>
            <GrowthCaption change={signupTotalGrowth?.change} locale={intlLocale} vsLabel={vsLastBucketLabel} />
          </div>
          <div className="min-w-0 flex-1 basis-[10.5rem] rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
            <p className="text-xs text-zinc-400">{t("growthRate")}</p>
            <p
              className={cn(
                "mt-1 font-display text-2xl font-bold",
                signupGrowth?.change == null
                  ? "text-court dark:text-zinc-100"
                  : signupGrowth.change > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : signupGrowth.change < 0
                      ? "text-red-500 dark:text-red-400"
                      : "text-court dark:text-zinc-100",
              )}
            >
              {signupGrowth?.change == null ? "—" : `${formatPct(signupGrowth.change, intlLocale)}%`}
            </p>
            <GrowthCaption change={signupGrowth?.change} locale={intlLocale} vsLabel={vsLastBucketLabel} />
          </div>
        </div>

        <div className="mt-2 h-[220px] min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={comparisonSeries} margin={{ top: 12, right: 8, left: -12, bottom: 8 }}>
              <defs>
                <linearGradient id={`${gradCurrent}-bottom`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_CURRENT} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={LINE_CURRENT} stopOpacity={0.02} />
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
              <Legend
                verticalAlign="bottom"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="previous"
                stroke={LINE_PREVIOUS}
                strokeWidth={2}
                fill="none"
                name={t("lastYear")}
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke={LINE_CURRENT}
                strokeWidth={2.5}
                fill={`url(#${gradCurrent}-bottom)`}
                name={t("thisYear")}
                dot={{ r: 4, fill: LINE_CURRENT, stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
