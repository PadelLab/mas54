import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, clearSessionCookieOptions } from "@/server/padellab/session-cookie";
import { signOutNeonAuth } from "@/server/padellab/neon-auth-sync";
import { rejectUntrustedOrigin } from "@/server/padellab/request-guard";

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  await signOutNeonAuth();
  const res = NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
  return res;
}
