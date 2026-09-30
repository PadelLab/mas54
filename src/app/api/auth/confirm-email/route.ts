import { NextRequest, NextResponse } from "next/server";
import { clubLoginBlockedMessage } from "@/server/padellab/club-access";
import { lookupUserForLogin } from "@/server/padellab/club-user-lookup";
import { getSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import {
  SESSION_COOKIE_NAME,
  formatSessionCookieValue,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import { verifyNeonAuthEmailOtp } from "@/server/padellab/neon-auth-sync";
import { publicApiErrorMessage, rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "confirm-email", 10, 15 * 60_000);
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
    const u = await lookupUserForLogin(sql, email);
    if (!u) {
      return NextResponse.json({ ok: false, message: "INVALID_CODE" });
    }

    const neon = await verifyNeonAuthEmailOtp({ email: u.email, otp });
    if (!neon.ok) {
      return NextResponse.json({ ok: false, message: neon.message });
    }

    const blocked = clubLoginBlockedMessage(u);
    if (blocked) {
      return NextResponse.json({ ok: false, message: blocked });
    }

    const sessionToken = formatSessionCookieValue(u.id, u.session_version);
    const res = NextResponse.json({ ok: true, role: u.role, sessionToken });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    return res;
  } catch (e) {
    const message = publicApiErrorMessage(e, "Erro ao verificar o e-mail.");
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
