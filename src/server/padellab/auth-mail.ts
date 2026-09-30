import "server-only";
import { mailHtmlLang, mailT } from "@/server/i18n/mail-i18n";
import { brandedLogoAttachments, escapeMailHtml, wrapBrandedMailHtml } from "./branded-mail";
import { getSql } from "./neon-client";
import { getSmtpTransporter, isSmtpConfigured, smtpFrom } from "./smtp-transport";

export type AuthMailKind = "emailVerification" | "signIn" | "forgetPassword";

export function authMailKindFromNeon(raw: string | null | undefined): AuthMailKind {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "sign-in" || v === "signin") return "signIn";
  if (v === "forget-password" || v === "reset-password" || v === "password-reset") return "forgetPassword";
  return "emailVerification";
}

export async function localeForMailbox(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT preferred_language
      FROM users
      WHERE lower(email) = ${normalized}
      LIMIT 1
    `) as { preferred_language: string | null }[];
    return rows[0]?.preferred_language ?? null;
  } catch {
    return null;
  }
}

export async function sendAuthOtpEmail(input: {
  to: string;
  code: string;
  kind: AuthMailKind;
  locale?: string | null;
}): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn("[auth-mail] SMTP not configured; OTP not sent");
    return false;
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return false;

  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const ns = `authOtp.${input.kind}`;
  const code = input.code.replace(/\s/g, "");
  const safeCode = escapeMailHtml(code);
  const subject = t(`${ns}.subject`);
  const heading = t(`${ns}.heading`);
  const sub = t(`${ns}.sub`);
  const reason = t(`${ns}.reason`);
  const ignore = t("authOtp.ignore");
  const text = `${t("authOtp.text", { code })}\n\n${ignore}`;
  const html = wrapBrandedMailHtml({
    lang,
    heading,
    sub,
    reason,
    extraFooterHtml: ignore,
    bodyHtml: `<div style="margin:0 auto;max-width:280px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 12px;font-size:32px;line-height:1.2;font-weight:700;letter-spacing:0.28em;color:#111827;">${safeCode}</div>`,
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
    console.log(`[auth-mail] otp ${input.kind} to ${input.to} id=${info.messageId ?? "?"}`);
    return true;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[auth-mail] OTP SMTP send failed:", detail);
    return false;
  }
}

export async function sendAuthMagicLinkEmail(input: {
  to: string;
  url: string;
  kind: AuthMailKind;
  locale?: string | null;
}): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn("[auth-mail] SMTP not configured; magic link not sent");
    return false;
  }
  const transporter = getSmtpTransporter();
  const from = smtpFrom();
  if (!transporter || !from) return false;

  const t = mailT(input.locale);
  const lang = mailHtmlLang(input.locale);
  const ns = `authLink.${input.kind}`;
  const href = escapeMailHtml(input.url);
  const safeUrl = escapeMailHtml(input.url);
  const subject = t(`${ns}.subject`);
  const heading = t(`${ns}.heading`);
  const sub = t(`${ns}.sub`);
  const cta = t(`${ns}.cta`);
  const reason = t(`${ns}.reason`);
  const ignore = t("authLink.ignore");
  const copyUrl = t("authLink.copyUrl");
  const text = `${t("authLink.text", { url: input.url })}\n\n${ignore}`;
  const html = wrapBrandedMailHtml({
    lang,
    heading,
    sub,
    reason,
    extraFooterHtml: ignore,
    bodyHtml: `<a href="${href}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;">${cta}</a>
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:18px;">${copyUrl}</div>
              <div style="font-size:12px;line-height:1.55;color:#6b7280;word-break:break-all;padding-top:4px;">${safeUrl}</div>`,
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
    console.log(`[auth-mail] link ${input.kind} to ${input.to} id=${info.messageId ?? "?"}`);
    return true;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[auth-mail] magic-link SMTP send failed:", detail);
    return false;
  }
}
