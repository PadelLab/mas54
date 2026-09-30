import "server-only";
import { applyRowLevelSecurity, recreateLookupUserForLogin } from "./apply-rls";
import type { Sql } from "./neon-client";
import { slugifyEventTitle } from "@/lib/events-shared";

/** Bump when adding DDL in `runMigrations`. */
export const SCHEMA_VERSION = 27;

export async function runMigrations(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const versionRows = (await sql`
    SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1
  `) as { version: number }[];
  let currentVersion = Number(versionRows[0]?.version) || 0;
  if (currentVersion >= 22 && currentVersion < 23) {
    await recreateLookupUserForLogin(sql);
    await sql`
      INSERT INTO schema_migrations (version) VALUES (23)
      ON CONFLICT (version) DO NOTHING
    `;
    currentVersion = 23;
  }
  if (currentVersion >= 24 && currentVersion < 25) {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS license_reminder_sent_for TIMESTAMPTZ`;
    await sql`
      INSERT INTO schema_migrations (version) VALUES (25)
      ON CONFLICT (version) DO NOTHING
    `;
    currentVersion = 25;
  }
  if (currentVersion >= 25 && currentVersion < 26) {
    await sql`
      DO $padel_role_developer_to_superadmin$
      BEGIN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
        UPDATE public.users SET role = 'superadmin'
        WHERE role IN ('developer', 'desarrollador', 'administrador');
        ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
          role IN ('student', 'coach', 'superadmin', 'coach_admin')
        );
      END
      $padel_role_developer_to_superadmin$
    `;
    await applyRowLevelSecurity(sql);
    await sql`
      INSERT INTO schema_migrations (version) VALUES (26)
      ON CONFLICT (version) DO NOTHING
    `;
    currentVersion = 26;
  }
  if (currentVersion >= SCHEMA_VERSION) return;

  await sql`
    CREATE TABLE IF NOT EXISTS lesson_activity_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    ALTER TABLE lesson_activity_categories ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
  `;
  await sql`ALTER TABLE IF EXISTS lessons ADD COLUMN IF NOT EXISTS decline_reason TEXT`;
  await sql`ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS venue TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_court_id_courts_id_fk`;
  await sql`DROP INDEX IF EXISTS events_court_idx`;
  await sql`ALTER TABLE IF EXISTS events DROP COLUMN IF EXISTS court_id`;
  const eventsRel = (await sql`SELECT to_regclass('public.events') AS rel`) as { rel: string | null }[];
  if (eventsRel[0]?.rel) {
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT ''`;
    const missingSlug = (await sql`
      SELECT id, title FROM events WHERE slug = ''
    `) as { id: string; title: string }[];
    if (missingSlug.length > 0) {
      const takenRows = (await sql`SELECT slug FROM events WHERE slug <> ''`) as { slug: string }[];
      const taken = new Set(takenRows.map((r) => r.slug));
      for (const row of missingSlug) {
        const base = slugifyEventTitle(row.title);
        let slug = base;
        let n = 2;
        while (taken.has(slug)) {
          slug = `${base}-${n++}`;
        }
        taken.add(slug);
        await sql`UPDATE events SET slug = ${slug} WHERE id = ${row.id}`;
      }
    }
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS events_slug_uidx ON events (slug)`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      access_expires_at TIMESTAMPTZ,
      overall INT NOT NULL DEFAULT 0,
      phone TEXT,
      bio TEXT,
      avatar_url TEXT,
      preferred_language TEXT,
      neon_auth_user_id TEXT
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS neon_auth_user_id TEXT
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS license_reminder_sent_for TIMESTAMPTZ
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_neon_auth_user_id_uidx ON users (neon_auth_user_id)
  `;
  /**
   * Fill IDs already known in the same Postgres (Neon Auth). This is not the login flow:
   * email is only used for this one-off backfill of old rows.
   */
  await sql`
    DO $padel_neon_id_backfill$
    DECLARE
      src_schema text;
      src_table text;
      src_email text;
      stmt text;
    BEGIN
      SELECT c.table_schema, c.table_name, c.column_name
      INTO src_schema, src_table, src_email
      FROM information_schema.columns c
      WHERE c.column_name IN ('email', 'email_address')
        AND c.table_schema IN ('neon_auth', 'auth', 'better_auth')
        AND EXISTS (
          SELECT 1 FROM information_schema.columns i
          WHERE i.table_schema = c.table_schema
            AND i.table_name = c.table_name
            AND i.column_name = 'id'
        )
      ORDER BY
        CASE c.table_schema WHEN 'neon_auth' THEN 0 ELSE 1 END,
        CASE c.table_name WHEN 'user' THEN 0 WHEN 'users' THEN 1 ELSE 2 END
      LIMIT 1;

      IF src_schema IS NULL THEN
        RETURN;
      END IF;

      stmt := format(
        'UPDATE public.users u
         SET neon_auth_user_id = n.id::text
         FROM %I.%I n
         WHERE u.neon_auth_user_id IS NULL
           AND LOWER(u.email) = LOWER(n.%I)
           AND n.id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM public.users x WHERE x.neon_auth_user_id = n.id::text
           )',
        src_schema,
        src_table,
        src_email
      );
      EXECUTE stmt;
    END
    $padel_neon_id_backfill$
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS courts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      court_type TEXT NOT NULL DEFAULT 'Standard',
      court_number TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL,
      indoor BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
  await sql`
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS court_type TEXT NOT NULL DEFAULT 'Standard'
  `;
  await sql`
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS court_number TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      type TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS events_slug_uidx ON events (slug)`;
  await sql`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS venue TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS event_signups (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_signups_event ON event_signups(event_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_signups_user ON event_signups(user_id)`;
  /**
   * Drizzle databases: `event_type` enum. Value `outro` for generic events.
   */
  await sql`
    DO $padel_event_type_outro$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'event_type'
          AND t.typtype = 'e'
          AND n.nspname = 'public'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'event_type'
          AND n.nspname = 'public'
          AND e.enumlabel = 'outro'
      ) THEN
        ALTER TYPE public.event_type ADD VALUE 'outro';
      END IF;
    END
    $padel_event_type_outro$
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      coach_id TEXT NOT NULL,
      court_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL,
      lesson_activity_id TEXT,
      lesson_type TEXT,
      notes TEXT,
      decline_reason TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      coach_id TEXT NOT NULL,
      score INT NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      category TEXT,
      competencies TEXT,
      skills TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_activity_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    ALTER TABLE lesson_activity_categories ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_activities (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      has_sides BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL
    )
  `;
  /**
   * Drizzle databases use ENUM `user_role` (see `drizzle/0000_init_padellab.sql`).
   * Without this value, any reference to `professor_administrador` fails at runtime.
   * Older databases with only `role TEXT` (this ddl) skip the block: type `user_role` does not exist.
   */
  await sql`
    DO $padel_user_role_mig$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role'
          AND t.typtype = 'e'
          AND n.nspname = 'public'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role'
          AND n.nspname = 'public'
          AND e.enumlabel = 'professor_administrador'
      ) THEN
        ALTER TYPE public.user_role ADD VALUE 'professor_administrador';
      END IF;
    END
    $padel_user_role_mig$
  `;
  /**
   * Rename role `administrador` → `desarrollador` (Drizzle ENUM or legacy TEXT).
   */
  await sql`
    DO $padel_role_admin_to_dev$
    BEGIN
      -- ENUM: rename value when present
      IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND n.nspname = 'public' AND e.enumlabel = 'administrador'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND n.nspname = 'public' AND e.enumlabel = 'desarrollador'
      ) THEN
        ALTER TYPE public.user_role RENAME VALUE 'administrador' TO 'desarrollador';
      END IF;

      -- TEXT: update rows + CHECK
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'users'
          AND c.column_name = 'role'
          AND c.data_type IN ('text', 'character varying')
      ) THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        UPDATE users SET role = 'desarrollador' WHERE role = 'administrador';
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
          role IN (
            'aluno', 'professor', 'desarrollador', 'professor_administrador',
            'student', 'coach', 'developer', 'superadmin', 'coach_admin'
          )
        );
      END IF;
    END
    $padel_role_admin_to_dev$
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_feed_enabled BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS lesson_reminders_enabled BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS lesson_request_alerts_enabled BOOLEAN NOT NULL DEFAULT true`;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS evaluation_alerts_enabled BOOLEAN NOT NULL DEFAULT true
  `;
  await sql`
    DO $padel_roles_to_english$
    BEGIN
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
      UPDATE public.users SET role = CASE role
        WHEN 'aluno' THEN 'student'
        WHEN 'professor' THEN 'coach'
        WHEN 'professor_administrador' THEN 'coach_admin'
        WHEN 'desarrollador' THEN 'superadmin'
        WHEN 'administrador' THEN 'superadmin'
        WHEN 'developer' THEN 'superadmin'
        ELSE role
      END
      WHERE role IN (
        'aluno', 'professor', 'professor_administrador', 'desarrollador', 'administrador', 'developer'
      );
      ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
        role IN ('student', 'coach', 'superadmin', 'coach_admin')
      );
    END
    $padel_roles_to_english$
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT`;
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_age_check`;
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS age`;
  await sql`
    DO $padel_rename_professor_id$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'professor_id'
      ) THEN
        ALTER TABLE public.lessons RENAME COLUMN professor_id TO coach_id;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'evaluations' AND column_name = 'professor_id'
      ) THEN
        ALTER TABLE public.evaluations RENAME COLUMN professor_id TO coach_id;
      END IF;
    END
    $padel_rename_professor_id$
  `;
  await sql`
    UPDATE users SET status = CASE status
      WHEN 'ativo' THEN 'active'
      WHEN 'pendente' THEN 'pending'
      WHEN 'expirado' THEN 'expired'
      WHEN 'desativado' THEN 'deactivated'
      ELSE status
    END
    WHERE status IN ('ativo', 'pendente', 'expirado', 'desativado')
  `;
  await sql`
    UPDATE lessons SET status = CASE status
      WHEN 'pendente' THEN 'pending'
      WHEN 'confirmada' THEN 'confirmed'
      WHEN 'recusada' THEN 'declined'
      WHEN 'concluida' THEN 'completed'
      ELSE status
    END
    WHERE status IN ('pendente', 'confirmada', 'recusada', 'concluida')
  `;
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check`;
  await sql`
    UPDATE users SET gender = CASE gender
      WHEN 'homem' THEN 'male'
      WHEN 'mulher' THEN 'female'
      WHEN 'outro' THEN 'other'
      ELSE gender
    END
    WHERE gender IN ('homem', 'mulher', 'outro')
  `;
  await sql`
    DO $padel_users_gender_check_en$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_gender_check CHECK (
          gender IS NULL OR gender IN ('male', 'female', 'other')
        );
      END IF;
    END
    $padel_users_gender_check_en$
  `;
  /** Students no longer need approval: leftover pending accounts become active. */
  await sql`
    UPDATE users
    SET
      status = 'active',
      access_expires_at = COALESCE(access_expires_at, NOW() + INTERVAL '3 months')
    WHERE role IN ('aluno', 'student') AND status IN ('pendente', 'pending')
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS coach_weekly_availability (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      weekday SMALLINT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_coach_weekly_coach ON coach_weekly_availability(coach_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS coach_blocked_dates (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      UNIQUE (coach_id, date)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_coach_blocked_coach ON coach_blocked_dates(coach_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS coach_agenda_entries (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'available'
    )
  `;
  await sql`ALTER TABLE coach_agenda_entries ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'available'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_coach_agenda_coach ON coach_agenda_entries(coach_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_coach_agenda_date ON coach_agenda_entries(coach_id, date)`;
  await sql`
    CREATE TABLE IF NOT EXISTS user_two_factor (
      user_id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      secret_enc TEXT,
      pending_secret_enc TEXT,
      backup_hashes TEXT NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auth_mail_suppress (
      email TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      until TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    DO $padel_english_identifiers$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'courts' AND column_name = 'numero'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'courts' AND column_name = 'court_number'
        ) THEN
          ALTER TABLE public.courts RENAME COLUMN numero TO court_number;
        ELSE
          UPDATE public.courts SET court_number = numero WHERE court_number = '' AND numero <> '';
          ALTER TABLE public.courts DROP COLUMN numero;
        END IF;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'local'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'venue'
        ) THEN
          ALTER TABLE public.events RENAME COLUMN local TO venue;
        ELSE
          UPDATE public.events SET venue = local WHERE venue = '' AND local <> '';
          ALTER TABLE public.events DROP COLUMN local;
        END IF;
      END IF;

      IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'event_type' AND t.typtype = 'e' AND n.nspname = 'public'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'torneio'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'tournament'
        ) THEN
          ALTER TYPE public.event_type RENAME VALUE 'torneio' TO 'tournament';
        END IF;
        IF EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'clinica'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'clinic'
        ) THEN
          ALTER TYPE public.event_type RENAME VALUE 'clinica' TO 'clinic';
        END IF;
        IF EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'aula_grupo'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'group_lesson'
        ) THEN
          ALTER TYPE public.event_type RENAME VALUE 'aula_grupo' TO 'group_lesson';
        END IF;
        IF EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'outro'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'other'
        ) THEN
          ALTER TYPE public.event_type RENAME VALUE 'outro' TO 'other';
        END IF;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'type'
          AND data_type IN ('text', 'character varying')
      ) THEN
        UPDATE public.events SET type = CASE type
          WHEN 'torneio' THEN 'tournament'
          WHEN 'clinica' THEN 'clinic'
          WHEN 'aula_grupo' THEN 'group_lesson'
          WHEN 'outro' THEN 'other'
          ELSE type
        END
        WHERE type IN ('torneio', 'clinica', 'aula_grupo', 'outro');
      END IF;
    END
    $padel_english_identifiers$
  `;
  await applyRowLevelSecurity(sql);
  await sql`
    INSERT INTO schema_migrations (version) VALUES (${SCHEMA_VERSION})
    ON CONFLICT (version) DO NOTHING
  `;
}
