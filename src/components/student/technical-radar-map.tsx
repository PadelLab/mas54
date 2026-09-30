"use client";

import type { RadarSkillRow } from "@/lib/technical-radar";
import { OVERALL_RADAR_CHART_BOX_CLASS } from "@/components/student/overall-radar-chart-box";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: RadarSkillRow[];
  className?: string;
  /** When the coach views a student; overrides default radar subtitle copy. */
  radarSubtitleOverride?: string;
};

export function TechnicalRadarMap({ data, className, radarSubtitleOverride }: Props) {
  const t = useTranslations("StudentOverall.radar");
  const tAxes = useTranslations("StudentOverall.axes");

  const radarSubtitle =
    radarSubtitleOverride !== undefined
      ? radarSubtitleOverride.trim() || null
      : t("subtitle");

  const chartData = data.map((d) => ({
    subject: tAxes(d.axis),
    value: d.value,
  }));

  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col", className)}>
      <div className="shrink-0">
        <div className="mb-3 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-800">
            <Activity className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">{t("eyebrow")}</span>
        </div>
        <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">{t("title")}</h2>
        {radarSubtitle ? (
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{radarSubtitle}</p>
        ) : null}
      </div>

      <div className="mt-4 flex min-h-[260px] w-full flex-1 flex-col items-center justify-center">
        <div className={OVERALL_RADAR_CHART_BOX_CLASS}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="72%"
              data={chartData}
              margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
            >
              <PolarGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "var(--chart-tick)", fontSize: 11, fontWeight: 500 }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={5}
                tick={false}
                axisLine={false}
                stroke="var(--chart-grid)"
              />
              <Radar
                name={t("seriesName")}
                dataKey="value"
                stroke="#047857"
                strokeWidth={2}
                fill="#10b981"
                fillOpacity={0.28}
                dot={{ r: 3, fill: "#065f46", strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
