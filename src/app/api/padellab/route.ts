import { NextRequest, NextResponse } from "next/server";
import { getSql, withAppSql } from "@/server/padellab/neon-client";

export const dynamic = "force-dynamic";
import { handlePadellabMutation } from "@/server/padellab/mutations";
import { emptyAppState, loadAppState } from "@/server/padellab/read-state";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import {
  publicApiErrorMessage,
  rejectIfRateLimited,
  rejectUntrustedOrigin,
} from "@/server/padellab/request-guard";
import { requestSessionToken } from "@/server/padellab/request-session";
import {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  parseSessionCookieValue,
  sessionCookieOptions,
} from "@/server/padellab/session-cookie";

export async function GET(req: NextRequest) {
  try {
    const sid = requestSessionToken(req);
    const parsed = parseSessionCookieValue(sid);
    if (!parsed) {
      const res = NextResponse.json(emptyAppState());
      res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
      if (sid) res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
      return res;
    }
    const sql = getSql();
    await bootstrapDatabase(sql);
    const { payload, clearSessionCookie } = await withAppSql({ sessionCookie: sid }, (appSql) =>
      loadAppState(appSql, sid),
    );
    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    if (clearSessionCookie) {
      res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
    }
    return res;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/padellab]", e);
    }
    const message = publicApiErrorMessage(e, "Serviço temporariamente indisponível.");
    return NextResponse.json(
      {
        error: message,
        user: null,
        users: [],
        courts: [],
        events: [],
        eventSignups: [],
        lessons: [],
        evaluations: [],
        lessonActivityCatalog: { categories: [], activities: [] },
      },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  try {
    const sql = getSql();
    await bootstrapDatabase(sql);
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "register_student" || action === "register_professor" || action === "register_coach") {
      const limited = rejectIfRateLimited(req, `register:${action}`, 5, 15 * 60_000);
      if (limited) return limited;
    }
    const sid = requestSessionToken(req);
    const result = await withAppSql({ sessionCookie: sid }, (appSql) =>
      handlePadellabMutation(appSql, body, sid ?? undefined),
    );
    const sessionToken = result.clearSessionCookie ? null : result.setCookieUserId ?? null;
    const res = NextResponse.json({
      ok: result.ok,
      message: result.message,
      id: result.id,
      needsEmailVerification: result.needsEmailVerification,
      emailSent: result.emailSent,
      tempPassword: result.tempPassword,
      ...(sessionToken ? { sessionToken } : {}),
    });
    if (sessionToken) {
      res.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
    }
    if (result.clearSessionCookie) {
      res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
    }
    return res;
  } catch (e) {
    const message = publicApiErrorMessage(e, "Serviço temporariamente indisponível.");
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
