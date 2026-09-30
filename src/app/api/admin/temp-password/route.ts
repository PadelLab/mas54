import { NextRequest, NextResponse } from "next/server";
import { hasAdminPrivileges, parseUserRole } from "@/lib/role-utils";
import { generateTempAlphanumericPassword } from "@/lib/temp-password";
import { getSql } from "@/server/padellab/neon-client";
import { isSessionCookieValid, parseSessionCookieValue } from "@/server/padellab/session-cookie";
import { rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import { requestSessionToken } from "@/server/padellab/request-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "admin-temp-password", 20, 15 * 60_000);
  if (limited) return limited;

  const raw = requestSessionToken(req);
  const parsed = parseSessionCookieValue(raw);
  if (!parsed) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  try {
    const rows = (await getSql()`
      SELECT role, COALESCE(session_version, 0)::int AS session_version
      FROM users WHERE id = ${parsed.userId} LIMIT 1
    `) as { role: string; session_version: number }[];
    const row = rows[0];
    const role = parseUserRole(row?.role);
    if (!row || !role || !isSessionCookieValid(parsed.version, row.session_version) || !hasAdminPrivileges(role)) {
      return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, tempPassword: generateTempAlphanumericPassword() });
  } catch {
    return NextResponse.json({ ok: false, message: "SERVER" }, { status: 500 });
  }
}
