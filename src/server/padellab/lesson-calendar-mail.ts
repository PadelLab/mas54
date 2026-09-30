import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TFunction } from "i18next";
import { CALENDAR_EVENT_LOCATION, buildLessonIcs, type LessonCalendarPerson } from "@/lib/lesson-calendar";
import { NOTIFICATIONS_SETTINGS_PATH } from "@/lib/safe-next-path";
import { formatDaySectionTitle, formatHm12 } from "@/lib/schedule-date";
import { mailHtmlLang, mailIntlLocale, mailT } from "@/server/i18n/mail-i18n";
import { brandedLessonMailAttachments, mailDetailRow, mailFooterSocialHtml } from "./branded-mail";
import { getPublicAppUrl } from "./public-app-url";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

function isLessonMailSendDisabled(): boolean {
  const v = process.env.LESSON_CALENDAR_DISABLE_SEND?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function parseMailbox(raw: string | undefined): LessonCalendarPerson | null {
  const v = raw?.trim();
  if (!v) return null;
  const angled = v.match(/^(.*?)<([^>]+@[^>]+)>\s*$/);
  if (angled) {
    const name = angled[1].replace(/^["']|["']$/g, "").trim() || "+54";
    return { name, email: angled[2].trim() };
  }
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v)) return { name: "+54", email: v };
  return null;
}

function calendarOrganizer(): LessonCalendarPerson {
  return (
    parseMailbox(smtpFrom()) ??
    parseMailbox(process.env.SMTP_USER) ?? { name: "+54", email: "noreply@padellab.local" }
  );
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "invite";
}

async function writeInviteIcsFile(input: { lessonId: string; to: string; ics: string }): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), ".tmp", "calendar");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${safeFilePart(input.lessonId)}-${safeFilePart(input.to)}.ics`);
    await writeFile(file, input.ics, "utf8");
    return file;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[lesson-calendar-mail] could not write ICS file:", detail);
    return null;
  }
}

function logInviteToTerminal(input: {
  to: string;
  counterpartName: string;
  date: string;
  time: string;
  courtLabel: string;
  icsPath: string | null;
  ics: string | null;
}) {
  console.log("\n========== +54 · Calendar invite (.ics) ==========");
  console.log(`To:      ${input.to}`);
  console.log(`With:    ${input.counterpartName}`);
  console.log(`When:    ${input.date} ${input.time}`);
  console.log(`Where:   +54 academia`);
  console.log(`Court:   ${input.courtLabel || "—"}`);
  console.log(`ICS:     ${input.icsPath ?? "(unavailable)"}`);
  if (input.ics) {
    console.log("---------- ICS ----------");
    console.log(input.ics.replace(/\r\n/g, "\n").trimEnd());
    console.log("-------------------------");
  }
  console.log("==================================================\n");
}

export async function sendLessonCalendarInvite(input: {
  to: string;
  attendeeName?: string | null;
  locale?: string | null;
  lessonId: string;
  date: string;
  time: string;
  counterpartName: string;
  counterpartKind?: "coach" | "student";
  ctaPath?: string;
  courtLabel: string;
}): Promise<void> {
  const title = `+54 · ${input.counterpartName}`;
  const description = [
    mailT(input.locale)("lessonConfirmed.icsDescription", { name: input.counterpartName }),
    input.courtLabel,
  ]
    .filter(Boolean)
    .join(" ");
  const organizer = calendarOrganizer();
  const attendee: LessonCalendarPerson = {
    name: input.attendeeName?.trim() || input.to,
    email: input.to.trim(),
  };
  const ics = buildLessonIcs({
    lessonId: input.lessonId,
    date: input.date,
    time: input.time,
    title,
    description,
    location: CALENDAR_EVENT_LOCATION,
    organizer,
    attendee,
  });
  if (!ics) return;

  const icsPath = await writeInviteIcsFile({ lessonId: input.lessonId, to: input.to, ics });
  logInviteToTerminal({
    to: input.to,
    counterpartName: input.counterpartName,
    date: input.date,
    time: input.time,
    courtLabel: input.courtLabel,
    icsPath,
    ics,
  });

  if (isLessonMailSendDisabled()) {
    console.log("[lesson-calendar-mail] SMTP skipped (LESSON_CALENDAR_DISABLE_SEND=1)");
    return;
  }
  if (!isSmtpConfigured()) {
    console.warn("[lesson-calendar-mail] SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM)");
    return;
  }

  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return;

  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const intlLocale = mailIntlLocale(input.locale);
  const dateLabel = formatDaySectionTitle(input.date, intlLocale);
  const timeLabel = formatHm12(input.time);
  const subject = t("lessonConfirmed.subject", { title });
  const text = t("lessonConfirmed.text", {
    name: input.counterpartName,
    date: dateLabel,
    time: timeLabel,
    location: CALENDAR_EVENT_LOCATION,
  });
  const appUrl = getPublicAppUrl();
  const ctaPath = input.ctaPath?.startsWith("/") ? input.ctaPath : "/";
  const html = buildLessonConfirmedHtml({
    t,
    lang,
    counterpartName: input.counterpartName,
    counterpartKind: input.counterpartKind ?? "coach",
    dateLabel,
    timeLabel,
    ctaUrl: `${appUrl}${ctaPath}`,
    unsubscribeUrl: `${appUrl}/login?next=${encodeURIComponent(NOTIFICATIONS_SETTINGS_PATH)}`,
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text,
      html,
      icalEvent: {
        filename: "+54-lesson.ics",
        method: "REQUEST",
        content: ics,
      },
      attachments: brandedLessonMailAttachments(),
    });
    console.log(`[lesson-calendar-mail] sent to ${input.to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[lesson-calendar-mail] SMTP send failed:", detail);
  }
}

function buildLessonConfirmedHtml(input: {
  t: TFunction;
  lang: string;
  counterpartName: string;
  counterpartKind: "coach" | "student";
  dateLabel: string;
  timeLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  const t = input.t;
  const heading = t("lessonConfirmed.heading");
  const sub = t("lessonConfirmed.sub");
  const personLabel =
    input.counterpartKind === "student" ? t("lessonConfirmed.personStudent") : t("lessonConfirmed.personCoach");
  const dateLabel = t("lessonConfirmed.date");
  const timeLabel = t("lessonConfirmed.time");
  const cta = t("lessonConfirmed.cta");
  const reason = t("lessonConfirmed.reason");
  const unsubBefore = t("common.unsubBefore");
  const unsubLink = t("common.unsubLink");
  const unsubAfter = t("common.unsubAfter");
  const ctaUrl = escapeHtml(input.ctaUrl);
  const unsubscribeUrl = escapeHtml(input.unsubscribeUrl);

  return `<!DOCTYPE html>
<html lang="${input.lang}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:28px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;">
          <tr>
            <td align="center" style="padding:36px 28px 32px;">
              <img src="cid:plus54-logo" width="168" alt="+54" style="display:block;border:0;outline:none;margin:0 auto 22px;height:auto;max-width:168px;" />
              <div style="font-size:26px;line-height:1.25;font-weight:700;color:#111827;padding-bottom:8px;">${heading}</div>
              <div style="font-size:15px;line-height:1.5;color:#6b7280;padding-bottom:22px;">${sub}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
                ${mailDetailRow("calendar", dateLabel, input.dateLabel, false)}
                ${mailDetailRow("clock", timeLabel, input.timeLabel, false)}
                ${mailDetailRow("user", personLabel, input.counterpartName, true)}
              </table>
              <div style="height:26px;line-height:26px;font-size:26px;">&nbsp;</div>
              <a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;">${cta}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:20px;"></div>
              ${mailFooterSocialHtml()}
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:14px;text-align:center;">${reason}</div>
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:4px;text-align:center;">
                ${unsubBefore}<a href="${unsubscribeUrl}" style="color:#2563eb;text-decoration:underline;">${unsubLink}</a>${unsubAfter}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
