import "server-only";
import { brandedLogoAttachments, escapeMailHtml, wrapBrandedMailHtml } from "./branded-mail";
import { mailHtmlLang, mailT } from "@/server/i18n/mail-i18n";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

export async function sendAccountDeletedEmail(input: {
  to: string;
  locale?: string | null;
}): Promise<void> {
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) return;
  if (!isSmtpConfigured()) {
    console.warn("[account-deleted-mail] SMTP not configured");
    return;
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return;

  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const heading = t("accountDeleted.heading");
  const body = t("accountDeleted.body");
  const subject = t("accountDeleted.subject");
  const reason = t("accountDeleted.reason");

  const text = `${heading}

${body}`;

  const html = wrapBrandedMailHtml({
    lang,
    heading: escapeMailHtml(heading),
    sub: escapeMailHtml(body),
    reason: escapeMailHtml(reason),
    bodyHtml: "",
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments: brandedLogoAttachments(),
    });
    console.log(`[account-deleted-mail] sent to ${to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[account-deleted-mail] SMTP send failed:", detail);
  }
}
