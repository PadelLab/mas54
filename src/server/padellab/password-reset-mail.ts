import "server-only";
import { mailHtmlLang, mailT } from "@/server/i18n/mail-i18n";
import { brandedLogoAttachments, escapeMailHtml, wrapBrandedMailHtml } from "./branded-mail";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

export type SendPasswordResetResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "send_failed"; detail?: string };

export { isSmtpConfigured, smtpFrom };

/** Staging: print the link in the log instead of sending email (no SMTP). */
export function isPasswordResetLogTokenEnabled(): boolean {
  const v = process.env.PASSWORD_RESET_LOG_TOKEN?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Temporarily disable SMTP sending; the link still appears in the server log. */
export function isPasswordResetSendDisabled(): boolean {
  const v = process.env.PASSWORD_RESET_DISABLE_SEND?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  locale?: string | null,
): Promise<SendPasswordResetResult> {
  if (!isSmtpConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const transporter = getSmtpTransporter();
  if (!transporter) {
    return { ok: false, reason: "not_configured" };
  }
  const from = smtpFrom()!;
  const t = mailT(locale);
  const lang = mailHtmlLang(locale);
  const href = escapeMailHtml(resetUrl);
  const safeUrl = escapeMailHtml(resetUrl);
  const subject = t("passwordReset.subject");
  const heading = t("passwordReset.heading");
  const intro = t("passwordReset.intro");
  const cta = t("passwordReset.cta");
  const copyUrl = t("passwordReset.copyUrl");
  const ignore = t("passwordReset.ignore");
  const text = `${intro}

${t("passwordReset.openLink")}
${resetUrl}

${ignore}`;

  const html = wrapBrandedMailHtml({
    lang,
    heading,
    sub: intro,
    reason: ignore,
    bodyHtml: `<a href="${href}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;">${cta}</a>
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:18px;">${copyUrl}</div>
              <div style="font-size:12px;line-height:1.55;color:#6b7280;word-break:break-all;padding-top:4px;">${safeUrl}</div>`,
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments: brandedLogoAttachments(),
    });
    return { ok: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[password-reset-mail] SMTP send failed:", detail);
    return { ok: false, reason: "send_failed", detail };
  }
}
