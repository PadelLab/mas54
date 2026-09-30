import "server-only";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, parseSessionCookieValue } from "./session-cookie";

/** Session HMAC token in the `Authorization: Bearer …` header (mobile / API clients). */
export function readBearerSessionToken(req: NextRequest): string | null {
  const raw = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(raw);
  const token = match?.[1]?.trim() ?? "";
  if (!token || !parseSessionCookieValue(token)) return null;
  return token;
}

/** Browser (cookie) or app (Bearer). Bearer takes priority. */
export function requestSessionToken(req: NextRequest): string | null {
  return readBearerSessionToken(req) ?? req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}
