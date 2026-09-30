import "server-only";
import { addMonths } from "@/lib/utils";
import { brandedLogoAttachments, escapeMailHtml, wrapBrandedMailHtml } from "./branded-mail";
import { getSql } from "./neon-client";
import { mailHtmlLang, mailIntlLocale, mailT } from "@/server/i18n/mail-i18n";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

function formatLicenseDate(iso: string, locale?: string | null): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(mailIntlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Panama",
  }).format(d);
}

function licenseStartIso(endIso: string, startIso?: string | null): string {
  const explicit = startIso?.trim();
  if (explicit) {
    const d = new Date(explicit);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return addMonths(endIso, -3);
}

function dateRowsHtml(input: {
  startLabel: string;
  endLabel: string;
  startDate: string;
  endDate: string;
}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:12px;margin-bottom:18px;">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${escapeMailHtml(input.startLabel)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#111827;text-align:right;">${escapeMailHtml(input.startDate)}</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;font-size:14px;color:#6b7280;">${escapeMailHtml(input.endLabel)}</td>
          <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${escapeMailHtml(input.endDate)}</td>
        </tr>
      </table>`;
}

function signoffHtml(signoff: string, team: string): string {
  return `<div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-top:8px;">
    ${escapeMailHtml(signoff)}<br />
    <strong>${escapeMailHtml(team)}</strong>
  </div>`;
}

async function sendBranded(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  log: string;
}): Promise<void> {
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) return;
  if (!isSmtpConfigured()) {
    console.warn(`[${input.log}] SMTP not configured`);
    return;
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: brandedLogoAttachments(),
    });
    console.log(`[${input.log}] sent to ${to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[${input.log}] SMTP send failed:`, detail);
  }
}

export async function sendStudentLicenseExpiringEmail(input: {
  to: string;
  studentName?: string | null;
  startDate?: string | null;
  expirationDate: string;
  locale?: string | null;
}): Promise<void> {
  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const studentName = input.studentName?.trim() || "";
  const startDate = formatLicenseDate(licenseStartIso(input.expirationDate, input.startDate), input.locale);
  const endDate = formatLicenseDate(input.expirationDate, input.locale);
  const greeting = studentName
    ? t("licenseExpiringStudent.greeting", { studentName })
    : t("licenseExpiringStudent.greetingNoName");
  const heading = t("licenseExpiringStudent.heading");
  const intro = t("licenseExpiringStudent.intro", { startDate, endDate });
  const action = t("licenseExpiringStudent.action");
  const ignore = t("licenseExpiringStudent.ignore");
  const signoff = t("licenseExpiringStudent.signoff");
  const team = t("licenseExpiringStudent.team");
  const startLabel = t("licenseExpiringStudent.startLabel");
  const endLabel = t("licenseExpiringStudent.endLabel");
  const subject = t("licenseExpiringStudent.subject");
  const reason = t("licenseExpiringStudent.reason");

  const text = `${greeting}

${intro}

${startLabel}: ${startDate}
${endLabel}: ${endDate}

${action}

${ignore}

${signoff}
${team}`;

  const html = wrapBrandedMailHtml({
    lang,
    heading: escapeMailHtml(heading),
    sub: "",
    reason: escapeMailHtml(reason),
    bodyHtml: `
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding:4px 0 16px;">
        ${escapeMailHtml(greeting)}
      </div>
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-bottom:16px;">
        ${escapeMailHtml(intro)}
      </div>
      ${dateRowsHtml({ startLabel, endLabel, startDate, endDate })}
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-bottom:12px;">
        ${escapeMailHtml(action)}
      </div>
      <div style="font-size:15px;line-height:1.6;color:#6b7280;text-align:left;padding-bottom:8px;">
        ${escapeMailHtml(ignore)}
      </div>
      ${signoffHtml(signoff, team)}
    `,
  });

  await sendBranded({ to: input.to, subject, text, html, log: "license-expiring-student-mail" });
}

export async function sendStaffLicenseExpiringEmail(input: {
  to: string;
  teacherName?: string | null;
  studentName: string;
  startDate?: string | null;
  expirationDate: string;
  locale?: string | null;
}): Promise<void> {
  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const teacherName = input.teacherName?.trim() || "";
  const studentName = input.studentName.trim() || t("licenseExpiringStaff.studentFallback");
  const startDate = formatLicenseDate(licenseStartIso(input.expirationDate, input.startDate), input.locale);
  const endDate = formatLicenseDate(input.expirationDate, input.locale);
  const greeting = teacherName
    ? t("licenseExpiringStaff.greeting", { teacherName })
    : t("licenseExpiringStaff.greetingNoName");
  const heading = t("licenseExpiringStaff.heading");
  const intro = t("licenseExpiringStaff.intro", { studentName, startDate, endDate });
  const action = t("licenseExpiringStaff.action");
  const ignore = t("licenseExpiringStaff.ignore");
  const signoff = t("licenseExpiringStaff.signoff");
  const team = t("licenseExpiringStaff.team");
  const startLabel = t("licenseExpiringStaff.startLabel");
  const endLabel = t("licenseExpiringStaff.endLabel");
  const studentLabel = t("licenseExpiringStaff.studentLabel");
  const subject = t("licenseExpiringStaff.subject");
  const reason = t("licenseExpiringStaff.reason");

  const text = `${greeting}

${intro}

${studentLabel}: ${studentName}
${startLabel}: ${startDate}
${endLabel}: ${endDate}

${action}

${ignore}

${signoff}
${team}`;

  const html = wrapBrandedMailHtml({
    lang,
    heading: escapeMailHtml(heading),
    sub: "",
    reason: escapeMailHtml(reason),
    bodyHtml: `
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding:4px 0 16px;">
        ${escapeMailHtml(greeting)}
      </div>
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-bottom:16px;">
        ${escapeMailHtml(intro)}
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:12px;margin-bottom:18px;">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${escapeMailHtml(studentLabel)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#111827;text-align:right;">${escapeMailHtml(studentName)}</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${escapeMailHtml(startLabel)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#111827;text-align:right;">${escapeMailHtml(startDate)}</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;font-size:14px;color:#6b7280;">${escapeMailHtml(endLabel)}</td>
          <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#111827;text-align:right;">${escapeMailHtml(endDate)}</td>
        </tr>
      </table>
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-bottom:12px;">
        ${escapeMailHtml(action)}
      </div>
      <div style="font-size:15px;line-height:1.6;color:#6b7280;text-align:left;padding-bottom:8px;">
        ${escapeMailHtml(ignore)}
      </div>
      ${signoffHtml(signoff, team)}
    `,
  });

  await sendBranded({ to: input.to, subject, text, html, log: "license-expiring-staff-mail" });
}

/** Sends the student notice and a copy to every active superadmin. */
export async function notifyLicenseExpiring(input: {
  studentEmail: string;
  studentName?: string | null;
  studentLocale?: string | null;
  startDate?: string | null;
  expirationDate: string;
}): Promise<void> {
  const studentName = input.studentName?.trim() || "";
  await sendStudentLicenseExpiringEmail({
    to: input.studentEmail,
    studentName,
    startDate: input.startDate,
    expirationDate: input.expirationDate,
    locale: input.studentLocale,
  });

  try {
    const sql = getSql();
    const staff = (await sql`
      SELECT email, name, preferred_language
      FROM users
      WHERE role = 'superadmin'
        AND status = 'active'
        AND email IS NOT NULL
        AND btrim(email) <> ''
    `) as { email: string; name: string | null; preferred_language: string | null }[];

    await Promise.all(
      staff.map((row) =>
        sendStaffLicenseExpiringEmail({
          to: row.email,
          teacherName: row.name,
          studentName: studentName || input.studentEmail,
          startDate: input.startDate,
          expirationDate: input.expirationDate,
          locale: row.preferred_language,
        }),
      ),
    );
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[license-expiring-mail] failed to notify superadmins:", detail);
  }
}

function expirationIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** One reminder per expiration date, in the last 7 days before it lapses. */
export async function sendDueLicenseExpiringNotices(): Promise<void> {
  if (!isSmtpConfigured()) return;

  const sql = getSql();
  const due = (await sql`
    UPDATE users
    SET license_reminder_sent_for = access_expires_at
    WHERE id IN (
      SELECT id
      FROM users
      WHERE role = 'student'
        AND status = 'active'
        AND email IS NOT NULL
        AND btrim(email) <> ''
        AND access_expires_at IS NOT NULL
        AND access_expires_at > NOW()
        AND access_expires_at <= NOW() + INTERVAL '7 days'
        AND (
          license_reminder_sent_for IS NULL
          OR license_reminder_sent_for IS DISTINCT FROM access_expires_at
        )
      ORDER BY access_expires_at
      LIMIT 25
    )
    RETURNING id, email, name, preferred_language, access_expires_at
  `) as {
    id: string;
    email: string;
    name: string | null;
    preferred_language: string | null;
    access_expires_at: string | Date;
  }[];

  for (const row of due) {
    try {
      await notifyLicenseExpiring({
        studentEmail: row.email,
        studentName: row.name,
        studentLocale: row.preferred_language,
        startDate: addMonths(expirationIso(row.access_expires_at), -3),
        expirationDate: expirationIso(row.access_expires_at),
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error(`[license-expiring-mail] notify failed for ${row.id}:`, detail);
    }
  }
}
