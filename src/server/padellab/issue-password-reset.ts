import "server-only";
import { createHash, randomBytes, randomUUID } from "crypto";

import type { Sql } from "./neon-client";
import { getPublicAppUrl } from "./public-app-url";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export type IssuePasswordResetOk = {
  ok: true;
  tokenRowId: string;
  resetUrl: string;
  email: string;
};

export type IssuePasswordResetResult = IssuePasswordResetOk | { ok: false; reason: "user_not_found" };

export type IssuePasswordResetOptions = {
  /** Path with a leading slash, no query. Default: public `/login/reset` flow. */
  resetPath?: string;
};

function normalizeResetPath(path: string): string {
  const t = path.trim();
  if (!t) return "/login/reset";
  return t.startsWith("/") ? t : `/${t}`;
}

/** Create a reset token in the DB and return the public URL (`{resetPath}?token=…`). */
export async function issuePasswordResetForUserId(
  sql: Sql,
  userId: string,
  options?: IssuePasswordResetOptions,
): Promise<IssuePasswordResetResult> {
  const rows = (await sql`
    SELECT id, email FROM users WHERE id = ${userId} LIMIT 1
  `) as { id: string; email: string }[];
  const u = rows[0];
  if (!u) return { ok: false, reason: "user_not_found" };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const id = `prt-${randomUUID()}`;

  await sql`
    DELETE FROM password_reset_tokens
    WHERE user_id = ${u.id} AND used_at IS NULL
  `;

  await sql`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
    VALUES (${id}, ${u.id}, ${tokenHash}, NOW() + INTERVAL '1 hour')
  `;

  const base = getPublicAppUrl();
  const path = normalizeResetPath(options?.resetPath ?? "/login/reset");
  const resetUrl = `${base}${path}?token=${encodeURIComponent(token)}`;
  const email = u.email.trim().toLowerCase();

  return { ok: true, tokenRowId: id, resetUrl, email };
}

export async function lookupPasswordResetTokenEmail(
  sql: Sql,
  token: string,
): Promise<string | null> {
  const raw = token.trim();
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const rows = (await sql`
    SELECT u.email
    FROM password_reset_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ${tokenHash}
    LIMIT 1
  `) as { email: string | null }[];
  const email = rows[0]?.email?.trim().toLowerCase() ?? "";
  return email.includes("@") ? email : null;
}
