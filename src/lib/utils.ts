import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseScheduleDate } from "./schedule-date";
import type { UserRole, AccountStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared size for page titles (h1 / main heading). */
export const pageTitleClass = "font-display text-2xl font-bold leading-tight tracking-tight";

/** Avoid showing `Namespace.key` when the key is not yet in the loaded catalog. */
export function tSafe(
  t: ((key: string) => string) & { has?: (key: string) => boolean },
  key: string,
  fallbackKey: string,
): string {
  if (t.has?.(key)) return t(key);
  const value = t(key);
  if (value === key || value.endsWith(`.${key}`)) return t(fallbackKey);
  return value;
}

/** Address or venue note — avoid showing trivial UI text (e.g. "nb", "x"). */
export function isSubstantialVenueText(value: string | undefined, minLength = 5): boolean {
  const s = value?.trim() ?? "";
  return s.length >= minLength;
}

/** Highlight the nav item whose href most specifically matches the pathname (avoids `/admin` active on `/admin/users`). */
export function longestNavHrefMatch(pathname: string, navHrefs: readonly string[]): string | undefined {
  const matches = navHrefs.filter((h) => pathname === h || pathname.startsWith(`${h}/`));
  if (matches.length === 0) return undefined;
  return matches.reduce((a, b) => (a.length >= b.length ? a : b));
}

/** Format a short date aligned with the app language (`Intl`, e.g. `es-ES` / `en-US`). */
export function formatDate(iso: string, intlLocale: string) {
  const d = parseScheduleDate(iso);
  const dt =
    d ??
    (() => {
      const x = new Date(iso);
      return Number.isNaN(x.getTime()) ? null : x;
    })();
  if (!dt) return "—";
  return dt.toLocaleDateString(intlLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function isAccessExpired(user: {
  role: UserRole;
  status: AccountStatus;
  accessExpiresAt?: string;
}): boolean {
  if (user.status === "deactivated" || user.status === "expired") return true;
  if (user.role === "superadmin" || user.role === "coach" || user.role === "coach_admin") {
    return false;
  }
  if (!user.accessExpiresAt) return false;
  return new Date(user.accessExpiresAt) < new Date();
}
