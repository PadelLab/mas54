import { NextRequest, NextResponse } from "next/server";

import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { requestNeonAuthPasswordReset } from "@/server/padellab/neon-auth-sync";
import {
  SESSION_COOKIE_NAME,
  isSessionCookieValid,
  parseSessionCookieValue,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import { refreshSessionCookieForRequestUser } from "@/server/padellab/session-refresh";
import { rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import { requestSessionToken } from "@/server/padellab/request-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lastRequestByUserId = new Map<string, number>();
const THROTTLE_MS = 60_000;

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  try {
    const sql = getSql();
    await bootstrapDatabase(sql);

    const raw = requestSessionToken(req);
    const parsed = parseSessionCookieValue(raw);
    if (!parsed) {
      return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
    }

    const row = await withAppSql({ sessionCookie: raw }, async (appSql) => {
      const rows = (await appSql`
        SELECT id, email, COALESCE(session_version, 0)::int AS session_version
        FROM users
        WHERE id = ${parsed.userId}
        LIMIT 1
      `) as { id: string; email: string; session_version: number }[];
      return rows[0] ?? null;
    });
    if (!row || !isSessionCookieValid(parsed.version, row.session_version)) {
      return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
    }

    const now = Date.now();
    const last = lastRequestByUserId.get(row.id);
    if (last && now - last < THROTTLE_MS) {
      return NextResponse.json({ ok: true, throttled: true });
    }
    lastRequestByUserId.set(row.id, now);

    const neon = await requestNeonAuthPasswordReset(row.email);
    if (!neon.ok) {
      return NextResponse.json({ ok: false, message: neon.message }, { status: 503 });
    }

    const sessionToken = refreshSessionCookieForRequestUser(req, row);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    if (sessionToken) {
      res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    }
    return res;
  } catch (e) {
    console.error("[forgot-password-session]", e);
    return NextResponse.json({ ok: false, message: "SERVER" }, { status: 500 });
  }
}
