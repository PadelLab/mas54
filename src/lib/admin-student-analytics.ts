import { CONTINENT_IDS, continentFromCountryCode, type ContinentId } from "@/lib/continents";
import type { Lesson, LessonActivityCatalog, User } from "@/lib/types";

/** Aggregated “other nationalities” key on charts. */
export const ADMIN_NATIONALITY_OTHER_KEY = "__other__";

/** Query params on the student list (filter by account creation date). */
export const ADMIN_ALUNOS_CREATED_FROM_PARAM = "createdFrom";
export const ADMIN_ALUNOS_CREATED_TO_PARAM = "createdTo";

/** `YYYY-MM-DD` on the local calendar. */
export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local date (midnight that day). */
export function parseYmdLocalDate(s: string | null | undefined): Date | null {
  if (s == null || s.trim() === "") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function studentsOnly(users: User[]): User[] {
  return users.filter((u) => u.role === "student");
}

export function activeStudents(users: User[]): User[] {
  return studentsOnly(users).filter((u) => u.status === "active");
}

/** Age in completed years on the reference date (default: today). */
export function ageFromBirthDate(isoDate: string, ref: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const bd = new Date(y, mo - 1, d);
  if (Number.isNaN(bd.getTime())) return null;
  let age = ref.getFullYear() - bd.getFullYear();
  const md = ref.getMonth() - bd.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < bd.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Mean age; `null` if there are no valid dates. */
export function averageAgeYears(students: User[]): number | null {
  const ages = students.map((s) => (s.birthDate ? ageFromBirthDate(s.birthDate) : null)).filter((a): a is number => a !== null);
  if (!ages.length) return null;
  const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
  return Math.round(avg * 10) / 10;
}

export type NationalitySlice = { key: string; label: string; count: number };

function regionDisplayName(code: string, intlLocale: string): string {
  if (code.length !== 2) return code;
  try {
    return new Intl.DisplayNames([intlLocale], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Aggregate by nationality (ISO-2 codes or text); `topN` largest + rest in “other”. */
export function nationalityDistribution(
  students: User[],
  intlLocale: string,
  topN = 6,
  otherKey = ADMIN_NATIONALITY_OTHER_KEY,
): NationalitySlice[] {
  const map = new Map<string, number>();
  for (const s of students) {
    const raw = (s.nationality ?? "").trim();
    if (!raw) continue;
    const key = raw.length === 2 ? raw.toUpperCase() : raw.slice(0, 80);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN).reduce((sum, [, c]) => sum + c, 0);
  const out: NationalitySlice[] = top.map(([key, count]) => ({
    key,
    count,
    label: key.length === 2 ? regionDisplayName(key, intlLocale) : key,
  }));
  if (rest > 0) {
    out.push({ key: otherKey, label: "", count: rest });
  }
  return out;
}

export type MonthBucket = { key: string; label: string; count: number };

/** Count of students created per month (last `monthsBack` months, including the current month). */
export function studentsCreatedByMonth(students: User[], monthsBack = 6): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    buckets.push({ key, label, count: 0 });
  }
  for (const s of students) {
    const created = new Date(s.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.count += 1;
  }
  return buckets;
}

/** Start of the local day (00:00:00.000). */
function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** End of the local day (23:59:59.999). */
function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Students whose account was created between the inclusive dates (local calendar). */
export function filterStudentsByCreatedAtRange(students: User[], fromInclusive: Date, toInclusive: Date): User[] {
  const start = startOfLocalDay(fromInclusive);
  const end = endOfLocalDay(toInclusive);
  return students.filter((s) => {
    const c = new Date(s.createdAt);
    return !Number.isNaN(c.getTime()) && c >= start && c <= end;
  });
}

/**
 * One bucket per calendar month from the month of `fromInclusive` through `toInclusive` (inclusive).
 * Counts only students in `students` whose `createdAt` falls in that month and date range.
 */
export function studentsCreatedByMonthInRange(
  students: User[],
  fromInclusive: Date,
  toInclusive: Date,
  maxMonths = 36,
): MonthBucket[] {
  const startM = new Date(fromInclusive.getFullYear(), fromInclusive.getMonth(), 1);
  const endM = new Date(toInclusive.getFullYear(), toInclusive.getMonth(), 1);
  if (startM > endM) return [];

  const buckets: MonthBucket[] = [];
  const cur = new Date(startM);
  while (cur <= endM) {
    if (buckets.length >= maxMonths) break;
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = cur.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    buckets.push({ key, label, count: 0 });
    cur.setMonth(cur.getMonth() + 1);
  }

  const filtered = filterStudentsByCreatedAtRange(students, fromInclusive, toInclusive);
  for (const s of filtered) {
    const created = new Date(s.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.count += 1;
  }
  return buckets;
}

export type GenderCountKey = "male" | "female" | "other" | "unspecified";

export function genderCounts(students: User[]): Record<GenderCountKey, number> {
  const out: Record<GenderCountKey, number> = { male: 0, female: 0, other: 0, unspecified: 0 };
  for (const s of students) {
    if (s.gender === "male") out.male += 1;
    else if (s.gender === "female") out.female += 1;
    else if (s.gender === "other") out.other += 1;
    else out.unspecified += 1;
  }
  return out;
}

/** Inclusive calendar days between two local dates (both count). */
export function inclusiveLocalDayCount(fromInclusive: Date, toInclusive: Date): number {
  const a = startOfLocalDay(fromInclusive).getTime();
  const b = startOfLocalDay(toInclusive).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

/**
 * Previous range with the same number of inclusive calendar days,
 * ending the day immediately before the start of `fromInclusive`.
 */
export function previousInclusiveDateRange(
  fromInclusive: Date,
  toInclusive: Date,
): { from: Date; to: Date } | null {
  const n = inclusiveLocalDayCount(fromInclusive, toInclusive);
  if (n <= 0) return null;
  const startCurrent = startOfLocalDay(fromInclusive);
  const lastPrevDay = new Date(startCurrent);
  lastPrevDay.setDate(lastPrevDay.getDate() - 1);
  const prevTo = endOfLocalDay(lastPrevDay);
  const firstPrevDay = new Date(startOfLocalDay(lastPrevDay));
  firstPrevDay.setDate(firstPrevDay.getDate() - (n - 1));
  const prevFrom = startOfLocalDay(firstPrevDay);
  return { from: prevFrom, to: prevTo };
}

/** Percent change vs the previous period; `null` if not meaningful (e.g. denominator 0). */
export function percentChangeVsPrevious(current: number, previous: number): number | null {
  if (previous > 0) return Math.round(((current - previous) / previous) * 1000) / 10;
  if (previous === 0 && current > 0) return null;
  return null;
}

function bucketIndex(series: SignupComparisonPoint[], granularity: SignupGranularity, ref: Date): number {
  if (series.length < 1) return -1;
  return granularity === "month" ? Math.min(ref.getMonth(), series.length - 1) : series.length - 1;
}

/** Chart points: months of the current period + previous-period counts aligned by index. */
export function signupComparisonSeries(
  students: User[],
  fromInclusive: Date,
  toInclusive: Date,
  maxMonths = 36,
): { label: string; key: string; current: number; previous: number }[] {
  const current = studentsCreatedByMonthInRange(students, fromInclusive, toInclusive, maxMonths);
  const prevR = previousInclusiveDateRange(fromInclusive, toInclusive);
  if (!prevR) {
    return current.map((b) => ({ label: b.label, key: b.key, current: b.count, previous: 0 }));
  }
  const previous = studentsCreatedByMonthInRange(students, prevR.from, prevR.to, maxMonths);
  const len = Math.max(current.length, previous.length);
  const out: { label: string; key: string; current: number; previous: number }[] = [];
  for (let i = 0; i < len; i++) {
    const c = current[i];
    const p = previous[i];
    out.push({
      label: c?.label ?? p?.label ?? "",
      key: c?.key ?? p?.key ?? `i-${i}`,
      current: c?.count ?? 0,
      previous: p?.count ?? 0,
    });
  }
  return out;
}

function lessonDateLocal(lesson: Lesson): Date | null {
  const ymd = parseYmdLocalDate(lesson.date);
  if (ymd) return ymd;
  const raw = new Date(lesson.date);
  if (Number.isNaN(raw.getTime())) return null;
  return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
}

export function filterLessonsByDateRange(lessons: Lesson[], fromInclusive: Date, toInclusive: Date): Lesson[] {
  const start = startOfLocalDay(fromInclusive);
  const end = endOfLocalDay(toInclusive);
  return lessons.filter((lesson) => {
    const d = lessonDateLocal(lesson);
    return d != null && d >= start && d <= end;
  });
}

export type NamedCount = { key: string; name: string; count: number };

export function categorySelectionCounts(lessons: Lesson[], catalog: LessonActivityCatalog): NamedCount[] {
  const activityById = new Map(catalog.activities.map((a) => [a.id, a]));
  const categoryById = new Map(catalog.categories.map((c) => [c.id, c.name]));
  const map = new Map<string, number>();
  for (const lesson of lessons) {
    if (!lesson.lessonActivityId) continue;
    const activity = activityById.get(lesson.lessonActivityId);
    if (!activity) continue;
    const categoryName = categoryById.get(activity.categoryId);
    if (!categoryName) continue;
    map.set(activity.categoryId, (map.get(activity.categoryId) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({
      key,
      count,
      name: categoryById.get(key) ?? key,
    }))
    .sort((a, b) => b.count - a.count);
}

export function continentCounts(students: User[]): Record<ContinentId, number> {
  const out = Object.fromEntries(CONTINENT_IDS.map((id) => [id, 0])) as Record<ContinentId, number>;
  for (const s of students) {
    const raw = (s.nationality ?? "").trim();
    if (!raw) continue;
    const continent = continentFromCountryCode(raw);
    if (continent) out[continent] += 1;
  }
  return out;
}

export type ContinentNationalitySlice = { key: string; label: string; count: number };

export function nationalityBreakdownByContinent(
  students: User[],
  intlLocale: string,
): Record<ContinentId, ContinentNationalitySlice[]> {
  const buckets = Object.fromEntries(CONTINENT_IDS.map((id) => [id, new Map<string, number>()])) as Record<
    ContinentId,
    Map<string, number>
  >;
  for (const s of students) {
    const raw = (s.nationality ?? "").trim();
    if (!raw) continue;
    const continent = continentFromCountryCode(raw);
    if (!continent) continue;
    const key = raw.length === 2 ? raw.toUpperCase() : raw.slice(0, 80);
    buckets[continent].set(key, (buckets[continent].get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    CONTINENT_IDS.map((id) => [
      id,
      [...buckets[id].entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({
          key,
          count,
          label: key.length === 2 ? regionDisplayName(key, intlLocale) : key,
        })),
    ]),
  ) as Record<ContinentId, ContinentNationalitySlice[]>;
}

export type SignupGranularity = "week" | "month" | "year";
export type SignupComparisonPoint = { label: string; key: string; current: number; previous: number };

function countCreatedInMonth(students: User[], year: number, monthIndex: number): number {
  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 0);
  return filterStudentsByCreatedAtRange(students, from, to).length;
}

function countCreatedInYear(students: User[], year: number): number {
  return filterStudentsByCreatedAtRange(students, new Date(year, 0, 1), new Date(year, 11, 31)).length;
}

function startOfIsoWeek(d: Date): Date {
  const x = startOfLocalDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function addLocalDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** January–December of the calendar year vs the previous year. */
export function monthlyYearComparison(
  students: User[],
  year: number,
  intlLocale: string,
): SignupComparisonPoint[] {
  const monthFmt = new Intl.DateTimeFormat(intlLocale, { month: "short" });
  return Array.from({ length: 12 }, (_, month) => ({
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    label: monthFmt.format(new Date(year, month, 1)),
    current: countCreatedInMonth(students, year, month),
    previous: countCreatedInMonth(students, year - 1, month),
  }));
}

/** Last `weeks` weeks (ISO, Monday) vs the same dates in the previous year. */
export function weeklyYearComparison(
  students: User[],
  weeks: number,
  intlLocale: string,
  ref: Date = new Date(),
): SignupComparisonPoint[] {
  const thisWeekStart = startOfIsoWeek(ref);
  const dayFmt = new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short" });
  const out: SignupComparisonPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = addLocalDays(thisWeekStart, -i * 7);
    const to = addLocalDays(from, 6);
    const prevFrom = new Date(from);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    const prevTo = new Date(to);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    out.push({
      key: formatYmdLocal(from),
      label: dayFmt.format(from),
      current: filterStudentsByCreatedAtRange(students, from, to).length,
      previous: filterStudentsByCreatedAtRange(students, prevFrom, prevTo).length,
    });
  }
  return out;
}

/** Last `years` calendar years vs the immediately previous year at each point. */
export function yearlySignupComparison(students: User[], years: number, ref: Date = new Date()): SignupComparisonPoint[] {
  const endYear = ref.getFullYear();
  return Array.from({ length: years }, (_, i) => {
    const year = endYear - (years - 1 - i);
    return {
      key: String(year),
      label: String(year),
      current: countCreatedInYear(students, year),
      previous: countCreatedInYear(students, year - 1),
    };
  });
}

export function signupSeriesForGranularity(
  students: User[],
  granularity: SignupGranularity,
  intlLocale: string,
  ref: Date = new Date(),
): SignupComparisonPoint[] {
  if (granularity === "week") return weeklyYearComparison(students, 12, intlLocale, ref);
  if (granularity === "year") return yearlySignupComparison(students, 6, ref);
  return monthlyYearComparison(students, ref.getFullYear(), intlLocale);
}

/** Change of the current period vs the previous one (month/week/year in progress). */
export function latestBucketGrowth(
  series: SignupComparisonPoint[],
  granularity: SignupGranularity,
  ref: Date = new Date(),
): {
  current: number;
  previous: number;
  change: number | null;
} | null {
  const idx = bucketIndex(series, granularity, ref);
  if (idx < 0) return null;
  const current = series[idx]?.current ?? 0;
  const previous = idx > 0 ? (series[idx - 1]?.current ?? 0) : (series[idx]?.previous ?? 0);
  return { current, previous, change: percentChangeVsPrevious(current, previous) };
}

/** Cumulative total through the current period vs through the previous period. */
export function cumulativeSignupGrowth(
  series: SignupComparisonPoint[],
  granularity: SignupGranularity,
  ref: Date = new Date(),
): {
  current: number;
  previous: number;
  change: number | null;
} | null {
  const idx = bucketIndex(series, granularity, ref);
  if (idx < 0) return null;
  if (granularity === "year") {
    const current = series[idx]?.current ?? 0;
    const previous = series[idx]?.previous ?? (idx > 0 ? (series[idx - 1]?.current ?? 0) : 0);
    return { current, previous, change: percentChangeVsPrevious(current, previous) };
  }
  let current = 0;
  let previous = 0;
  for (let i = 0; i <= idx; i++) current += series[i]?.current ?? 0;
  for (let i = 0; i < idx; i++) previous += series[i]?.current ?? 0;
  return { current, previous, change: percentChangeVsPrevious(current, previous) };
}

export function activitySelectionCounts(lessons: Lesson[], catalog: LessonActivityCatalog): NamedCount[] {
  const activityById = new Map(catalog.activities.map((a) => [a.id, a.name]));
  const map = new Map<string, number>();
  for (const lesson of lessons) {
    if (!lesson.lessonActivityId) continue;
    if (!activityById.has(lesson.lessonActivityId)) continue;
    map.set(lesson.lessonActivityId, (map.get(lesson.lessonActivityId) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({
      key,
      count,
      name: activityById.get(key) ?? key,
    }))
    .sort((a, b) => b.count - a.count);
}
