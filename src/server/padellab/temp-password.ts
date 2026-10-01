import "server-only";
import type { NextResponse } from "next/server";
import {
  formatPendingTwoFactorCookie,
  parsePendingTwoFactorCookie,
  pendingTwoFactorCookieOptions,
} from "./two-factor";

export const TEMP_PASSWORD_PENDING_COOKIE = "padellab_pw_pending";
export const TEMP_EMAIL_OK_COOKIE = "padellab_temp_mail_ok";

export function formatPendingTempPasswordCookie(userId: string, sessionVersion: number): string {
  return formatPendingTwoFactorCookie(userId, sessionVersion);
}

export function parsePendingTempPasswordCookie(raw: string | null | undefined) {
  return parsePendingTwoFactorCookie(raw);
}

export function pendingTempPasswordCookieOptions() {
  return pendingTwoFactorCookieOptions();
}

export function clearPendingTempPasswordCookie(res: NextResponse) {
  res.cookies.set(TEMP_PASSWORD_PENDING_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
  res.cookies.set(TEMP_EMAIL_OK_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
}
