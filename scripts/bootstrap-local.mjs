/**
 * Create tables + seed data in local Postgres (Docker).
 * Usage: node scripts/bootstrap-local.mjs
 */
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getScriptSql } from "./neon-sql.mjs";
import { runMigrations } from "./run-migrations.mjs";

function loadEnvLocal(key) {
  const fromEnv = process.env[key]?.trim() || "";
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return fromEnv;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.startsWith(`${key}=`)) continue;
    let v = t.slice(`${key}=`.length).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return fromEnv;
}

const SEED_PASSWORD = loadEnvLocal("SEED_PASSWORD");
if (!SEED_PASSWORD) {
  throw new Error("Set SEED_PASSWORD in .env.local for local bootstrap (do not commit it).");
}

const USERS = [
  {
    id: "u-admin",
    email: "admin@padellab.com",
    name: "Superadmin Padel Lab",
    role: "superadmin",
    password: SEED_PASSWORD,
    status: "active",
  },
  {
    id: "u-admin-teste",
    email: "admin.teste@padellab.com",
    name: "Superadmin Teste",
    role: "superadmin",
    password: SEED_PASSWORD,
    status: "active",
  },
  {
    id: "u-prof",
    email: "professor@padellab.com",
    name: "Marina Duarte",
    role: "coach",
    password: SEED_PASSWORD,
    status: "active",
  },
  {
    id: "u-prof-teste",
    email: "prof.teste@padellab.com",
    name: "Professor Teste",
    role: "coach",
    password: SEED_PASSWORD,
    status: "active",
  },
  {
    id: "u-aluno",
    email: "aluno@padellab.com",
    name: "João Silva",
    role: "student",
    password: SEED_PASSWORD,
    status: "active",
  },
  {
    id: "u-pendente",
    email: "pendente@padellab.com",
    name: "Ana Costa",
    role: "student",
    password: SEED_PASSWORD,
    status: "deactivated",
  },
];

const COURTS = [
  {
    id: "c1",
    name: "Central Court",
    courtType: "Outdoor",
    courtNumber: "1",
    address: "Club Street 42 — Main hall",
    surface: "Artificial turf",
    indoor: false,
  },
  {
    id: "c2",
    name: "Indoor Court A",
    courtType: "Indoor",
    courtNumber: "2",
    address: "Club Street 42 — Covered hall, door B",
    surface: "Artificial turf",
    indoor: true,
  },
  {
    id: "c3",
    name: "Indoor Court B",
    courtType: "Indoor",
    courtNumber: "3",
    address: "Club Street 42 — Covered hall, door C",
    surface: "Artificial turf",
    indoor: true,
  },
];

/** Default category/activity catalog (same as createDefaultLessonActivityCatalog). */
const CATEGORY_SECTIONS = [
  {
    id: "defensa",
    name: "Defensa",
    activities: [
      { id: "defensa-general", name: "Defensa" },
      { id: "derecha-directa", name: "Derecha directa" },
      { id: "reves-directo", name: "Revés directo" },
      { id: "salida-pared-dr", name: "Salida de pared ( D y R )", hasSides: true },
      { id: "salida-pared-volcadita-dr", name: "Salida de pared volcadita ( D y R )", hasSides: true },
      { id: "bajada-pared-dr", name: "Bajada de pared ( D y R )", hasSides: true },
      { id: "pared-lateral", name: "Pared lateral" },
      { id: "doble-vidrio-lat-fondo", name: "Doble vidrio ( lateral - fondo )" },
      { id: "doble-vidrio-fondo-lat", name: "Doble vidrio ( fondo - lateral )" },
      { id: "vidrio-fondo-giros", name: "Vidrio de fondo con giros" },
      { id: "globos-directo-dr", name: "Globos directo ( D y R )", hasSides: true },
      { id: "globos-vidrios-dr", name: "Globos con vidrios ( D y R )", hasSides: true },
      { id: "defensa-reja", name: "Defensa de reja" },
      { id: "contra-vidrios-fondo", name: "Contra vidrios de fondo" },
      { id: "contra-vidrios-lateral", name: "Contra vidrios lateral" },
    ],
  },
  {
    id: "transicion",
    name: "Transición",
    activities: [
      { id: "voleas-bloqueo", name: "Voleas de bloqueo" },
      { id: "voleas-globo", name: "Voleas de globo" },
      { id: "volea-contra-golpe", name: "Volea contra golpe" },
      { id: "bote-pronto", name: "Bote pronto" },
      { id: "recuperacion-globo", name: "Recuperación de globo" },
      { id: "recuperacion-globo-rincon", name: "Recuperación de globo al rincón" },
      { id: "recuperacion-smash", name: "Recuperación de smash" },
    ],
  },
  {
    id: "ataque",
    name: "Ataque",
    activities: [
      { id: "voleas-dr", name: "Voleas ( D y R )", hasSides: true },
      { id: "voleas-bajas-dr", name: "Voleas bajas ( D y R )", hasSides: true },
      { id: "drop-dejadita", name: "Drop shot, dejadita" },
      { id: "voleas-reja", name: "Voleas a la reja" },
      { id: "bandeja", name: "Bandeja" },
      { id: "bandeja-salto", name: "Bandeja con salto" },
      { id: "vibora", name: "Víbora" },
      { id: "gancho", name: "Gancho" },
      { id: "rulo", name: "Rulo" },
      { id: "smash", name: "Smash" },
      { id: "smash-x3", name: "Smash x3" },
      { id: "smash-x4", name: "Smash x4" },
    ],
  },
  {
    id: "servicios",
    name: "Servicios y resto",
    activities: [
      { id: "saque", name: "Saque" },
      { id: "saque-americana", name: "Saque en americana" },
      { id: "saque-australiano", name: "Saque en australiano" },
    ],
  },
];

let sql;
try {
  sql = getScriptSql();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

console.log("A aplicar migrations…");
await runMigrations(sql);

console.log("Creating/updating users…");
const createdAt = new Date().toISOString();
for (const u of USERS) {
  const password_hash = await bcrypt.hash(u.password, 10);
  await sql`
    INSERT INTO users (id, email, name, role, password_hash, status, created_at, overall)
    VALUES (
      ${u.id},
      ${u.email.toLowerCase()},
      ${u.name},
      ${u.role},
      ${password_hash},
      ${u.status},
      ${createdAt},
      0
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      status = EXCLUDED.status
  `;
}

console.log("Creating sample courts…");
for (const c of COURTS) {
  await sql`
    INSERT INTO courts (id, name, court_type, court_number, address, surface, indoor)
    VALUES (${c.id}, ${c.name}, ${c.courtType}, ${c.courtNumber}, ${c.address}, ${c.surface}, ${c.indoor})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      court_type = EXCLUDED.court_type,
      court_number = EXCLUDED.court_number,
      address = EXCLUDED.address,
      surface = EXCLUDED.surface,
      indoor = EXCLUDED.indoor
  `;
}

const courtCount = await sql`SELECT COUNT(*)::int AS count FROM courts`;
console.log(`✓ ${courtCount[0]?.count ?? 0} court(s) in the database.`);

console.log("Creating lesson categories and activities…");
for (let si = 0; si < CATEGORY_SECTIONS.length; si++) {
  const section = CATEGORY_SECTIONS[si];
  await sql`
    INSERT INTO lesson_activity_categories (id, name, sort_order)
    VALUES (${section.id}, ${section.name}, ${si})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order
  `;
  for (let ai = 0; ai < section.activities.length; ai++) {
    const act = section.activities[ai];
    await sql`
      INSERT INTO lesson_activities (id, category_id, name, has_sides, active, sort_order)
      VALUES (
        ${act.id},
        ${section.id},
        ${act.name},
        ${Boolean(act.hasSides)},
        ${true},
        ${ai}
      )
      ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        has_sides = EXCLUDED.has_sides,
        active = EXCLUDED.active,
        sort_order = EXCLUDED.sort_order
    `;
  }
}

const catCount = await sql`SELECT COUNT(*)::int AS count FROM lesson_activity_categories`;
const actCount = await sql`SELECT COUNT(*)::int AS count FROM lesson_activities`;
console.log(`✓ ${catCount[0]?.count ?? 0} categories and ${actCount[0]?.count ?? 0} activities in the database.`);

console.log("\n✓ Sign-in at http://localhost:3000/login with SEED_PASSWORD from .env.local (not stored in git).\n");
