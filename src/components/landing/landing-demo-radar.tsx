"use client";

import { useMemo, useSyncExternalStore } from "react";
import { OVERALL_RADAR_CHART_BOX_CLASS } from "@/components/student/overall-radar-chart-box";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

/** Order aligned with `SKILL_AXIS_KEYS` — illustrative values (not real data). */
const DEMO_RADAR = [
  { subject: "Consistência", value: 46 },
  { subject: "Leitura tática", value: 80 },
  { subject: "Controle", value: 52 },
  { subject: "Saque", value: 94 },
  { subject: "Resistência", value: 42 },
  { subject: "Posicionamento", value: 86 },
];

function useDocumentDarkClass() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const el = document.documentElement;
      const mo = new MutationObserver(onStoreChange);
      mo.observe(el, { attributes: true, attributeFilter: ["class"] });
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", onStoreChange);
      return () => {
        mo.disconnect();
        mq.removeEventListener("change", onStoreChange);
      };
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

const DEFAULT_CHART_BOX = OVERALL_RADAR_CHART_BOX_CLASS;

export type LandingDemoRadarProps = {
  /** Extra classes on the outer card (e.g. grid alignment). */
  className?: string;
  /** Overrides the chart height box (e.g. landing with a larger radar). */
  chartBoxClassName?: string;
  /** Radar polygon radius (default `72%`). */
  outerRadius?: `${number}%`;
};

export function LandingDemoRadar({
  className,
  chartBoxClassName = DEFAULT_CHART_BOX,
  outerRadius = "72%",
}: LandingDemoRadarProps = {}) {
  const isDark = useDocumentDarkClass();

  const chart = useMemo(() => {
    if (isDark) {
      return {
        grid: "#52525b",
        tickFill: "#e4e4e7",
        radiusStroke: "#52525b",
        radarStroke: "#34d399",
        radarFill: "#059669",
        fillOpacity: 0.32,
        dotFill: "#047857",
      };
    }
    return {
      grid: "#d4d4d8",
      tickFill: "#3f3f46",
      radiusStroke: "#d4d4d8",
      radarStroke: "#0d3b2c",
      radarFill: "#0d3b2c",
      fillOpacity: 0.22,
      dotFill: "#0d3b2c",
    };
  }, [isDark]);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 shadow-lg sm:p-5",
        "border-zinc-200/90 bg-white shadow-zinc-900/5",
        "dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30",
        className,
      )}
    >
      <div className={chartBoxClassName}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            key={isDark ? "dark" : "light"}
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            data={DEMO_RADAR}
            margin={{ top: 8, right: 22, bottom: 8, left: 22 }}
          >
            <PolarGrid stroke={chart.grid} strokeDasharray="4 4" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: chart.tickFill, fontSize: 11, fontWeight: 500 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tickCount={5}
              tick={false}
              axisLine={false}
              stroke={chart.radiusStroke}
            />
            <Radar
              name="Exemplo"
              dataKey="value"
              stroke={chart.radarStroke}
              strokeWidth={2}
              fill={chart.radarFill}
              fillOpacity={chart.fillOpacity}
              dot={{ r: 3, fill: chart.dotFill, strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
        Valores apenas ilustrativos — seu mapa resulta das avaliações que o professor registra.
      </p>
    </div>
  );
}
