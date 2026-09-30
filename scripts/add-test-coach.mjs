/**
 * Create or update the test coach (DATABASE_URL / .env.local).
 */
import bcrypt from "bcryptjs";
import { getScriptSql } from "./neon-sql.mjs";

const ID = "u-prof-teste";
const EMAIL = "prof.teste@padellab.com";
const NAME = "Professor Teste";
const PASSWORD = process.env.BOOTSTRAP_COACH_PASSWORD?.trim() || "";
if (!PASSWORD) {
  throw new Error("Set BOOTSTRAP_COACH_PASSWORD in the environment (do not commit it).");
}

let sql;
try {
  sql = getScriptSql();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const password_hash = await bcrypt.hash(PASSWORD, 10);
const createdAt = new Date().toISOString();

const existing = await sql`
  SELECT id FROM users WHERE LOWER(email) = ${EMAIL.toLowerCase()} LIMIT 1
`;

if (existing.length) {
  const row = existing[0];
  const targetId = row.id;
  await sql`
    UPDATE users SET
      name = ${NAME},
      role = 'coach',
      password_hash = ${password_hash},
      status = 'active',
      bio = ${"Demo account for the coach panel."},
      phone = ${"+351 900 000 099"},
      preferred_language = 'pt'
    WHERE id = ${targetId}
  `;
  console.log("Coach updated (email already existed):");
} else {
  await sql`
    INSERT INTO users (
      id, email, name, role, password_hash, status, created_at, overall, phone, bio, preferred_language
    ) VALUES (
      ${ID},
      ${EMAIL.toLowerCase()},
      ${NAME},
      'coach',
      ${password_hash},
      'active',
      ${createdAt},
      0,
      ${"+351 900 000 099"},
      ${"Demo account for the coach panel."},
      'pt'
    )
  `;
  console.log("Coach created:");
}

console.log(`  Email: ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log("  Role: coach · status: active");
