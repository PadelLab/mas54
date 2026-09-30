import { NextRequest, NextResponse } from "next/server";
import { calendarSubscribeUrls } from "@/server/padellab/calendar-feed";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { isSessionCookieValid, parseSessionCookieValue } from "@/server/padellab/session-cookie";
import { rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import { requestSessionToken } from "@/server/padellab/request-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const sid = requestSessionToken(req);
  const parsed = parseSessionCookieValue(sid);
  if (!parsed) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const sql = getSql();
  await bootstrapDatabase(sql);
  const row = await withAppSql({ sessionCookie: sid }, async (appSql) => {
    const rows = (await appSql`
      SELECT id, COALESCE(session_version, 0)::int AS session_version
      FROM users WHERE id = ${parsed.userId} LIMIT 1
    `) as { id: string; session_version: number }[];
    const found = rows[0];
    if (!found || !isSessionCookieValid(parsed.version, found.session_version)) {
      return null;
    }
    await appSql`UPDATE users SET calendar_feed_enabled = true WHERE id = ${found.id}`;
    return found;
  });
  if (!row) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...calendarSubscribeUrls(row.id) });
}
