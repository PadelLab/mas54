import { NextRequest, NextResponse } from "next/server";

import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { requestNeonAuthPasswordReset } from "@/server/padellab/neon-auth-sync";
import { lookupUserForLogin } from "@/server/padellab/club-user-lookup";
import { rejectUntrustedOrigin } from "@/server/padellab/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rate-limits requests for the same address (per server instance). */
const lastRequestByEmail = new Map<string, number>();
const THROTTLE_MS = 60_000;

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  try {
    const body = (await req.json()) as { email?: string };
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const now = Date.now();
    const last = lastRequestByEmail.get(email);
    if (last && now - last < THROTTLE_MS) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const sql = getSql();
    await bootstrapDatabase(sql);

    const user = await withAppSql({}, (appSql) => lookupUserForLogin(appSql, email));

    lastRequestByEmail.set(email, now);

    if (!user) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const neon = await requestNeonAuthPasswordReset(email);
    if (!neon.ok) {
      return NextResponse.json({ ok: false, message: neon.message }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json({ ok: false, message: "SERVER" }, { status: 500 });
  }
}
