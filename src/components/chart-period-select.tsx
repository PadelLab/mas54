"use client";

import { ChevronDown } from "lucide-react";
import type { ChartPeriod } from "@/lib/chart-period";

export function ChartPeriodSelect({
  value,
  onChange,
  ariaLabel,
  allLabel,
  weekLabel,
  monthLabel,
  quarterLabel,
  yearLabel,
}: {
  value: ChartPeriod;
  onChange: (next: ChartPeriod) => void;
  ariaLabel: string;
  allLabel: string;
  weekLabel: string;
  monthLabel: string;
  quarterLabel: string;
  yearLabel: string;
}) {
  return (
    <label className="relative inline-flex w-fit shrink-0 self-start">
      <span className="sr-only">{ariaLabel}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ChartPeriod)}
        className="h-9 appearance-none rounded-xl bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-zinc-600 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.2)] ring-1 ring-zinc-200/80 outline-none dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
      >
        <option value="all">{allLabel}</option>
        <option value="week">{weekLabel}</option>
        <option value="month">{monthLabel}</option>
        <option value="quarter">{quarterLabel}</option>
        <option value="year">{yearLabel}</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
    </label>
  );
}
