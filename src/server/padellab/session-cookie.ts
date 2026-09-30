import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "padellab_session";

export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Internal payload (before HMAC signature): `{userId}|{sessionVersion}`. */
const SESSION_COOKIE_SEP = "|";

export function sessionCookieSecret(): string {
  const secret =
    process.env.SESSION_COOKIE_SECRET?.trim() ||
    process.env.NEON_AUTH_COOKIE_SECRET?.trim() ||
    process.env.CALENDAR_FEED_SECRET?.trim() ||
    "";
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_COOKIE_SECRET ou NEON_AUTH_COOKIE_SECRET é obrigatório.");
  }
  return process.env.DATABASE_URL?.trim() || "padellab-dev-session";
}

function hmacB64(payload: string): string {
  return createHmac("sha256", sessionCookieSecret()).update(payload).digest("base64url");
}

function signaturesMatch(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signed cookie: `{base64url(userId|version)}.{hmac}`. Unsigned cookies are rejected. */
export function formatSessionCookieValue(userId: string, sessionVersion: number): string {
  const payload = Buffer.from(`${userId}${SESSION_COOKIE_SEP}${sessionVersion}`, "utf8").toString("base64url");
  return `${payload}.${hmacB64(payload)}`;
}

export function parseSessionCookieValue(
  raw: string | null | undefined,
): { userId: string; version: number | null } | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const dot = t.lastIndexOf(".");
  if (dot <= 0 || dot === t.length - 1) return null;
  const payload = t.slice(0, dot);
  const sig = t.slice(dot + 1);
  if (!payload || !sig || !signaturesMatch(sig, hmacB64(payload))) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const idx = decoded.lastIndexOf(SESSION_COOKIE_SEP);
  if (idx <= 0) return null;
  const userId = decoded.slice(0, idx).trim();
  const verStr = decoded.slice(idx + 1).trim();
  if (!userId || !verStr) return null;
  const v = Number.parseInt(verStr, 10);
  if (!Number.isFinite(v) || v < 0) return null;
  return { userId, version: v };
}

/** Legacy cookie (no version) is accepted only when the account is still at version 0. */
export function isSessionCookieValid(cookieVersion: number | null, dbSessionVersion: number): boolean {
  if (cookieVersion === null) return dbSessionVersion === 0;
  return cookieVersion === dbSessionVersion;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    path: "/" as const,
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Clear the session cookie: same flags as `sessionCookieOptions`, or the browser may ignore it. */
export function clearSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  };
}
