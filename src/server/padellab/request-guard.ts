import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getPublicAppUrl } from "@/server/padellab/public-app-url";
import { readBearerSessionToken } from "@/server/padellab/request-session";

function originFromUrl(raw: string | undefined | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  try {
    return new URL(v.includes("://") ? v : `https://${v}`).origin;
  } catch {
    return null;
  }
}

function requestHostOrigin(req: NextRequest): string | null {
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host")?.trim() || "";
  if (!host) return null;
  const proto = (
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (process.env.NODE_ENV === "production" ? "https" : "http")
  ).toLowerCase();
  return `${proto}://${host}`;
}

function allowedOrigins(): Set<string> {
  const set = new Set<string>();
  const add = (raw: string | undefined | null) => {
    const o = originFromUrl(raw);
    if (o) set.add(o);
  };
  add(getPublicAppUrl());
  add(process.env.VERCEL_URL);
  if (process.env.NODE_ENV !== "production") {
    add("http://localhost:3000");
    add("http://127.0.0.1:3000");
  }
  return set;
}

/**
 * Accepted requests:
 * - Valid session Bearer (mobile app / API)
 * - Origin/Referer of this site (browser)
 * - No Origin or Referer (native client; modern browsers send Origin on POST)
 */
export function isTrustedBrowserOrigin(req: NextRequest): boolean {
  if (readBearerSessionToken(req)) return true;

  const hostOrigin = requestHostOrigin(req);
  const allow = allowedOrigins();
  if (hostOrigin) allow.add(hostOrigin);

  const origin = req.headers.get("origin")?.trim() || "";
  if (origin) return allow.has(origin);

  const referer = req.headers.get("referer")?.trim() || "";
  const refererOrigin = originFromUrl(referer);
  if (refererOrigin) return allow.has(refererOrigin);

  return true;
}

export function rejectUntrustedOrigin(req: NextRequest): NextResponse | null {
  if (isTrustedBrowserOrigin(req)) return null;
  return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Simple per-instance limit (login / signup / OTP). */
export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now >= cur.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= limit) return false;
  cur.count += 1;
  return true;
}

export function rejectIfRateLimited(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const key = `${bucket}:${clientIp(req)}`;
  if (consumeRateLimit(key, limit, windowMs)) return null;
  return NextResponse.json({ ok: false, message: "Muitas tentativas. Tente mais tarde." }, { status: 429 });
}

export function publicApiErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV === "production") return fallback;
  return error instanceof Error ? error.message : fallback;
}
