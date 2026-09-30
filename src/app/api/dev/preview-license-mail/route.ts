import { NextRequest, NextResponse } from "next/server";
import {
  sendStaffLicenseExpiringEmail,
  sendStudentLicenseExpiringEmail,
} from "@/server/padellab/license-expiring-mail";
import { sendStudentWelcomeEmail } from "@/server/padellab/student-welcome-mail";
import { isSmtpConfigured } from "@/server/padellab/smtp-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const to = req.nextUrl.searchParams.get("to")?.trim().toLowerCase() ?? "";
  if (!to.includes("@")) {
    return NextResponse.json({ ok: false, message: "Passa ?to=teu@email.com" }, { status: 400 });
  }
  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { ok: false, message: "SMTP não enviou. Confirma SMTP_* no .env.local e reinicia o npm run dev." },
      { status: 503 },
    );
  }

  const expirationDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const startDate = new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString();
  const locale = req.nextUrl.searchParams.get("locale") ?? "es";
  const kind = req.nextUrl.searchParams.get("kind")?.trim().toLowerCase() ?? "";

  if (kind === "welcome") {
    await sendStudentWelcomeEmail({
      to,
      name: "Moraci",
      locale,
    });
    return NextResponse.json({
      ok: true,
      to,
      locale,
      kind: "welcome",
      hint: "Revisa la bandeja (y spam): deberías ver el correo de bienvenida.",
    });
  }

  await sendStudentLicenseExpiringEmail({
    to,
    studentName: "Moraci",
    startDate,
    expirationDate,
    locale,
  });
  await sendStaffLicenseExpiringEmail({
    to,
    teacherName: "Moraci",
    studentName: "Moraci Rodrigues",
    startDate,
    expirationDate,
    locale,
  });

  return NextResponse.json({
    ok: true,
    to,
    locale,
    hint: "Revisa la bandeja (y spam): deberías ver el aviso del alumno y el del superadmin.",
  });
}
