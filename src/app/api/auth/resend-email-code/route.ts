import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";
import { issueEmailVerificationCode } from "@/server/padellab/email-verification";
import { lookupUserForLogin } from "@/server/padellab/club-user-lookup";
import { rejectUntrustedOrigin } from "@/server/padellab/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lastRequestByEmail = new Map<string, number>();
const THROTTLE_MS = 45_000;

export async function POST(req: NextRequest) {
  const originBlock = rejectUntrustedOrigin(req);
  if (originBlock) return originBlock;
  try {
    const body = (await req.json()) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    const now = Date.now();
    const last = lastRequestByEmail.get(email);
    if (last && now - last < THROTTLE_MS) {
      return NextResponse.json({ ok: true });
    }

    const sql = getSql();
    await bootstrapDatabase(sql);
    const found = await lookupUserForLogin(sql, email);
    lastRequestByEmail.set(email, now);
    if (!found) {
      return NextResponse.json({ ok: true });
    }

    const verificationCode = await issueEmailVerificationCode({ email });
    return NextResponse.json({ ok: true, verificationCode });
  } catch (e) {
    console.error("[resend-email-code]", e);
    return NextResponse.json({ ok: false, message: "SERVER" }, { status: 500 });
  }
}
