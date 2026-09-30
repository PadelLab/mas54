import { APP_LOCALE_INTL, isAppLocale } from "./app-locale";
import { APP_SCHEDULE_TIMEZONE } from "./app-schedule-timezone";

/** Accepts `YYYY-MM-DD` or ISO; avoids `Invalid Date` / `NaN` on malformed dates. */
export function parseScheduleDate(value: string): Date | null {
  if (!value || typeof value !== "string") return null;
  const s = value.trim();
  // Civil prefix: `2026-08-18` and also `2026-08-18T00:00:00.000Z` (Postgres DATE).
  // Do not use `Date.parse` on that format — UTC midnight becomes the previous day west of UTC.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
    return dt;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Local `Date` → `YYYY-MM-DD`. */
export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Date field placeholder in the local format (e.g. `dd/mm/aaaa`, `mm/dd/yyyy`). */
export function localeDateInputPlaceholder(intlLocale: string) {
  const lang = intlLocale.slice(0, 2).toLowerCase();
  const yearToken = lang === "es" || lang === "pt" || lang === "ca" || lang === "it" || lang === "fr" ? "aaaa" : "yyyy";
  const parts = new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(2000, 11, 31));
  return parts
    .map((p) => {
      if (p.type === "day") return "dd";
      if (p.type === "month") return "mm";
      if (p.type === "year") return yearToken;
      return p.value;
    })
    .join("");
}

/** Stable `YYYY-MM-DD` key for grouping by day (map order = order in `filtered`). */
export function canonicalDayKey(value: string): string | null {
  const d = parseScheduleDate(value);
  if (!d) return null;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Preference `en` / `es` / … → stable `Intl` locale for dates. */
export function appLocaleToIntlLocale(locale: string) {
  return isAppLocale(locale) ? APP_LOCALE_INTL[locale] : "en-US";
}

/** Section title: full date (accepts canonical-key `YYYY-MM-DD`). */
export function formatDaySectionTitle(value: string, intlLocale: string) {
  const d = parseScheduleDate(value);
  if (!d) return "";
  return d.toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatScheduleRowDate(dateStr: string, intlLocale: string) {
  const d = parseScheduleDate(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString(intlLocale, { day: "2-digit", month: "short", year: "numeric" });
}

/** `events.date` column (TEXT or DATE via the driver): never use `String(Date).slice(0,10)`. */
export function normalizeDbEventDateString(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
    if (m) return m[1]!;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const mo = String(raw.getUTCMonth() + 1).padStart(2, "0");
    const da = String(raw.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(raw).trim());
  return m ? m[1]! : null;
}

/** `H:MM` / `HH:MM` → `09:00` (24h), for schedule cards. */
export function formatHm24(hm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return hm;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return hm;
  }
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** `HH:MM` (24h) → 12h AM/PM label, e.g. `6:30 PM`. Internal value stays `HH:MM`. */
export function formatHm12(hm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return hm;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h === 24 && min === 0) return "12:00 AM";
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return hm;
  }
  const d = new Date(2000, 0, 1, h, min);
  // `09:00 AM` (2-digit hour), aligned with the scheduling UI.
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/** `HH:MM`–`HH:MM` range in 12h. */
export function formatHmRange12(startHm: string, endHm: string): string {
  return `${formatHm12(startHm)} – ${formatHm12(endHm)}`;
}

/** `events.time` column (TEXT or TIME): always returns `HH:mm`. */
export function normalizeDbEventTimeString(raw: unknown): string {
  if (raw == null || raw === "") return "00:00";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const h = raw.getUTCHours();
    const mi = raw.getUTCMinutes();
    return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  }
  const s = String(raw).trim();
  const iso = /T(\d{2}):(\d{2})/.exec(s);
  if (iso) {
    return `${iso[1]}:${iso[2]}`;
  }
  const m = /^(\d{1,2})\s*:\s*(\d{2})/.exec(s);
  if (!m) return "00:00";
  let h = parseInt(m[1]!, 10);
  let mi = parseInt(m[2]!, 10);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return "00:00";
  h = Math.min(23, Math.max(0, h));
  mi = Math.min(59, Math.max(0, mi));
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

function isValidCivilDateUtc(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

function matchesZonedWallClock(
  utcMs: number,
  wantY: number,
  wantM: number,
  wantD: number,
  wantH: number,
  wantMin: number,
  timeZone: string,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const v = (t: Intl.DateTimeFormatPartTypes) => {
    const x = parts.find((p) => p.type === t)?.value;
    return x != null ? Number(x) : NaN;
  };
  return (
    v("year") === wantY &&
    v("month") === wantM &&
    v("day") === wantD &&
    v("hour") === wantH &&
    v("minute") === wantMin
  );
}

/**
 * UTC instant (ms) for a date + time as a wall clock in `timeZone`.
 * Accepts a date with an ISO suffix (`2026-04-23T00:00:00.000Z`) — the same format JSON sometimes sends.
 */
export function zonedWallClockToUtcMs(dateStr: string, timeStr: string, timeZone: string): number | null {
  const dateOnly = normalizeDbEventDateString(dateStr);
  if (!dateOnly) return null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!dm) return null;
  const wantY = Number(dm[1]);
  const wantM = Number(dm[2]);
  const wantD = Number(dm[3]);
  if (!Number.isFinite(wantY) || !Number.isFinite(wantM) || !Number.isFinite(wantD)) return null;
  if (!isValidCivilDateUtc(wantY, wantM, wantD)) return null;

  const tm = normalizeDbEventTimeString(timeStr);
  const wantH = parseInt(tm.slice(0, 2), 10);
  const wantMin = parseInt(tm.slice(3, 5), 10);
  if (!Number.isFinite(wantH) || !Number.isFinite(wantMin)) return null;

  /** Noon UTC on the civil day avoids anchoring the window to UTC midnight only. ±72h covers DST and time zones. */
  const mid = Date.UTC(wantY, wantM - 1, wantD, 12, 0, 0, 0);
  const lo = mid - 72 * 3600 * 1000;
  const hi = mid + 72 * 3600 * 1000;
  for (let t = lo; t <= hi; t += 60 * 1000) {
    if (matchesZonedWallClock(t, wantY, wantM, wantD, wantH, wantMin, timeZone)) {
      return t;
    }
  }
  return null;
}

/** Same time zone as the club calendar in the app (`APP_SCHEDULE_TIMEZONE`). */
export function eventScheduleStartUtcMs(dateStr: string, timeStr: string): number | null {
  return zonedWallClockToUtcMs(dateStr, timeStr, APP_SCHEDULE_TIMEZONE);
}

/** Today's `YYYY-MM-DD` in the club time zone (not the server TZ). */
export function todayYmdInAppTz(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_SCHEDULE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
