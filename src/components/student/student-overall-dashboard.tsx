"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Crosshair,
  Eye,
  HeartPulse,
  LayoutGrid,
  Target,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import { StudentScreenShell } from "@/components/student/student-screen-shell";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { ChartPeriodSelect } from "@/components/chart-period-select";
import { EmptyState } from "@/components/empty-state";
import { OVERALL_RADAR_CHART_BOX_CLASS } from "@/components/student/overall-radar-chart-box";
import { OverallRing } from "@/components/overall-ring";
import { useAuth } from "@/contexts/auth-context";
import { type ChartPeriod, instantInChartPeriod } from "@/lib/chart-period";
import { scoresForSkill } from "@/lib/evaluation-utils";
import { buildTechnicalRadar } from "@/lib/technical-radar";
import { COMPETENCY_KEYS, SKILL_AXIS_KEYS, type CompetencyKey, type SkillAxisKey, type User } from "@/lib/types";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { cn, formatDate } from "@/lib/utils";

const TechnicalRadarMap = dynamic(
  () => import("@/components/student/technical-radar-map").then((m) => m.TechnicalRadarMap),
  {
    ssr: false,
    /** Same structure/height as `TechnicalRadarMap` so the Overall card does not resize on hydration. */
    loading: () => (
      <div className="flex min-h-0 w-full flex-1 flex-col" role="status" aria-label="Loading chart">
        <div className="shrink-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-700/60" />
            <span className="h-3 w-24 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/60" />
          </div>
          <div className="h-7 w-44 max-w-full animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-700/50 sm:h-8 sm:w-52" />
          <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-zinc-200/50 dark:bg-zinc-700/40" />
        </div>
        <div className="mt-4 flex min-h-[260px] w-full flex-1 flex-col items-center justify-center">
          <div
            className={cn(
              OVERALL_RADAR_CHART_BOX_CLASS,
              "animate-pulse rounded-2xl bg-zinc-200/25 dark:bg-zinc-800/40",
            )}
          />
        </div>
      </div>
    ),
  },
);

const SKILLS: { key: SkillAxisKey; icon: LucideIcon }[] = [
  { key: "consistency", icon: Activity },
  { key: "tactical_read", icon: Eye },
  { key: "control", icon: Crosshair },
  { key: "serve", icon: Target },
  { key: "endurance", icon: HeartPulse },
  { key: "positioning", icon: LayoutGrid },
];

const iconWrap: Record<SkillAxisKey, string> = {
  consistency: "bg-emerald-50 text-emerald-700 ring-emerald-100/90 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/50",
  tactical_read: "bg-sky-50 text-sky-700 ring-sky-100/90 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/40",
  control: "bg-teal-50 text-teal-800 ring-teal-100/90 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900/40",
  serve: "bg-amber-50 text-amber-800 ring-amber-100/90 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/40",
  endurance: "bg-rose-50 text-rose-800 ring-rose-100/90 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/40",
  positioning: "bg-violet-50 text-violet-800 ring-violet-100/90 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/40",
};

const cardBg: Record<SkillAxisKey, string> = {
  consistency: "from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-900",
  tactical_read: "from-sky-50/45 via-white to-white dark:from-sky-950/20 dark:via-zinc-900 dark:to-zinc-900",
  control: "from-teal-50/40 via-white to-white dark:from-teal-950/15 dark:via-zinc-900 dark:to-zinc-900",
  serve: "from-amber-50/40 via-white to-white dark:from-amber-950/15 dark:via-zinc-900 dark:to-zinc-900",
  endurance: "from-rose-50/35 via-white to-white dark:from-rose-950/15 dark:via-zinc-900 dark:to-zinc-900",
  positioning: "from-violet-50/40 via-white to-white dark:from-violet-950/15 dark:via-zinc-900 dark:to-zinc-900",
};

const barClass: Record<SkillAxisKey, string> = {
  consistency: "bg-gradient-to-r from-emerald-500 to-teal-400",
  tactical_read: "bg-gradient-to-r from-sky-500 to-blue-400",
  control: "bg-gradient-to-r from-teal-500 to-cyan-400",
  serve: "bg-gradient-to-r from-amber-500 to-orange-400",
  endurance: "bg-gradient-to-r from-rose-500 to-orange-400",
  positioning: "bg-gradient-to-r from-violet-500 to-purple-400",
};

const historySkillBadge: Record<SkillAxisKey, string> = {
  consistency: "bg-emerald-50 text-emerald-900 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-900",
  tactical_read: "bg-sky-50 text-sky-900 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-900",
  control: "bg-teal-50 text-teal-900 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-100 dark:ring-teal-900",
  serve: "bg-amber-50 text-amber-900 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-900",
  endurance: "bg-rose-50 text-rose-900 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-100 dark:ring-rose-900",
  positioning: "bg-violet-50 text-violet-900 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-900",
};

const historyLegacyBadge: Record<CompetencyKey, string> = {
  tecnica: "bg-emerald-50 text-emerald-800 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-900",
  tatico: "bg-sky-50 text-sky-900 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-900",
  fisico: "bg-amber-50 text-amber-900 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-900",
  mental: "bg-violet-50 text-violet-900 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-100 dark:ring-violet-900",
};

function OverallSectionHeader({
  title,
  intro,
  extra,
}: {
  title: string;
  intro?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-7 border-b border-zinc-200/60 pb-5 dark:border-zinc-800/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
              aria-hidden
            />
            <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              {title}
            </h2>
          </div>
          {intro ? (
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{intro}</p>
          ) : null}
        </div>
        {extra}
      </div>
    </div>
  );
}

function EvolutionTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
      {label ? <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">{label}</p> : null}
      {payload.map((entry, idx) => (
        <p key={`${String(entry.dataKey)}-${idx}`} className="text-zinc-700 dark:text-zinc-300">
          <span className="text-zinc-500 dark:text-zinc-400">{entry.name}</span>:{" "}
          <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export type StudentOverallVariant = "self" | "coach";

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export function StudentOverallDashboard({
  subject,
  variant = "self",
  backHref,
  backLabel,
  crumbLabel,
  profileHref,
  shellTitle,
  shellDescription,
}: {
  subject: User;
  variant?: StudentOverallVariant;
  /** Student list (coach/admin); same visual style as the rest of Overall. */
  backHref?: string;
  backLabel?: string;
  /** Last breadcrumb item; defaults to the page title. */
  crumbLabel?: string;
  /** Student profile (coach/admin); header photo + name open this route. */
  profileHref?: string;
  /** When set (e.g. coach view), overrides StudentOverall title/subtitle */
  shellTitle?: string;
  shellDescription?: string;
}) {
  const { evaluations, users } = useAuth();
  const t = useTranslations("StudentOverall");
  const tAxes = useTranslations("StudentOverall.axes");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const [evolutionPeriod, setEvolutionPeriod] = useState<ChartPeriod>("all");
  const evolutionGradientId = useId().replace(/:/g, "");

  const coach = variant === "coach";

  const mine = useMemo(
    () => evaluations.filter((e) => e.studentId === subject.id),
    [evaluations, subject.id],
  );

  const sortedMine = useMemo(() => [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [mine]);

  const bySkill = useMemo(() => {
    return SKILLS.map(({ key, icon }) => {
      const scores = scoresForSkill(mine, key);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      return { key, icon, avg, count: scores.length };
    });
  }, [mine]);

  const radarData = useMemo(
    () => buildTechnicalRadar(subject.overall ?? 0, mine),
    [subject.overall, mine],
  );

  const recentAvg = useMemo(() => {
    const slice = sortedMine.slice(0, 3);
    if (!slice.length) return 0;
    return Math.round(slice.reduce((s, e) => s + e.score, 0) / slice.length);
  }, [sortedMine]);

  const lastScore = sortedMine[0]?.score ?? 0;

  const evolutionData = useMemo(() => {
    const scoped = [...mine]
      .filter((e) => instantInChartPeriod(e.createdAt, evolutionPeriod))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return scoped.map((ev, i) => ({
      key: ev.id,
      label: formatDate(ev.createdAt, intlLocale),
      score: ev.score,
      index: i + 1,
    }));
  }, [mine, evolutionPeriod, intlLocale]);

  const title = shellTitle ?? t("title");
  const description = shellDescription ?? (coach ? t("subtitleCoach") : t("subtitle"));
  const scoreExplainer = coach ? t("scoreExplainerCoach") : t("scoreExplainer");
  const historyEmptyTitle = t("historyEmptyTitle");
  const historyEmpty = coach ? t("historyEmptyCoach") : t("historyEmpty");

  const statTiles: { id: string; label: string; sub?: string; value: number }[] = [
    { id: "evaluations", label: t("statEvaluations"), value: mine.length },
    {
      id: "recent",
      label: t("statRecent"),
      sub: t("statRecentHint"),
      value: recentAvg,
    },
    { id: "latest", label: t("statLast"), value: lastScore },
  ];

  return (
    <div className="w-full min-w-0 max-w-none text-base leading-normal text-zinc-900 dark:text-zinc-100">
      {backHref && backLabel ? (
        <AppBreadcrumb
          items={[
            { href: backHref, label: backLabel },
            ...(crumbLabel ? [{ label: crumbLabel }] : []),
          ]}
        />
      ) : null}
      <StudentScreenShell
        layout="full"
        className="space-y-9 sm:space-y-10"
        title={title}
        description={description}
        headerExtra={
          profileHref ? (
            <Link
              href={profileHref}
              className="mt-3 inline-flex max-w-full items-center gap-3 rounded-2xl py-1 pr-1 transition hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-200 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {subject.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={subject.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  studentInitials(subject.name)
                )}
              </span>
              <span className="min-w-0 truncate font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {subject.name}
              </span>
            </Link>
          ) : null
        }
      >
        <div className="flex min-w-0 flex-col gap-8 lg:gap-10">
          <section className="surface-card min-w-0 overflow-hidden bg-white shadow-xl shadow-zinc-900/[0.04] ring-1 ring-zinc-200/40 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-zinc-800/60">
            <div className="grid min-w-0 grid-cols-1 divide-y divide-zinc-200/75 bg-white md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:divide-x md:divide-y-0 md:divide-zinc-200/70 dark:divide-zinc-700/55 dark:bg-zinc-900">
              <div className="relative min-w-0 p-6 sm:p-8 lg:p-10">
                <div className="relative isolate mx-auto flex w-full min-w-0 max-w-none flex-col items-center text-center">
                  <OverallRing
                    value={subject.overall || 0}
                    size={220}
                    label={t("ringLabel")}
                    className="w-full max-w-[min(220px,70vw)]"
                  />
                  <p className="mt-6 min-h-[4.5rem] w-full max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 md:min-h-[3.75rem]">
                    {scoreExplainer}
                  </p>

                  <div className="mt-8 flex w-full max-w-2xl flex-wrap justify-center gap-3 sm:gap-4 md:max-w-none">
                    {statTiles.map((tile) => (
                      <div
                        key={tile.id}
                        className="flex min-h-[5.75rem] min-w-[5.75rem] flex-1 flex-col justify-between gap-2 rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-center shadow-sm backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-emerald-300/60 hover:bg-emerald-50/25 hover:shadow-md dark:border-zinc-700/70 dark:bg-zinc-800/55 dark:hover:border-emerald-600/35 dark:hover:bg-emerald-950/25 sm:min-w-[6.75rem]"
                      >
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">{tile.label}</p>
                          {tile.sub ? (
                            <p className="text-[10px] leading-tight text-zinc-400 dark:text-zinc-500">{tile.sub}</p>
                          ) : (
                            <span className="block min-h-[0.875rem]" aria-hidden />
                          )}
                        </div>
                        <p className="font-display text-2xl font-bold tabular-nums leading-none text-zinc-900 dark:text-zinc-50">
                          {tile.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-500/25">
                    <BarChart3 className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    {t("evalSummary", { count: mine.length })}
                  </p>
                </div>
              </div>

              <div className="overall-radar-chart relative flex min-h-[300px] min-w-0 flex-col p-6 sm:p-8 md:min-h-[460px]">
                <TechnicalRadarMap data={radarData} radarSubtitleOverride={coach ? t("radar.subtitleCoach") : undefined} />
              </div>
            </div>
          </section>

          <section className="surface-card p-6 sm:p-8 lg:p-10">
            <OverallSectionHeader title={t("dimensionsTitle")} intro={t("dimensionsIntro")} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bySkill.map(({ key, icon: Icon, avg, count }) => (
                <div
                  key={key}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br p-5 shadow-sm ring-1 ring-zinc-100/50 transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700/80 dark:ring-zinc-800/40 dark:hover:border-zinc-600",
                    cardBg[key],
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1",
                        iconWrap[key],
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="text-right">
                      <div className="font-display text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {avg ?? 0}
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{t("subEvals", { count })}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{tAxes(key)}</div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-900/[0.06] shadow-inner dark:bg-white/[0.08]">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", barClass[key])}
                      style={{ width: avg !== null ? `${avg}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card p-6 sm:p-8 lg:p-10">
            <OverallSectionHeader
              title={t("evolutionTitle")}
              intro={t("evolutionIntro")}
              extra={
                <ChartPeriodSelect
                  value={evolutionPeriod}
                  onChange={setEvolutionPeriod}
                  ariaLabel={t("periodFilterAria")}
                  allLabel={t("periodAll")}
                  weekLabel={t("periodWeek")}
                  monthLabel={t("periodMonth")}
                  quarterLabel={t("periodQuarter")}
                  yearLabel={t("periodYear")}
                />
              }
            />
            {evolutionData.length === 0 ? (
              <p className="flex h-[240px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                {t("evolutionEmpty")}
              </p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={evolutionGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--chart-grid)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "var(--chart-tick)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip content={EvolutionTooltip} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill={`url(#${evolutionGradientId})`}
                      name={t("evolutionScore")}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="surface-card p-6 sm:p-8 lg:p-10">
            <OverallSectionHeader title={t("historyTitle")} intro={t("historyIntro")} />

            {sortedMine.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={historyEmptyTitle}
                description={historyEmpty}
                className="border-0 bg-transparent py-10 shadow-none dark:bg-transparent"
              />
            ) : (
              <ul className="space-y-4 sm:space-y-5">
                {sortedMine.map((ev, idx) => {
                  const prof = users.find((u) => u.id === ev.coachId);
                  return (
                    <li key={ev.id} className="flex gap-4 sm:gap-6">
                      <div className="flex shrink-0 flex-col items-center pt-1">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-sm font-bold tabular-nums text-white shadow-lg shadow-emerald-900/25 ring-2 ring-white dark:ring-zinc-900">
                          {ev.score}
                        </div>
                        {idx < sortedMine.length - 1 ? (
                          <div
                            className="mt-2 min-h-[10px] w-px flex-1 bg-gradient-to-b from-emerald-300/80 via-emerald-200/40 to-transparent dark:from-emerald-700/80 dark:via-emerald-800/40 dark:to-transparent"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <article className="min-w-0 flex-1 rounded-2xl border border-zinc-200/70 bg-white/60 p-4 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md dark:border-zinc-700/80 dark:bg-zinc-900/50 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {ev.skills ? (
                            SKILL_AXIS_KEYS.map((sk) => (
                              <span
                                key={sk}
                                className={cn(
                                  "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                                  historySkillBadge[sk],
                                )}
                              >
                                {tAxes(sk)} <span className="tabular-nums">{ev.skills![sk]}</span>
                              </span>
                            ))
                          ) : ev.competencies ? (
                            COMPETENCY_KEYS.map((ck) => (
                              <span
                                key={ck}
                                className={cn(
                                  "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                                  historyLegacyBadge[ck],
                                )}
                              >
                                {t(`categories.${ck}`)} <span className="tabular-nums">{ev.competencies![ck]}</span>
                              </span>
                            ))
                          ) : ev.category ? (
                            <span
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                                historyLegacyBadge[ev.category],
                              )}
                            >
                              {t(`categories.${ev.category}`)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{ev.comment}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                          <span className="rounded-md bg-zinc-100/90 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200">
                            {prof?.name ?? "—"}
                          </span>
                          <time
                            className="tabular-nums text-zinc-500 dark:text-zinc-400"
                            dateTime={ev.createdAt}
                          >
                            {formatDate(ev.createdAt, intlLocale)}
                          </time>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </StudentScreenShell>
    </div>
  );
}
