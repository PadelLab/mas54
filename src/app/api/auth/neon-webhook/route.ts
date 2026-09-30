import { after, NextRequest, NextResponse } from "next/server";
import {
  authMailKindFromNeon,
  localeForMailbox,
  sendAuthMagicLinkEmail,
  sendAuthOtpEmail,
} from "@/server/padellab/auth-mail";
import {
  verifyNeonAuthWebhook,
  type NeonAuthWebhookPayload,
} from "@/server/padellab/neon-auth-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: NeonAuthWebhookPayload;
  try {
    payload = (await verifyNeonAuthWebhook(rawBody, req.headers)) as NeonAuthWebhookPayload;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.warn("[neon-auth-webhook] verify failed:", detail);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const email = payload.user?.email?.trim().toLowerCase() ?? "";
  const eventType = payload.event_type ?? "";

  if (eventType === "send.otp" || eventType === "send.magic_link") {
    if (!email.includes("@")) {
      return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    }

    if (eventType === "send.otp") {
      const code = payload.event_data?.otp_code?.trim() ?? "";
      if (!code) return NextResponse.json({ ok: false, error: "missing_otp" }, { status: 400 });
      const kind = authMailKindFromNeon(payload.event_data?.otp_type);
      after(() =>
        void deliverAuthMail({
          email,
          kind,
          send: async (locale) => sendAuthOtpEmail({ to: email, code, kind, locale }),
        }),
      );
      return NextResponse.json({ ok: true });
    }

    const url = payload.event_data?.link_url?.trim() ?? "";
    if (!url) return NextResponse.json({ ok: false, error: "missing_link" }, { status: 400 });
    const kind = authMailKindFromNeon(payload.event_data?.link_type);
    after(() =>
      void deliverAuthMail({
        email,
        kind,
        send: async (locale) => sendAuthMagicLinkEmail({ to: email, url, kind, locale }),
      }),
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function deliverAuthMail(input: {
  email: string;
  kind: ReturnType<typeof authMailKindFromNeon>;
  send: (locale: string | null) => Promise<boolean>;
}) {
  try {
    const { shouldSuppressAuthMail } = await import("@/server/padellab/skip-auth-mail");
    if (await shouldSuppressAuthMail(input.email, input.kind)) return;
    const locale = await localeForMailbox(input.email);
    const sent = await input.send(locale);
    if (!sent) console.warn("[neon-auth-webhook] branded mail was not sent", input.kind);
  } catch (err) {
    console.error("[neon-auth-webhook] branded mail failed", err);
  }
}
