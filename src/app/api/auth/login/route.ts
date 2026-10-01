import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  formatSessionCookieValue,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import {
  EMAIL_NOT_VERIFIED,
  INVALID_CREDENTIALS,
  authenticateWithNeonAuth,
  isEmailAlreadyVerified,
  resendNeonAuthVerification,
} from "@/server/padellab/neon-auth-sync";
import { clubLoginBlockedMessage } from "@/server/padellab/club-access";
import {
  lookupUserByNeonAuthId,
  lookupUserForLogin,
  type ClubUserLookup,
} from "@/server/padellab/club-user-lookup";
import { isValidAppEmail, EMAIL_API_MESSAGE } from "@/lib/email-format";
import { hasCoachPrivileges } from "@/lib/role-utils";
import { publicApiErrorMessage, rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import {
  TWO_FACTOR_PENDING_COOKIE,
  formatPendingTwoFactorCookie,
  pendingTwoFactorCookieOptions,
  twoFactorIsEnabled,
} from "@/server/padellab/two-factor";
import {
  TEMP_PASSWORD_PENDING_COOKIE,
  TEMP_EMAIL_OK_COOKIE,
  formatPendingTempPasswordCookie,
  pendingTempPasswordCookieOptions,
} from "@/server/padellab/temp-password";
import { verifyPassword } from "@/server/padellab/password";

function passwordCandidates(password: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [password, password.replaceAll("+", ""), password.replaceAll("+", " "), password.replaceAll(" ", "+")]) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

function credentialsFail() {
  return NextResponse.json({ ok: false, message: INVALID_CREDENTIALS });
}

async function clubPasswordMatches(
  sql: ReturnType<typeof getSql>,
  userId: string,
  password: string,
): Promise<boolean> {
  const rows = (await sql`
    SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1
  `) as { password_hash: string }[];
  const hash = rows[0]?.password_hash;
  if (!hash) return false;
  return verifyPassword(password, hash);
}

function finishClubLogin(
  u: ClubUserLookup,
  extra: {
    needsTwoFactor?: boolean;
    mustChangePassword?: boolean;
    needsEmailOtp?: boolean;
    pendingTwoFactorToken?: string;
  },
) {
  if (extra.mustChangePassword) {
    const pending = formatPendingTempPasswordCookie(u.id, u.session_version);
    const needsEmailOtp = extra.needsEmailOtp !== false;
    const res = NextResponse.json({ ok: true, mustChangePassword: true, needsEmailOtp });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
    res.cookies.set(TEMP_PASSWORD_PENDING_COOKIE, pending, pendingTempPasswordCookieOptions());
    if (needsEmailOtp) {
      res.cookies.set(TEMP_EMAIL_OK_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
    } else {
      res.cookies.set(TEMP_EMAIL_OK_COOKIE, pending, pendingTempPasswordCookieOptions());
    }
    res.cookies.set(TWO_FACTOR_PENDING_COOKIE, "", { ...pendingTwoFactorCookieOptions(), maxAge: 0 });
    return res;
  }
  if (extra.needsTwoFactor && extra.pendingTwoFactorToken) {
    const res = NextResponse.json({
      ok: true,
      needsTwoFactor: true,
      pendingTwoFactorToken: extra.pendingTwoFactorToken,
    });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
    res.cookies.set(TEMP_PASSWORD_PENDING_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
    res.cookies.set(TEMP_EMAIL_OK_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
    res.cookies.set(TWO_FACTOR_PENDING_COOKIE, extra.pendingTwoFactorToken, pendingTwoFactorCookieOptions());
    return res;
  }
  const sessionToken = formatSessionCookieValue(u.id, u.session_version);
  const res = NextResponse.json({ ok: true, role: u.role, sessionToken });
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
  res.cookies.set(TEMP_PASSWORD_PENDING_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
  res.cookies.set(TEMP_EMAIL_OK_COOKIE, "", { ...pendingTempPasswordCookieOptions(), maxAge: 0 });
  res.cookies.set(TWO_FACTOR_PENDING_COOKIE, "", { ...pendingTwoFactorCookieOptions(), maxAge: 0 });
  return res;
}

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
    const club = await lookupUserForLogin(sql, email);
    const staff = Boolean(club && hasCoachPrivileges(club.role));
    const candidates = staff ? passwordCandidates(password) : [password];

    let neon: Awaited<ReturnType<typeof authenticateWithNeonAuth>> | null = null;
    for (const candidate of candidates) {
      neon = await authenticateWithNeonAuth({
        email,
        password: candidate,
        allowUnverified: staff,
      });
      if (neon.ok) break;
      if (neon.message === EMAIL_NOT_VERIFIED) {
        return NextResponse.json({ ok: false, message: EMAIL_NOT_VERIFIED });
      }
    }
    if (!neon) return credentialsFail();

    let u: ClubUserLookup | null = null;
    if (neon.ok) {
      u = await lookupUserByNeonAuthId(sql, neon.userId);
      if (!u && club) u = club;
    } else if (club && staff) {
      for (const candidate of candidates) {
        if (await clubPasswordMatches(sql, club.id, candidate)) {
          u = club;
          break;
        }
      }
    }
    if (!u) {
      return credentialsFail();
    }

    const blocked = clubLoginBlockedMessage(u);
    if (blocked) {
      return NextResponse.json({ ok: false, message: blocked });
    }

    if (u.must_change_password) {
      let needsEmailOtp = true;
      const sent = await resendNeonAuthVerification(u.email);
      if (!sent.ok && isEmailAlreadyVerified(sent.message)) {
        needsEmailOtp = false;
      }
      return finishClubLogin(u, { mustChangePassword: true, needsEmailOtp });
    }

    const needsTwoFactor = await twoFactorIsEnabled(sql, u.id);
    if (needsTwoFactor) {
      const pendingTwoFactorToken = formatPendingTwoFactorCookie(u.id, u.session_version);
      return finishClubLogin(u, { needsTwoFactor: true, pendingTwoFactorToken });
    }

    return finishClubLogin(u, {});
  } catch (e) {
    const message = publicApiErrorMessage(e, "Serviço temporariamente indisponível.");
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
