import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  formatSessionCookieValue,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import { EMAIL_NOT_VERIFIED, authenticateWithNeonAuth } from "@/server/padellab/neon-auth-sync";
import { clubLoginBlockedMessage } from "@/server/padellab/club-access";
import { lookupUserByNeonAuthId } from "@/server/padellab/club-user-lookup";
import { isValidAppEmail, EMAIL_API_MESSAGE } from "@/lib/email-format";
import { publicApiErrorMessage, rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import {
  TWO_FACTOR_PENDING_COOKIE,
  formatPendingTwoFactorCookie,
  pendingTwoFactorCookieOptions,
  twoFactorIsEnabled,
} from "@/server/padellab/two-factor";
import {
  TEMP_PASSWORD_PENDING_COOKIE,
  pendingTempPasswordCookieOptions,
} from "@/server/padellab/temp-password";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "login", 8, 15 * 60_000);
  if (limited) return limited;
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "E-mail e senha são obrigatórios." });
    }
    if (!isValidAppEmail(email)) {
      return NextResponse.json({ ok: false, message: EMAIL_API_MESSAGE.invalid });
    }

    const sql = getSql();
    await bootstrapDatabase(sql);
    const neon = await authenticateWithNeonAuth({ email, password });
    if (!neon.ok) {
      if (neon.message === EMAIL_NOT_VERIFIED) {
        return NextResponse.json({ ok: false, message: EMAIL_NOT_VERIFIED });
      }
      return NextResponse.json({ ok: false, message: neon.message });
    }

    const u = await lookupUserByNeonAuthId(sql, neon.userId);
    if (!u) {
      return NextResponse.json({ ok: false, message: "E-mail ou senha incorretos." });
    }

    const blocked = clubLoginBlockedMessage(u);
    if (blocked) {
      return NextResponse.json({ ok: false, message: blocked });
    }

    const needsTwoFactor = await twoFactorIsEnabled(sql, u.id);
    if (needsTwoFactor) {
      const pendingTwoFactorToken = formatPendingTwoFactorCookie(u.id, u.session_version);
      const res = NextResponse.json({ ok: true, needsTwoFactor: true, pendingTwoFactorToken });
      res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
      res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
      res.cookies.set(TEMP_PASSWORD_PENDING_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
      res.cookies.set(TWO_FACTOR_PENDING_COOKIE, pendingTwoFactorToken, pendingTwoFactorCookieOptions());
      return res;
    }

    const sessionToken = formatSessionCookieValue(u.id, u.session_version);
    const res = NextResponse.json({ ok: true, role: u.role, sessionToken });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    res.cookies.set(TEMP_PASSWORD_PENDING_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
    res.cookies.set(TWO_FACTOR_PENDING_COOKIE, "", { ...pendingTwoFactorCookieOptions(), maxAge: 0 });
    return res;
  } catch (e) {
    const message = publicApiErrorMessage(e, "Serviço temporariamente indisponível.");
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
