import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import QRCode from "qrcode";
import type { NextRequest, NextResponse } from "next/server";
import type { Sql } from "./neon-client";
import { formatSessionCookieValue, parseSessionCookieValue, sessionCookieSecret } from "./session-cookie";
import {
  formatTotpSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  normalizeOtp,
  totpAuthUrl,
  verifyTotpCode,
} from "./totp";

export const TWO_FACTOR_PENDING_COOKIE = "padellab_2fa_pending";
const PENDING_MAX_AGE_SEC = 10 * 60;

function encKey() {
  return createHash("sha256").update(`2fa:${sessionCookieSecret()}`).digest();
}

function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

function decryptSecret(packed: string | null | undefined): string | null {
  if (!packed) return null;
  const [ivB64, tagB64, dataB64] = packed.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

type TwoFactorRow = {
  enabled: boolean;
  secret_enc: string | null;
  pending_secret_enc: string | null;
  backup_hashes: string;
};

export async function twoFactorIsEnabled(sql: Sql, userId: string): Promise<boolean> {
  const rows = (await sql`SELECT public.two_factor_is_enabled(${userId}) AS enabled`) as { enabled: boolean }[];
  return Boolean(rows[0]?.enabled);
}

async function loadRow(sql: Sql, userId: string): Promise<TwoFactorRow | null> {
  const rows = (await sql`
    SELECT enabled, secret_enc, pending_secret_enc, backup_hashes
    FROM public.two_factor_load(${userId})
  `) as TwoFactorRow[];
  return rows[0] ?? null;
}

export async function startTwoFactorEnrollment(
  sql: Sql,
  input: { userId: string; email: string },
): Promise<{ secretFormatted: string; otpauthUrl: string; qrDataUrl: string }> {
  const secret = generateTotpSecret();
  const otpauthUrl = totpAuthUrl({ secret, email: input.email });
  await sql`
    SELECT public.two_factor_upsert(
      ${input.userId},
      false,
      NULL,
      ${encryptSecret(secret)},
      ${"[]"}
    )
  `;
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#18181b", light: "#ffffff" },
  });
  return {
    secretFormatted: formatTotpSecret(secret),
    otpauthUrl,
    qrDataUrl,
  };
}

export async function confirmTwoFactorEnrollment(
  sql: Sql,
  input: { userId: string; code: string },
): Promise<{ ok: true; backupCodes: string[] } | { ok: false; message: string }> {
  const row = await loadRow(sql, input.userId);
  const pending = decryptSecret(row?.pending_secret_enc);
  if (!pending) return { ok: false, message: "NO_PENDING" };
  if (!verifyTotpCode(pending, input.code)) return { ok: false, message: "INVALID_CODE" };
  const backupCodes = generateBackupCodes();
  const hashes = JSON.stringify(backupCodes.map((c) => hashBackupCode(input.userId, c)));
  await sql`
    SELECT public.two_factor_upsert(
      ${input.userId},
      true,
      ${encryptSecret(pending)},
      NULL,
      ${hashes}
    )
  `;
  return { ok: true, backupCodes };
}

export async function disableTwoFactor(sql: Sql, userId: string): Promise<void> {
  await sql`SELECT public.two_factor_delete(${userId})`;
}

export async function verifyTwoFactorCode(
  sql: Sql,
  input: { userId: string; code: string },
): Promise<boolean> {
  const row = await loadRow(sql, input.userId);
  if (!row?.enabled) return false;
  const secret = decryptSecret(row.secret_enc);
  if (secret && verifyTotpCode(secret, input.code)) return true;

  const hashes = parseHashes(row.backup_hashes);
  const submitted = hashBackupCode(input.userId, normalizeOtp(input.code));
  const idx = hashes.indexOf(submitted);
  if (idx < 0) return false;
  hashes.splice(idx, 1);
  await sql`
    SELECT public.two_factor_upsert(
      ${input.userId},
      true,
      ${row.secret_enc},
      NULL,
      ${JSON.stringify(hashes)}
    )
  `;
  return true;
}

function parseHashes(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function formatPendingTwoFactorCookie(userId: string, sessionVersion: number): string {
  const exp = Date.now() + PENDING_MAX_AGE_SEC * 1000;
  return formatSessionCookieValue(`${userId}~${exp}`, sessionVersion);
}

/** Cookie `padellab_2fa_pending`, `X-2FA-Pending` header, or JSON field (mobile app). */
export function requestPendingTwoFactorToken(
  req: NextRequest,
  bodyToken?: string | null,
): string | null {
  const fromBody = bodyToken?.trim() ?? "";
  if (fromBody && parsePendingTwoFactorCookie(fromBody)) return fromBody;
  const fromHeader = req.headers.get("x-2fa-pending")?.trim() ?? "";
  if (fromHeader && parsePendingTwoFactorCookie(fromHeader)) return fromHeader;
  return req.cookies.get(TWO_FACTOR_PENDING_COOKIE)?.value ?? null;
}

export function parsePendingTwoFactorCookie(
  raw: string | null | undefined,
): { userId: string; sessionVersion: number } | null {
  const parsed = parseSessionCookieValue(raw);
  if (!parsed) return null;
  const sep = parsed.userId.lastIndexOf("~");
  if (sep <= 0) return null;
  const userId = parsed.userId.slice(0, sep);
  const exp = Number(parsed.userId.slice(sep + 1));
  if (!userId || !Number.isFinite(exp) || exp < Date.now()) return null;
  return { userId, sessionVersion: parsed.version ?? 0 };
}

export function pendingTwoFactorCookieOptions() {
  return {
    httpOnly: true as const,
    path: "/" as const,
    sameSite: "lax" as const,
    maxAge: PENDING_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearPendingTwoFactorCookie(res: NextResponse) {
  res.cookies.set(TWO_FACTOR_PENDING_COOKIE, "", { ...pendingTwoFactorCookieOptions(), maxAge: 0 });
}
