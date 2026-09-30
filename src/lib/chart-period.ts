export type ChartPeriod = "all" | "week" | "month" | "quarter" | "year";

export function endOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export function startOfCurrentWeek(ref: Date): Date {
  const from = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const weekday = from.getDay();
  from.setDate(from.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return from;
}

export function rangeForChartPeriod(period: Exclude<ChartPeriod, "all">): { from: Date; to: Date } {
  const to = endOfToday();
  if (period === "week") {
    return { from: startOfCurrentWeek(to), to };
  }
  if (period === "month") {
    return { from: new Date(to.getFullYear(), to.getMonth(), 1), to };
  }
  if (period === "quarter") {
    const quarterStartMonth = Math.floor(to.getMonth() / 3) * 3;
    return { from: new Date(to.getFullYear(), quarterStartMonth, 1), to };
  }
  return { from: new Date(to.getFullYear(), 0, 1), to };
}

export function instantInChartPeriod(iso: string, period: ChartPeriod): boolean {
  if (period === "all") return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const { from, to } = rangeForChartPeriod(period);
  return t >= from.getTime() && t <= to.getTime();
}
