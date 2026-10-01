import { NextRequest, NextResponse } from "next/server";
import { passwordPolicyApiMessage, validateAppPassword } from "@/lib/password-policy";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { authenticateWithNeonAuth, changeNeonAuthPassword } from "@/server/padellab/neon-auth-sync";
import { hashPassword, verifyPassword } from "@/server/padellab/password";
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  formatSessionCookieValue,
  isSessionCookieValid,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import { publicApiErrorMessage, rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import {
  TWO_FACTOR_PENDING_COOKIE,
  formatPendingTwoFactorCookie,
  pendingTwoFactorCookieOptions,
  twoFactorIsEnabled,
} from "@/server/padellab/two-factor";
import {
  TEMP_PASSWORD_PENDING_COOKIE,
  clearPendingTempPasswordCookie,
  parsePendingTempPasswordCookie,
} from "@/server/padellab/temp-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "complete-temp-password", 8, 15 * 60_000);
  if (limited) return limited;
  try {
    const sql = getSql();
    await bootstrapDatabase(sql);
    const pending = parsePendingTempPasswordCookie(req.cookies.get(TEMP_PASSWORD_PENDING_COOKIE)?.value);
    if (!pending) {
      return NextResponse.json({ ok: false, message: "EXPIRED" });
    }

    const body = (await req.json()) as { currentPassword?: string; newPassword?: string };
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, message: "Preencha todos os campos." });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ ok: false, message: "SAME_AS_TEMP" });
    }
    const policy = validateAppPassword(newPassword);
    if (!policy.ok) {
      return NextResponse.json({ ok: false, message: passwordPolicyApiMessage(policy.code) });
    }

    const found = (
      await sql`
        SELECT id, email, role, COALESCE(session_version, 0)::int AS session_version, must_change_password
        FROM users
        WHERE id = ${pending.userId}
        LIMIT 1
      `
    ) as {
      id: string;
      email: string;
      role: string;
      session_version: number;
      must_change_password: boolean;
    }[];
    const u = found[0];
    if (!u || !u.must_change_password || !isSessionCookieValid(pending.sessionVersion, u.session_version)) {
      const res = NextResponse.json({ ok: false, message: "EXPIRED" });
      clearPendingTempPasswordCookie(res);
      return res;
    }

    const hashRows = (await sql`
      SELECT password_hash FROM users WHERE id = ${u.id} LIMIT 1
    `) as { password_hash: string }[];
    const clubHashOk = hashRows[0]?.password_hash
      ? await verifyPassword(currentPassword, hashRows[0].password_hash)
      : false;

    const neonAuth = await authenticateWithNeonAuth({
      email: u.email,
      password: currentPassword,
      allowUnverified: true,
    });
    if (!neonAuth.ok && !clubHashOk) {
      return NextResponse.json({ ok: false, message: neonAuth.message });
    }

    if (neonAuth.ok) {
      const neonChange = await changeNeonAuthPassword({
        currentPassword,
        newPassword,
      });
      if (!neonChange.ok && !clubHashOk) {
        return NextResponse.json({ ok: false, message: neonChange.message });
      }
    }

    const password_hash = await hashPassword(newPassword);
    await sql`
      UPDATE users
      SET password_hash = ${password_hash}, must_change_password = false
      WHERE id = ${u.id}
    `;

    const needsTwoFactor = await withAppSql({}, (appSql) => twoFactorIsEnabled(appSql, u.id));
    if (needsTwoFactor) {
      const pendingTwoFactorToken = formatPendingTwoFactorCookie(u.id, u.session_version);
      const res = NextResponse.json({ ok: true, needsTwoFactor: true, pendingTwoFactorToken });
      res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
      res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
      clearPendingTempPasswordCookie(res);
      res.cookies.set(TWO_FACTOR_PENDING_COOKIE, pendingTwoFactorToken, pendingTwoFactorCookieOptions());
      return res;
    }

    const sessionToken = formatSessionCookieValue(u.id, u.session_version);
    const res = NextResponse.json({ ok: true, role: u.role, sessionToken });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    clearPendingTempPasswordCookie(res);
    return res;
  } catch (e) {
    const message = publicApiErrorMessage(e, "Serviço temporariamente indisponível.");
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
