import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { sessionCookieSecret } from "./session-cookie";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(): string {
  return bytesToBase32(randomBytes(20));
}

export function formatTotpSecret(secret: string): string {
  return secret.replace(/.{4}/g, "$& ").trim();
}

export function totpAuthUrl(input: { secret: string; email: string; issuer?: string }): string {
  const issuer = input.issuer ?? "+54";
  const label = `${issuer}:${input.email}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function hashBackupCode(userId: string, code: string): string {
  return createHmac("sha256", `2fa-backup:${sessionCookieSecret()}:${userId}`)
    .update(normalizeOtp(code))
    .digest("hex");
}

export function normalizeOtp(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function verifyTotpCode(secret: string, code: string, nowMs = Date.now()): boolean {
  const digits = normalizeOtp(code);
  if (!/^\d{6}$/.test(digits)) return false;
  const secretBytes = base32ToBytes(secret);
  if (!secretBytes) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = hotp(secretBytes, Math.floor(nowMs / 1000 / 30) + drift);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(digits))) return true;
  }
  return false;
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

function bytesToBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32ToBytes(secret: string): Buffer | null {
  const clean = secret.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  if (!clean) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
