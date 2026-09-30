import "server-only";
import type { TFunction } from "i18next";
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

export async function sendLessonRequestAlert(input: {
  to: string;
  locale?: string | null;
  studentName: string;
  date: string;
  time: string;
}): Promise<void> {
  if (isLessonMailSendDisabled()) {
    console.log("[lesson-request-mail] SMTP skipped (LESSON_CALENDAR_DISABLE_SEND=1)");
    return;
  }
  if (!isSmtpConfigured()) {
    console.warn("[lesson-request-mail] SMTP not configured");
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
  const subject = t("lessonRequest.subject", { name: input.studentName });
  const text = t("lessonRequest.text", {
    name: input.studentName,
    date: dateLabel,
    time: timeLabel,
  });
  const appUrl = getPublicAppUrl();
  const html = buildLessonRequestHtml({
    t,
    lang,
    studentName: input.studentName,
    dateLabel,
    timeLabel,
    ctaUrl: `${appUrl}/coach/schedule`,
    unsubscribeUrl: `${appUrl}/login?next=${encodeURIComponent(NOTIFICATIONS_SETTINGS_PATH)}`,
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text,
      html,
      attachments: brandedLessonMailAttachments(),
    });
    console.log(`[lesson-request-mail] sent to ${input.to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[lesson-request-mail] SMTP send failed:", detail);
  }
}

function buildLessonRequestHtml(input: {
  t: TFunction;
  lang: string;
  studentName: string;
  dateLabel: string;
  timeLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  const t = input.t;
  const heading = t("lessonRequest.heading");
  const sub = t("lessonRequest.sub");
  const dateLabel = t("lessonRequest.date");
  const timeLabel = t("lessonRequest.time");
  const personLabel = t("lessonRequest.person");
  const cta = t("lessonRequest.cta");
  const reason = t("lessonRequest.reason");
  const unsubBefore = t("common.unsubBefore");
  const unsubLink = t("common.unsubLink");
  const unsubAfter = t("common.unsubAfter");

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
                ${mailDetailRow("user", personLabel, input.studentName, true)}
              </table>
              <div style="height:26px;line-height:26px;font-size:26px;">&nbsp;</div>
              <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;">${cta}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:20px;"></div>
              ${mailFooterSocialHtml()}
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:14px;text-align:center;">${reason}</div>
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:4px;text-align:center;">
                ${unsubBefore}<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#2563eb;text-decoration:underline;">${unsubLink}</a>${unsubAfter}
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
