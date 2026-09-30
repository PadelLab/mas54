import "server-only";
import type { TFunction } from "i18next";
import { NOTIFICATIONS_SETTINGS_PATH } from "@/lib/safe-next-path";
import { formatDaySectionTitle, formatHm12 } from "@/lib/schedule-date";
import { mailHtmlLang, mailIntlLocale, mailT } from "@/server/i18n/mail-i18n";
import {
  brandedLessonMailAttachments,
  escapeMailHtml,
  mailDetailRow,
  wrapBrandedMailHtml,
} from "./branded-mail";
import { getPublicAppUrl } from "./public-app-url";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

function isLessonMailSendDisabled(): boolean {
  const v = process.env.LESSON_CALENDAR_DISABLE_SEND?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function buildDeclineHtml(input: {
  t: TFunction;
  lang: string;
  coachName: string;
  dateLabel: string;
  timeLabel: string;
  motive: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  const t = input.t;
  const motiveHtml = escapeMailHtml(input.motive).replace(/\n/g, "<br />");
  const unsubBefore = t("common.unsubBefore");
  const unsubLink = t("common.unsubLink");
  const unsubAfter = t("common.unsubAfter");
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
      ${mailDetailRow("calendar", t("lessonDeclined.date"), input.dateLabel, false)}
      ${mailDetailRow("clock", t("lessonDeclined.time"), input.timeLabel, false)}
      ${mailDetailRow("user", t("lessonDeclined.person"), input.coachName, true)}
    </table>
    <div style="height:18px;line-height:18px;font-size:18px;">&nbsp;</div>
    <div style="text-align:left;margin:0 auto;padding:16px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;padding-bottom:8px;">${escapeMailHtml(t("lessonDeclined.motive"))}</div>
      <div style="font-size:15px;line-height:1.55;color:#111827;">${motiveHtml}</div>
    </div>
    <div style="height:26px;line-height:26px;font-size:26px;">&nbsp;</div>
    <a href="${escapeMailHtml(input.ctaUrl)}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;">${escapeMailHtml(t("lessonDeclined.cta"))}</a>
  `;
  return wrapBrandedMailHtml({
    lang: input.lang,
    heading: t("lessonDeclined.heading"),
    sub: t("lessonDeclined.sub", { coach: input.coachName }),
    bodyHtml,
    reason: t("lessonDeclined.reason"),
    extraFooterHtml: `${unsubBefore}<a href="${escapeMailHtml(input.unsubscribeUrl)}" style="color:#2563eb;text-decoration:underline;">${unsubLink}</a>${unsubAfter}`,
  });
}

export async function sendLessonDeclineMail(input: {
  to: string;
  locale?: string | null;
  coachName: string;
  date: string;
  time: string;
  motive: string;
}): Promise<void> {
  if (isLessonMailSendDisabled()) {
    console.log("[lesson-decline-mail] SMTP skipped (LESSON_CALENDAR_DISABLE_SEND=1)");
    return;
  }
  if (!isSmtpConfigured()) {
    console.warn("[lesson-decline-mail] SMTP not configured");
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
  const subject = t("lessonDeclined.subject", { date: dateLabel });
  const text = t("lessonDeclined.text", {
    coach: input.coachName,
    date: dateLabel,
    time: timeLabel,
    motive: input.motive,
  });
  const appUrl = getPublicAppUrl();
  const html = buildDeclineHtml({
    t,
    lang,
    coachName: input.coachName,
    dateLabel,
    timeLabel,
    motive: input.motive,
    ctaUrl: `${appUrl}/student/schedule`,
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
    console.log(`[lesson-decline-mail] sent to ${input.to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[lesson-decline-mail] SMTP send failed:", detail);
  }
}
