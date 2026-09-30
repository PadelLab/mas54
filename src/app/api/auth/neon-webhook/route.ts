import { NextRequest, NextResponse } from "next/server";
import {
  verifyNeonAuthWebhook,
} from "@/server/padellab/neon-auth-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Neon Auth may still call this if a webhook is left enabled. Codes are issued in-app, not here. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    await verifyNeonAuthWebhook(rawBody, req.headers);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.warn("[neon-auth-webhook] verify failed:", detail);
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
