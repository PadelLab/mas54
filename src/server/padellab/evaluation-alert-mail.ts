import "server-only";
import type { TFunction } from "i18next";
import { mailHtmlLang, mailIntlLocale, mailT } from "@/server/i18n/mail-i18n";
import { NOTIFICATIONS_SETTINGS_PATH } from "@/lib/safe-next-path";
import { formatDaySectionTitle, formatHm12 } from "@/lib/schedule-date";
import { SKILL_AXIS_KEYS, type SkillAxisKey } from "@/lib/types";
import { brandedLogoAttachments, mailBrandLogoHtml, mailFooterSocialHtml } from "./branded-mail";
import { getPublicAppUrl } from "./public-app-url";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

const NAVY = "#001A33";
const GREEN = "#00A651";
const MUTED = "#6b7280";

function isLessonMailSendDisabled(): boolean {
  const v = process.env.LESSON_CALENDAR_DISABLE_SEND?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function topSkillAxisLabel(
  skills: Partial<Record<SkillAxisKey, number>> | null | undefined,
  locale?: string | null,
): string | null {
  if (!skills) return null;
  let best: SkillAxisKey | null = null;
  let bestVal = -1;
  for (const key of SKILL_AXIS_KEYS) {
    const v = skills[key];
    if (typeof v === "number" && v > bestVal) {
      bestVal = v;
      best = key;
    }
  }
  if (!best) return null;
  return mailT(locale)(`axes.${best}`);
}

export async function sendEvaluationAlert(input: {
  to: string;
  locale?: string | null;
  coachName: string;
  score: number;
  date?: string | null;
  time?: string | null;
  topStrength?: string | null;
}): Promise<void> {
  if (isLessonMailSendDisabled()) {
    console.log("[evaluation-alert-mail] SMTP skipped (LESSON_CALENDAR_DISABLE_SEND=1)");
    return;
  }
  if (!isSmtpConfigured()) {
    console.warn("[evaluation-alert-mail] SMTP not configured");
    return;
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return;

  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const intlLocale = mailIntlLocale(input.locale);
  const score = clampScore(input.score);
  const dateLabel = input.date ? formatDaySectionTitle(input.date, intlLocale) : "";
  const timeLabel = input.time ? formatHm12(input.time) : "";
  const overallLabel = t("evaluation.overallLabel");
  const subject = t("evaluation.subject");
  const text = t("evaluation.text", {
    score,
    coach: input.coachName,
    when: dateLabel ? t("evaluation.textWhen", { date: dateLabel, time: timeLabel }) : "",
    strength: input.topStrength ? t("evaluation.textStrength", { value: input.topStrength }) : "",
  });
  const appUrl = getPublicAppUrl();
  const html = buildEvaluationAlertHtml({
    t,
    lang,
    score,
    overallLabel,
    coachName: input.coachName,
    dateLabel,
    timeLabel,
    topStrength: input.topStrength?.trim() || "",
    ctaUrl: `${appUrl}/student/overall`,
    unsubscribeUrl: `${appUrl}/login?next=${encodeURIComponent(NOTIFICATIONS_SETTINGS_PATH)}`,
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text,
      html,
      attachments: brandedLogoAttachments(),
    });
    console.log(`[evaluation-alert-mail] sent to ${input.to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[evaluation-alert-mail] SMTP send failed:", detail);
  }
}

function infoCard(kicker: string, lines: string[]): string {
  const body = lines
    .filter(Boolean)
    .map(
      (line, i) =>
        `<div style="font-size:14px;line-height:1.35;font-weight:700;color:${NAVY};padding-top:${i === 0 ? "3px" : "2px"};">${escapeHtml(line)}</div>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;">
    <tr>
      <td valign="middle" style="padding:14px 16px;">
        <div style="font-size:11px;letter-spacing:0.12em;font-weight:700;color:${MUTED};">${escapeHtml(kicker)}</div>
        ${body}
      </td>
    </tr>
  </table>`;
}

function buildEvaluationAlertHtml(input: {
  t: TFunction;
  lang: string;
  score: number;
  overallLabel: string;
  coachName: string;
  dateLabel: string;
  timeLabel: string;
  topStrength: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  const t = input.t;
  const kicker = t("evaluation.kicker");
  const heading = t("evaluation.heading");
  const sub = t("evaluation.sub");
  const coachKicker = t("evaluation.coachKicker");
  const lessonKicker = t("evaluation.lessonKicker");
  const strengthKicker = t("evaluation.strengthKicker");
  const cta = t("evaluation.cta");
  const reason = t("evaluation.reason");
  const unsubBefore = t("common.unsubBefore");
  const unsubLink = t("common.unsubLink");
  const unsubAfter = t("common.unsubAfter");
  const ctaUrl = escapeHtml(input.ctaUrl);
  const lessonLines = [input.dateLabel, input.timeLabel].filter(Boolean);
  const strengthBlock = input.topStrength
    ? `<div style="height:12px;line-height:12px;font-size:12px;">&nbsp;</div>
              <a href="${ctaUrl}" style="display:block;text-decoration:none;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8F8EF;border-radius:14px;">
                  <tr>
                    <td valign="middle" style="padding:14px 16px;">
                      <div style="font-size:11px;letter-spacing:0.12em;font-weight:700;color:${GREEN};">${strengthKicker}</div>
                      <div style="font-size:15px;line-height:1.3;font-weight:700;color:${NAVY};padding-top:3px;">${escapeHtml(input.topStrength)}</div>
                    </td>
                  </tr>
                </table>
              </a>`
    : "";

  return `<!DOCTYPE html>
<html lang="${input.lang}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:28px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;">
          <tr>
            <td align="center" style="padding:36px 28px 8px;">
              ${mailBrandLogoHtml(18)}
              <div style="font-size:11px;letter-spacing:0.16em;font-weight:700;color:${GREEN};">${kicker}</div>
              <div style="width:28px;height:2px;background:${GREEN};margin:10px auto 14px;line-height:2px;font-size:2px;">&nbsp;</div>
              <div style="font-size:26px;line-height:1.25;font-weight:700;color:${NAVY};padding-bottom:10px;">${heading}</div>
              <div style="font-size:14px;line-height:1.6;color:${MUTED};padding:0 12px 20px;max-width:520px;">${sub}</div>
              <div style="font-size:11px;letter-spacing:0.16em;font-weight:700;color:#9ca3af;padding-bottom:4px;">${escapeHtml(input.overallLabel.toUpperCase())}</div>
              <div style="font-size:48px;line-height:1;font-weight:700;color:${NAVY};padding:4px 0 22px;">${input.score}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" valign="top" style="padding-right:6px;">${infoCard(coachKicker, [input.coachName])}</td>
                  <td width="50%" valign="top" style="padding-left:6px;">${infoCard(lessonKicker, lessonLines.length ? lessonLines : ["—"])}</td>
                </tr>
              </table>
              ${strengthBlock}
              <div style="height:24px;line-height:24px;font-size:24px;">&nbsp;</div>
              <a href="${ctaUrl}" style="display:block;background:${NAVY};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;text-align:center;padding:14px 28px;border-radius:8px;">${cta}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:20px;"></div>
              ${mailFooterSocialHtml()}
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:14px;text-align:center;">${reason}</div>
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:4px;text-align:center;">
                ${unsubBefore}<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${GREEN};text-decoration:underline;">${unsubLink}</a>${unsubAfter}
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
