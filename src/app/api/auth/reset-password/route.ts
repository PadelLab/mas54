import { after, NextRequest, NextResponse } from "next/server";

import { passwordPolicyApiMessage, validateAppPassword } from "@/lib/password-policy";
import { getSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { resetNeonAuthPassword } from "@/server/padellab/neon-auth-sync";
import { bumpSessionVersionByEmail, lookupUserForLogin } from "@/server/padellab/club-user-lookup";
import { refreshSessionCookieForRequestUser } from "@/server/padellab/session-refresh";
import { lookupPasswordResetTokenEmail } from "@/server/padellab/issue-password-reset";
import { sendPasswordChangedEmail } from "@/server/padellab/password-changed-mail";
import {
  SESSION_COOKIE_NAME,
  formatSessionCookieValue,
  parseSessionCookieValue,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import { rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import { requestSessionToken } from "@/server/padellab/request-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "reset-password", 8, 15 * 60_000);
  if (limited) return limited;
  try {
    const body = (await req.json()) as {
      token?: string;
      email?: string;
      otp?: string;
      password?: string;
      revokeOtherSessions?: boolean;
    };
    const token = String(body.token ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const otp = String(body.otp ?? "").replace(/\s/g, "");
    const password = String(body.password ?? "");
    const revokeOtherSessions = Boolean(body.revokeOtherSessions);
    if (!token && !(email && otp)) {
      return NextResponse.json({ ok: false, message: "INVALID" }, { status: 400 });
    }
    const policy = validateAppPassword(password);
    if (!policy.ok) {
      return NextResponse.json(
        { ok: false, message: passwordPolicyApiMessage(policy.code) },
        { status: 400 },
      );
    }

    const neon = await resetNeonAuthPassword({
      token: token || undefined,
      email: email || undefined,
      otp: otp || undefined,
      newPassword: password,
    });
    if (!neon.ok) {
      return NextResponse.json({ ok: false, message: neon.message }, { status: 400 });
    }

    let notifyEmail = email;
    if (!notifyEmail && token) {
      try {
        const sql = getSql();
        await bootstrapDatabase(sql);
        notifyEmail = (await lookupPasswordResetTokenEmail(sql, token)) ?? "";
      } catch (lookupErr) {
        console.warn("[reset-password] could not resolve email for notice", lookupErr);
      }
    }
    if (notifyEmail.includes("@")) {
      try {
        const sql = getSql();
        await bootstrapDatabase(sql);
        await sql`UPDATE users SET must_change_password = false WHERE lower(email) = ${notifyEmail}`;
      } catch (clearErr) {
        console.warn("[reset-password] could not clear must_change_password", clearErr);
      }
      try {
        after(() => {
          void sendPasswordChangedEmail({ to: notifyEmail });
        });
      } catch {
        void sendPasswordChangedEmail({ to: notifyEmail });
      }
    }

    let sessionToken: string | undefined;
    if (email) {
      const sql = getSql();
      await bootstrapDatabase(sql);
      if (revokeOtherSessions) {
        const u = await bumpSessionVersionByEmail(sql, email);
        const parsed = parseSessionCookieValue(requestSessionToken(req));
        if (u && parsed?.userId === u.id) {
          sessionToken = formatSessionCookieValue(u.id, u.session_version);
        }
      } else {
        const found = await lookupUserForLogin(sql, email);
        if (found) {
          sessionToken = refreshSessionCookieForRequestUser(req, found) ?? undefined;
        }
      }
    }

    const res = NextResponse.json({ ok: true, ...(sessionToken ? { sessionToken } : {}) });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    if (sessionToken) {
      res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    }

    return res;
  } catch (e) {
    console.error("[reset-password]", e);
    return NextResponse.json({ ok: false, message: "SERVER" }, { status: 500 });
  }
}
