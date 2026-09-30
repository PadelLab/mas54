import { NextRequest, NextResponse } from "next/server";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { isSessionCookieValid, parseSessionCookieValue } from "@/server/padellab/session-cookie";
import { rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import { requestSessionToken } from "@/server/padellab/request-session";
import { disableTwoFactor } from "@/server/padellab/two-factor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "2fa-disable", 8, 15 * 60_000);
  if (limited) return limited;

  const raw = requestSessionToken(req);
  const parsed = parseSessionCookieValue(raw);
  if (!parsed) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  try {
    await bootstrapDatabase(getSql());

    const row = await withAppSql({ sessionCookie: raw }, async (appSql) => {
      const rows = (await appSql`
        SELECT id, COALESCE(session_version, 0)::int AS session_version
        FROM users WHERE id = ${parsed.userId} LIMIT 1
      `) as { id: string; session_version: number }[];
      return rows[0] ?? null;
    });
    if (!row || !isSessionCookieValid(parsed.version, row.session_version)) {
      return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
    }

    await withAppSql({ sessionCookie: raw }, (appSql) => disableTwoFactor(appSql, row.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "SERVER" }, { status: 500 });
  }
}
