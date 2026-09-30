import "server-only";
import { randomInt } from "crypto";
import { getSql } from "./neon-client";
import { hashPassword, verifyPassword } from "./password";
import { sendAuthOtpEmail } from "./auth-mail";

const TTL_MS = 10 * 60_000;

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function issueEmailVerificationCode(input: {
  email: string;
  locale?: string | null;
  sendEmail?: boolean;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const code = generateCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const sql = getSql();
  await sql`
    INSERT INTO email_verification_codes (email, code_hash, expires_at)
    VALUES (${email}, ${codeHash}, ${expiresAt})
    ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at
  `;
  if (input.sendEmail !== false) {
    await sendAuthOtpEmail({
      to: email,
      code,
      kind: "emailVerification",
      locale: input.locale,
    });
  }
  return code;
}

export async function consumeEmailVerificationCode(email: string, code: string): Promise<boolean> {
  const mailbox = email.trim().toLowerCase();
  const digits = code.replace(/\s/g, "");
  if (!mailbox.includes("@") || digits.length < 4) return false;
  const sql = getSql();
  const rows = (await sql`
    SELECT code_hash, expires_at
    FROM email_verification_codes
    WHERE email = ${mailbox}
    LIMIT 1
  `) as { code_hash: string; expires_at: string }[];
  const row = rows[0];
  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  const ok = await verifyPassword(digits, row.code_hash);
  if (!ok) return false;
  await sql`DELETE FROM email_verification_codes WHERE email = ${mailbox}`;
  return true;
}
