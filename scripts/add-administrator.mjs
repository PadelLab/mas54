/**
 * Create an admin user (role coach_admin) in the app and Neon Auth.
 */
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getScriptSql } from "./neon-sql.mjs";

const ID = "u-administrador";
const EMAIL = "administrador@padellab.com";
const NAME = "Administrador Padel Lab";
const PASSWORD = loadEnvLocal("BOOTSTRAP_ADMIN_PASSWORD");
if (!PASSWORD) {
  throw new Error("Set BOOTSTRAP_ADMIN_PASSWORD in .env.local (do not commit it).");
}
const ROLE = "coach_admin";

function loadEnvLocal(key) {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return process.env[key]?.trim() || "";
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.startsWith(`${key}=`)) continue;
    let v = t.slice(`${key}=`.length).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return process.env[key]?.trim() || "";
}

async function createNeonAuthUser(email, password, name) {
  const base = loadEnvLocal("NEON_AUTH_BASE_URL").replace(/\/$/, "");
  if (!base) {
    throw new Error("NEON_AUTH_BASE_URL is missing from .env.local");
  }
  // Localhost is pre-trusted in Neon Auth; NEXT_PUBLIC_APP_URL may be a tunnel not in Domains.
  const origin = "http://localhost:3000";
  const res = await fetch(`${base}/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({
      email,
      password,
      name,
      callbackURL: origin,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(data?.message ?? data?.error ?? res.statusText);
    if (/already|exists|duplicate|já/i.test(msg)) return { ok: true, existed: true };
    throw new Error(`Neon Auth: ${msg}`);
  }
  return { ok: true, existed: false };
}

const sql = getScriptSql();
const password_hash = await bcrypt.hash(PASSWORD, 10);
const createdAt = new Date().toISOString();
const email = EMAIL.toLowerCase();

const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${email} LIMIT 1`;

if (existing.length) {
  await sql`
    UPDATE users SET
      name = ${NAME},
      role = ${ROLE},
      password_hash = ${password_hash},
      status = 'active',
      preferred_language = 'pt'
    WHERE id = ${existing[0].id}
  `;
  console.log("Administrador atualizado na app (e-mail já existia).");
} else {
  await sql`
    INSERT INTO users (
      id, email, name, role, password_hash, status, created_at, overall, preferred_language
    ) VALUES (
      ${ID},
      ${email},
      ${NAME},
      ${ROLE},
      ${password_hash},
      'active',
      ${createdAt},
      0,
      'pt'
    )
  `;
  console.log("Administrador criado na app.");
}

const neon = await createNeonAuthUser(email, PASSWORD, NAME);
console.log(neon.existed ? "Já existia no Neon Auth." : "Criado no Neon Auth.");
console.log(`  E-mail: ${EMAIL}`);
console.log(`  Senha:  ${PASSWORD}`);
console.log("  Papel:  treinador e administrador · status: ativo");
