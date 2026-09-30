import { NextRequest, NextResponse } from "next/server";
import { sendAuthOtpEmail, type AuthMailKind } from "@/server/padellab/auth-mail";
import { smtpFrom } from "@/server/padellab/smtp-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<AuthMailKind>(["emailVerification", "signIn", "forgetPassword"]);

function mailboxFromFromHeader(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  const angled = v.match(/<([^>]+@[^>]+)>/);
  if (angled?.[1]) return angled[1].trim().toLowerCase();
  if (v.includes("@")) return v.toLowerCase();
  return null;
}

export async function GET(req: NextRequest) {
  return sendPreview(req);
}

export async function POST(req: NextRequest) {
  return sendPreview(req);
}

async function sendPreview(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = req.nextUrl;
  const kindRaw = url.searchParams.get("kind") ?? "emailVerification";
  const kind: AuthMailKind = KINDS.has(kindRaw as AuthMailKind)
    ? (kindRaw as AuthMailKind)
    : "emailVerification";
  const locale = url.searchParams.get("locale") ?? "es";
  const to =
    url.searchParams.get("to")?.trim().toLowerCase() ||
    mailboxFromFromHeader(smtpFrom()) ||
    process.env.SMTP_USER?.trim().toLowerCase() ||
    "";

  if (!to.includes("@")) {
    return NextResponse.json(
      { ok: false, message: "Passa ?to=teu@email.com ou configura SMTP_FROM / SMTP_USER." },
      { status: 400 },
    );
  }

  const sent = await sendAuthOtpEmail({
    to,
    code: "482917",
    kind,
    locale,
  });

  if (!sent) {
    return NextResponse.json(
      { ok: false, message: "SMTP não enviou. Confirma SMTP_* no .env.local e reinicia o npm run dev." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    to,
    kind,
    locale,
    hint: "Abre o Gmail — o código de teste é 482917.",
  });
}
