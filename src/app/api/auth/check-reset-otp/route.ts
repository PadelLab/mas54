import { NextRequest, NextResponse } from "next/server";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { checkNeonAuthResetOtp } from "@/server/padellab/neon-auth-sync";
import { lookupUserForLogin } from "@/server/padellab/club-user-lookup";
import { publicApiErrorMessage, rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import { refreshSessionCookieForRequestUser } from "@/server/padellab/session-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "check-reset-otp", 10, 15 * 60_000);
  if (limited) return limited;
  try {
    const body = (await req.json()) as { email?: string; otp?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const otp = String(body.otp ?? "").replace(/\s/g, "");
    if (!email || !otp) {
      return NextResponse.json({ ok: false, message: "INVALID_CODE" });
    }

    const sql = getSql();
    await bootstrapDatabase(sql);
    const found = await withAppSql({}, (appSql) => lookupUserForLogin(appSql, email));
    if (!found) {
      return NextResponse.json({ ok: false, message: "INVALID_CODE" });
    }

    const neon = await checkNeonAuthResetOtp({ email, otp });
    if (!neon.ok) {
      return NextResponse.json({ ok: false, message: neon.message });
    }

    const sessionToken = refreshSessionCookieForRequestUser(req, found);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    if (sessionToken) {
      res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    }
    return res;
  } catch (e) {
    const message = publicApiErrorMessage(e, "SERVER");
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
