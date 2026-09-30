import { NextRequest, NextResponse } from "next/server";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import {
  SESSION_COOKIE_NAME,
  formatSessionCookieValue,
  isSessionCookieValid,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";
import { publicApiErrorMessage, rejectIfRateLimited, rejectUntrustedOrigin } from "@/server/padellab/request-guard";
import {
  clearPendingTwoFactorCookie,
  parsePendingTwoFactorCookie,
  requestPendingTwoFactorToken,
  verifyTwoFactorCode,
} from "@/server/padellab/two-factor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  const limited = rejectIfRateLimited(req, "verify-2fa", 10, 15 * 60_000);
  if (limited) return limited;
  try {
    const sql = getSql();
    await bootstrapDatabase(sql);
    const body = (await req.json()) as { code?: string; pendingTwoFactorToken?: string };
    const pending = parsePendingTwoFactorCookie(
      requestPendingTwoFactorToken(req, body.pendingTwoFactorToken),
    );
    if (!pending) {
      return NextResponse.json({ ok: false, message: "EXPIRED" });
    }
    const code = String(body.code ?? "");

    const found = await withAppSql({}, async (appSql) => {
      const rows = (await appSql`
        SELECT id, role, session_version FROM public.two_factor_session_user(${pending.userId})
      `) as { id: string; role: string; session_version: number }[];
      return rows[0] ?? null;
    });

    if (!found || !isSessionCookieValid(pending.sessionVersion, found.session_version)) {
      const res = NextResponse.json({ ok: false, message: "EXPIRED" });
      clearPendingTwoFactorCookie(res);
      return res;
    }

    const ok = await withAppSql({}, (appSql) => verifyTwoFactorCode(appSql, { userId: found.id, code }));
    if (!ok) {
      return NextResponse.json({ ok: false, message: "INVALID_CODE" });
    }

    const sessionToken = formatSessionCookieValue(found.id, found.session_version);
    const res = NextResponse.json({ ok: true, role: found.role, sessionToken });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    clearPendingTwoFactorCookie(res);
    return res;
  } catch (e) {
    const message = publicApiErrorMessage(e, "Serviço temporariamente indisponível.");
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
