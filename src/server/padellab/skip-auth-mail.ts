import "server-only";
import type { AuthMailKind } from "./auth-mail";
import { getSql } from "./neon-client";

const TTL_MS = 3 * 60_000;

export async function suppressAuthMail(email: string, kinds: AuthMailKind[], ttlMs = TTL_MS) {
  const mailbox = email.trim().toLowerCase();
  if (!mailbox.includes("@")) return;
  const until = new Date(Date.now() + ttlMs).toISOString();
  const sql = getSql();
  for (const kind of kinds) {
    await sql`
      INSERT INTO auth_mail_suppress (email, kind, until)
      VALUES (${mailbox}, ${kind}, ${until})
      ON CONFLICT (email) DO UPDATE SET kind = EXCLUDED.kind, until = EXCLUDED.until
    `;
  }
}

export async function shouldSuppressAuthMail(email: string, kind: AuthMailKind): Promise<boolean> {
  const mailbox = email.trim().toLowerCase();
  if (!mailbox.includes("@")) return false;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT 1
      FROM auth_mail_suppress
      WHERE email = ${mailbox} AND kind = ${kind} AND until > NOW()
      LIMIT 1
    `) as { "?column?": number }[];
    return rows.length > 0;
  } catch {
    return false;
  }
}
