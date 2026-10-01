import "server-only";
import { brandedLogoAttachments, escapeMailHtml, wrapBrandedMailHtml } from "./branded-mail";
import { getPublicAppUrl } from "./public-app-url";
import { mailHtmlLang, mailT } from "@/server/i18n/mail-i18n";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

export type SendStaffCredentialsResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "send_failed" };

export async function sendStaffCredentialsEmail(input: {
  to: string;
  name: string;
  tempPassword: string;
  locale?: string | null;
}): Promise<SendStaffCredentialsResult> {
  if (!isSmtpConfigured()) {
    console.warn("[staff-credentials-mail] SMTP not configured");
    return { ok: false, reason: "not_configured" };
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) {
    return { ok: false, reason: "not_configured" };
  }

  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const signInUrl = `${getPublicAppUrl()}/login`;
  const name = input.name.trim();
  const greeting = name ? t("staffCredentials.greeting", { name }) : t("staffCredentials.greetingNoName");
  const intro = t("staffCredentials.intro");
  const heading = t("staffCredentials.heading");
  const subject = t("staffCredentials.subject");
  const emailLabel = t("staffCredentials.emailLabel");
  const passwordLabel = t("staffCredentials.passwordLabel");
  const mustChange = t("staffCredentials.mustChange");
  const cta = t("staffCredentials.cta");
  const reason = t("staffCredentials.reason");

  const text = `${heading}

${greeting}
${intro}

${emailLabel}: ${input.to}
${passwordLabel}: ${input.tempPassword}

${mustChange}

${t("staffCredentials.openLink")}
${signInUrl}`;

  const html = wrapBrandedMailHtml({
    lang,
    heading: escapeMailHtml(heading),
    sub: "",
    reason: escapeMailHtml(reason),
    bodyHtml: `
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding:4px 0 18px;">
        <div>${escapeMailHtml(greeting)}</div>
        <div style="padding-top:2px;">${escapeMailHtml(intro)}</div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:12px;margin-bottom:18px;">
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${escapeMailHtml(emailLabel)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#111827;text-align:right;">${escapeMailHtml(input.to)}</td>
        </tr>
        <tr>
          <td style="padding:14px 16px;font-size:14px;color:#6b7280;">${escapeMailHtml(passwordLabel)}</td>
          <td style="padding:14px 16px;font-size:14px;font-weight:700;color:#111827;text-align:right;font-family:Consolas,'Courier New',monospace;white-space:nowrap;">${escapeMailHtml(input.tempPassword)}</td>
        </tr>
      </table>
      <div style="font-size:14px;line-height:1.6;color:#6b7280;text-align:left;padding-bottom:22px;">${escapeMailHtml(mustChange)}</div>
      <div style="text-align:center;padding-bottom:8px;">
        <a href="${escapeMailHtml(signInUrl)}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:8px;">${escapeMailHtml(cta)}</a>
      </div>
    `,
  });

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text,
      html,
      attachments: brandedLogoAttachments(),
    });
    return { ok: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[staff-credentials-mail] SMTP send failed:", detail);
    return { ok: false, reason: "send_failed" };
  }
}
