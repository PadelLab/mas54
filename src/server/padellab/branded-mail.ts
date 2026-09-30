import "server-only";
import path from "node:path";

export const BRAND_LOGO_PATH = path.join(process.cwd(), "public", "brand", "logo-black.png");
export const INSTAGRAM_URL = "https://www.instagram.com/mas54_academiadepadel/";
export const SITE_URL = "https://mas54padel.com";
export const SITE_LABEL = "mas54padel.com";

const BRAND_DIR = path.join(process.cwd(), "public", "brand");

function inlinePng(cid: string, file: string, downloadName: string | false = false) {
  return {
    filename: downloadName,
    path: path.join(BRAND_DIR, file),
    cid,
    contentType: "image/png" as const,
    contentDisposition: "inline" as const,
  };
}

export function brandedLogoAttachments() {
  return [
    inlinePng("plus54-logo", "logo-black.png", "plus54-logo.png"),
    inlinePng("icon-instagram", "mail-icon-instagram.png"),
  ];
}

export function brandedLessonMailAttachments() {
  return [
    ...brandedLogoAttachments(),
    inlinePng("icon-calendar", "mail-icon-calendar.png"),
    inlinePng("icon-clock", "mail-icon-clock.png"),
    inlinePng("icon-user", "mail-icon-user.png"),
  ];
}

export function escapeMailHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export type MailRowIcon = "calendar" | "clock" | "user";

export function mailDetailRow(icon: MailRowIcon, label: string, value: string, last: boolean): string {
  return `<tr>
    <td style="padding:14px 16px;${last ? "" : "border-bottom:1px solid #e5e7eb;"}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="middle" width="28" style="width:28px;padding-right:8px;">
            <img src="cid:icon-${icon}" width="18" height="18" alt="" style="display:block;border:0;outline:none;" />
          </td>
          <td valign="middle" style="font-size:14px;color:#6b7280;">${escapeMailHtml(label)}</td>
          <td valign="middle" align="right" style="font-size:14px;font-weight:700;color:#111827;">${escapeMailHtml(value)}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function mailFooterSocialHtml(): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0">
    <tr>
      <td valign="middle" style="padding-right:6px;">
        <img src="cid:icon-instagram" width="14" height="14" alt="" style="display:block;border:0;outline:none;" />
      </td>
      <td valign="middle">
        <a href="${INSTAGRAM_URL}" style="display:inline-block;font-size:13px;font-weight:600;color:#4b5563;text-decoration:none;">Instagram</a>
      </td>
      <td valign="middle" style="padding:0 10px;color:#d1d5db;font-size:13px;">|</td>
      <td valign="middle">
        <a href="${SITE_URL}" style="font-size:13px;font-weight:600;color:#4b5563;text-decoration:none;">${SITE_LABEL}</a>
      </td>
    </tr>
  </table>`;
}

export function wrapBrandedMailHtml(input: {
  lang: string;
  heading: string;
  sub: string;
  bodyHtml: string;
  reason: string;
  extraFooterHtml?: string;
}): string {
  const extra = input.extraFooterHtml
    ? `<div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:4px;text-align:center;">${input.extraFooterHtml}</div>`
    : "";
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
              ${input.heading ? `<div style="font-size:26px;line-height:1.25;font-weight:700;color:#111827;padding-bottom:8px;">${input.heading}</div>` : ""}
              ${input.sub ? `<div style="font-size:15px;line-height:1.5;color:#6b7280;padding-bottom:22px;">${input.sub}</div>` : ""}
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:20px;"></div>
              ${mailFooterSocialHtml()}
              <div style="font-size:12px;line-height:1.55;color:#9ca3af;padding-top:14px;text-align:center;">${input.reason}</div>
              ${extra}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
