import "server-only";
import { brandedLogoAttachments, escapeMailHtml, wrapBrandedMailHtml } from "./branded-mail";
import { getPublicAppUrl } from "./public-app-url";
import { mailHtmlLang, mailT } from "@/server/i18n/mail-i18n";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

export async function sendStudentWelcomeEmail(input: {
  to: string;
  name?: string | null;
  locale?: string | null;
}): Promise<void> {
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) return;
  if (!isSmtpConfigured()) {
    console.warn("[student-welcome-mail] SMTP not configured");
    return;
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return;
  // Signup also sends the OTP from another function; give Gmail a moment first.
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const greeting = t("studentWelcome.greeting");
  const heading = t("studentWelcome.heading");
  const intro = t("studentWelcome.intro");
  const body = t("studentWelcome.body");
  const cta = t("studentWelcome.cta");
  const signoff = t("studentWelcome.signoff");
  const team = t("studentWelcome.team");
  const subject = t("studentWelcome.subject");
  const reason = t("studentWelcome.reason");
  const signInUrl = `${getPublicAppUrl()}/login`;

  const text = `${greeting}

${intro}

${body}

${t("studentWelcome.openLink")}
${signInUrl}

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
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-bottom:12px;">
        ${escapeMailHtml(intro)}
      </div>
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-bottom:22px;">
        ${escapeMailHtml(body)}
      </div>
      <div style="text-align:center;padding-bottom:18px;">
        <a href="${escapeMailHtml(signInUrl)}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 36px;border-radius:8px;">${escapeMailHtml(cta)}</a>
      </div>
      <div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;">
        ${escapeMailHtml(signoff)}<br />
        <strong>${escapeMailHtml(team)}</strong>
      </div>
    `,
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
    console.log(`[student-welcome-mail] sent to ${to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[student-welcome-mail] SMTP send failed:", detail);
  }
}
