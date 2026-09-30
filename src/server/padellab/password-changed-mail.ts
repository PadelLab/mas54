import "server-only";
import { brandedLogoAttachments, escapeMailHtml, wrapBrandedMailHtml } from "./branded-mail";
import { getSql } from "./neon-client";
import { getPublicAppUrl } from "./public-app-url";
import { mailHtmlLang, mailT } from "@/server/i18n/mail-i18n";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

function paragraph(html: string): string {
  return `<div style="font-size:15px;line-height:1.6;color:#374151;text-align:left;padding-bottom:16px;">${html}</div>`;
}

async function mailboxProfile(email: string): Promise<{ name: string; locale: string | null }> {
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT name, preferred_language
      FROM users
      WHERE lower(email) = ${email}
      LIMIT 1
    `) as { name: string | null; preferred_language: string | null }[];
    return {
      name: rows[0]?.name?.trim() ?? "",
      locale: rows[0]?.preferred_language ?? null,
    };
  } catch {
    return { name: "", locale: null };
  }
}

export async function sendPasswordChangedEmail(input: {
  to: string;
  name?: string | null;
  locale?: string | null;
}): Promise<void> {
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) return;
  if (!isSmtpConfigured()) {
    console.warn("[password-changed-mail] SMTP not configured");
    return;
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return;

  const profile =
    input.name?.trim() && input.locale
      ? { name: input.name.trim(), locale: input.locale }
      : await mailboxProfile(to);
  const name = input.name?.trim() || profile.name;
  const locale = input.locale ?? profile.locale;
  const t = mailT(locale);
  const lang = mailHtmlLang(locale);
  const resetUrl = `${getPublicAppUrl()}/login/recover`;
  const cta = t("passwordChanged.cta");

  const greeting = name
    ? t("passwordChanged.greeting", { name })
    : t("passwordChanged.greetingNoName");
  const intro = t("passwordChanged.intro");
  const ifYou = t("passwordChanged.ifYou");
  const ifNotYou = t("passwordChanged.ifNotYou");
  const help = t("passwordChanged.help");
  const signoffLead = t("passwordChanged.signoffLead");
  const signoff = t("passwordChanged.signoff");
  const subject = t("passwordChanged.subject");
  const reason = t("passwordChanged.reason");

  const text = `${greeting}

${intro}

${ifYou}

${ifNotYou}

${cta}

${help}

${signoffLead}
${signoff}`;

  const safeHref = escapeMailHtml(resetUrl);
  const html = wrapBrandedMailHtml({
    lang,
    heading: "",
    sub: "",
    reason,
    bodyHtml: [
      paragraph(escapeMailHtml(greeting)),
      paragraph(escapeMailHtml(intro)),
      paragraph(escapeMailHtml(ifYou)),
      paragraph(escapeMailHtml(ifNotYou)),
      `<div style="padding:8px 0 24px;text-align:center;">
        <a href="${safeHref}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;">${escapeMailHtml(cta)}</a>
      </div>`,
      paragraph(escapeMailHtml(help)),
      `<div style="font-size:15px;line-height:1.6;color:#111827;text-align:left;">
        <div>${escapeMailHtml(signoffLead)}</div>
        <div style="font-weight:700;padding-top:2px;">${escapeMailHtml(signoff)}</div>
      </div>`,
    ].join(""),
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
    console.log(`[password-changed-mail] sent to ${to} id=${info.messageId ?? "?"}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[password-changed-mail] SMTP send failed:", detail);
  }
}
