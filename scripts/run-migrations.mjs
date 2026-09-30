/** Migrations CLI — mirrors src/server/padellab/ddl.ts */
export async function runMigrations(sql) {
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
      preferred_language TEXT
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0`;
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
  await sql`ALTER TABLE courts ADD COLUMN IF NOT EXISTS court_type TEXT NOT NULL DEFAULT 'Standard'`;
  await sql`ALTER TABLE courts ADD COLUMN IF NOT EXISTS court_number TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE courts ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      court_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      type TEXT NOT NULL
    )
  `;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS venue TEXT NOT NULL DEFAULT ''`;
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
  await sql`
    DO $padel_event_type_outro$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'event_type' AND t.typtype = 'e' AND n.nspname = 'public'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'event_type' AND n.nspname = 'public' AND e.enumlabel = 'outro'
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
      notes TEXT
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
      sort_order INT NOT NULL
    )
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
  await sql`
    DO $padel_user_role_mig$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND t.typtype = 'e' AND n.nspname = 'public'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND n.nspname = 'public' AND e.enumlabel = 'professor_administrador'
      ) THEN
        ALTER TYPE public.user_role ADD VALUE 'professor_administrador';
      END IF;
    END
    $padel_user_role_mig$
  `;
  await sql`
    DO $padel_role_admin_to_dev$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND n.nspname = 'public' AND e.enumlabel = 'administrador'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_role' AND n.nspname = 'public' AND e.enumlabel = 'desarrollador'
      ) THEN
        ALTER TYPE public.user_role RENAME VALUE 'administrador' TO 'desarrollador';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = 'users'
          AND c.column_name = 'role' AND c.data_type IN ('text', 'character varying')
      ) THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        UPDATE users SET role = 'desarrollador' WHERE role = 'administrador';
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
          role IN ('aluno', 'professor', 'desarrollador', 'professor_administrador')
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
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`;
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
    DO $padel_users_demographics_check$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_gender_check CHECK (
          gender IS NULL OR gender IN ('male', 'female', 'other')
        );
      END IF;
    END
    $padel_users_demographics_check$
  `;
  /** Students no longer need approval: "pending" accounts become active. */
  await sql`
    UPDATE users
    SET
      status = 'active',
      access_expires_at = COALESCE(access_expires_at, NOW() + INTERVAL '3 months')
    WHERE role = 'aluno' AND status = 'pending'
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
}
