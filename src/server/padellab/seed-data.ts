import "server-only";
import type { Sql } from "./neon-client";
import { createDefaultLessonActivityCatalog } from "@/lib/padel-activities";
import {
  seedCourts,
  seedEvents,
  seedEvaluations,
  seedLessons,
  seedUsers,
} from "@/lib/seed";
import { SCHEMA_VERSION, runMigrations } from "./ddl";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./password";

export async function insertSeedData(sql: Sql) {
  const catalog = createDefaultLessonActivityCatalog();

  /* Seed accounts have no neon_auth_user_id: login requires the Neon Auth ID. */
  for (const u of seedUsers) {
    const password_hash = await hashPassword(randomBytes(32).toString("hex"));
    await sql`
      INSERT INTO users (
        id, email, name, role, password_hash, status, created_at, access_expires_at, overall, phone, bio, avatar_url, preferred_language
      ) VALUES (
        ${u.id},
        ${u.email.toLowerCase()},
        ${u.name},
        ${u.role},
        ${password_hash},
        ${u.status},
        ${u.createdAt},
        ${u.accessExpiresAt ?? null},
        ${u.overall},
        ${u.phone ?? null},
        ${u.bio ?? null},
        ${u.avatarUrl ?? null},
        ${u.preferredLanguage ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const c of seedCourts) {
    await sql`
      INSERT INTO courts (id, name, court_type, court_number, address, surface, indoor)
      VALUES (${c.id}, ${c.name}, ${c.courtType ?? "Standard"}, ${c.courtNumber ?? ""}, ${c.address ?? ""}, ${c.surface}, ${c.indoor})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const cat of catalog.categories) {
    await sql`
      INSERT INTO lesson_activity_categories (id, name, sort_order, description)
      VALUES (${cat.id}, ${cat.name}, ${cat.sortOrder}, ${cat.description ?? ""})
    `;
  }

  for (const a of catalog.activities) {
    await sql`
      INSERT INTO lesson_activities (id, category_id, name, has_sides, active, sort_order)
      VALUES (${a.id}, ${a.categoryId}, ${a.name}, ${a.hasSides}, ${a.active}, ${a.sortOrder})
    `;
  }

  for (const ev of seedEvents) {
    await sql`
      INSERT INTO events (id, title, date, time, address, venue, description, created_by, type, slug)
      VALUES (${ev.id}, ${ev.title}, ${ev.date}, ${ev.time}, ${ev.address ?? ""}, ${ev.venue ?? ""}, ${ev.description ?? ""}, ${ev.createdBy}, ${ev.type}, ${ev.slug})
    `;
  }

  for (const l of seedLessons) {
    await sql`
      INSERT INTO lessons (
        id, student_id, coach_id, court_id, date, time, status, lesson_activity_id, lesson_type, notes
      ) VALUES (
        ${l.id},
        ${l.studentId},
        ${l.coachId},
        ${l.courtId},
        ${l.date},
        ${l.time},
        ${l.status},
        ${l.lessonActivityId ?? null},
        ${l.lessonType ?? null},
        ${l.notes ?? null}
      )
    `;
  }

  for (const ev of seedEvaluations) {
    await sql`
      INSERT INTO evaluations (
        id, student_id, coach_id, score, comment, created_at, category, competencies, skills
      ) VALUES (
        ${ev.id},
        ${ev.studentId},
        ${ev.coachId},
        ${ev.score},
        ${ev.comment},
        ${ev.createdAt},
        ${ev.category ?? null},
        ${ev.competencies != null ? JSON.stringify(ev.competencies) : null},
        ${ev.skills != null ? JSON.stringify(ev.skills) : null}
      )
    `;
  }
}

let appliedSchemaVersion = -1;
let bootstrapInFlight: Promise<void> | null = null;

export async function bootstrapDatabase(sql: Sql) {
  if (appliedSchemaVersion >= SCHEMA_VERSION) return;
  if (appliedSchemaVersion >= 0 && appliedSchemaVersion < SCHEMA_VERSION) {
    bootstrapInFlight = null;
  }
  if (!bootstrapInFlight) {
    bootstrapInFlight = (async () => {
      await runMigrations(sql);
      const countRows = (await sql`SELECT COUNT(*)::int AS count FROM users`) as { count: number }[];
      const count = countRows[0]?.count ?? 0;
      if (count === 0) await insertSeedData(sql);
      appliedSchemaVersion = SCHEMA_VERSION;
    })().catch((e) => {
      bootstrapInFlight = null;
      throw e;
    });
  }
  await bootstrapInFlight;
}
