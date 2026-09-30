import "server-only";
import type { Sql } from "./neon-client";

const APP_ROLE = "padellab_app";

export async function recreateLookupUserForLogin(sql: Sql) {
  await sql`DROP FUNCTION IF EXISTS public.lookup_user_for_login(text)`;
  await sql`
    CREATE OR REPLACE FUNCTION public.lookup_user_for_login(p_email text)
    RETURNS TABLE (
      id text,
      email text,
      name text,
      role text,
      status text,
      session_version integer,
      must_change_password boolean
    )
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT
        u.id,
        u.email,
        u.name,
        u.role::text,
        u.status::text,
        COALESCE(u.session_version, 0)::int,
        COALESCE(u.must_change_password, false)
      FROM public.users u
      WHERE LOWER(u.email) = LOWER(p_email)
      LIMIT 1
    $fn$
  `;
  await sql`REVOKE ALL ON FUNCTION public.lookup_user_for_login(text) FROM PUBLIC`;
  await sql`GRANT EXECUTE ON FUNCTION public.lookup_user_for_login(text) TO padellab_app`;
}

/**
 * Postgres RLS.
 *
 * Being the database owner (`datdba`) does not imply BYPASSRLS. Here `neondb_owner`
 * ignores policies for two independent reasons, both checkable in `pg_roles` / `pg_class`:
 * 1. It is the `relowner` of the tables and RLS is not FORCE (`relforcerowsecurity = false`),
 *    so the table owner is not subject to the policies.
 * 2. In this Neon project, `neondb_owner.rolbypassrls = true` (not a superuser).
 *
 * `padellab_app` is NOLOGIN NOBYPASSRLS and does not own the tables: policies apply
 * only after `SET LOCAL ROLE padellab_app` (see `withAppSql`).
 *
 * `FORCE ROW LEVEL SECURITY` stays off: `neondb_owner` has BYPASSRLS and needs
 * to see all rows in migrations (`getSql`).
 */
export async function applyRowLevelSecurity(sql: Sql) {
  await sql`
    DO $padel_rls_role$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'padellab_app') THEN
        CREATE ROLE padellab_app NOLOGIN NOINHERIT NOBYPASSRLS;
      END IF;
    END
    $padel_rls_role$
  `;
  await sql`GRANT padellab_app TO CURRENT_USER`;
  await sql`GRANT USAGE ON SCHEMA public TO padellab_app`;

  await sql`
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      public.users,
      public.courts,
      public.events,
      public.event_signups,
      public.lessons,
      public.evaluations,
      public.lesson_activities,
      public.lesson_activity_categories,
      public.coach_weekly_availability,
      public.coach_agenda_entries,
      public.coach_blocked_dates,
      public.password_reset_tokens
    TO padellab_app
  `;

  await sql`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO padellab_app
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.app_user_id()
    RETURNS text
    LANGUAGE sql
    STABLE
    AS $fn$
      SELECT NULLIF(current_setting('app.user_id', true), '')
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.app_user_role()
    RETURNS text
    LANGUAGE sql
    STABLE
    AS $fn$
      SELECT COALESCE(NULLIF(current_setting('app.user_role', true), ''), 'anon')
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.app_is_admin()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $fn$
      SELECT public.app_user_role() IN ('superadmin', 'coach_admin')
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.app_is_coach()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $fn$
      SELECT public.app_user_role() IN ('coach', 'coach_admin', 'superadmin')
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.app_is_authenticated()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $fn$
      SELECT public.app_user_id() IS NOT NULL AND public.app_user_role() <> 'anon'
    $fn$
  `;

  await recreateLookupUserForLogin(sql);

  await sql`DROP FUNCTION IF EXISTS public.lookup_user_by_neon_auth_id(text)`;
  await sql`
    CREATE OR REPLACE FUNCTION public.lookup_user_by_neon_auth_id(p_neon_auth_user_id text)
    RETURNS TABLE (
      id text,
      email text,
      name text,
      role text,
      status text,
      session_version integer,
      must_change_password boolean
    )
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT
        u.id,
        u.email,
        u.name,
        u.role::text,
        u.status::text,
        COALESCE(u.session_version, 0)::int,
        COALESCE(u.must_change_password, false)
      FROM public.users u
      WHERE u.neon_auth_user_id = NULLIF(btrim(p_neon_auth_user_id), '')
      LIMIT 1
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.user_email_taken(p_email text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT EXISTS (
        SELECT 1 FROM public.users u WHERE LOWER(u.email) = LOWER(p_email)
      )
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.user_email_taken_except(p_email text, p_except_id text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT EXISTS (
        SELECT 1 FROM public.users u
        WHERE LOWER(u.email) = LOWER(p_email)
          AND u.id <> p_except_id
      )
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.sweep_expired_student_access()
    RETURNS void
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      UPDATE public.users
      SET status = 'expired'
      WHERE role = 'student'
        AND status = 'active'
        AND access_expires_at IS NOT NULL
        AND access_expires_at < NOW()
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.bump_session_version_by_email(p_email text)
    RETURNS TABLE (id text, session_version integer)
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      UPDATE public.users u
      SET session_version = COALESCE(u.session_version, 0) + 1
      WHERE LOWER(u.email) = LOWER(p_email)
      RETURNING u.id, u.session_version
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.clear_lesson_activity_refs(p_category_id text, p_activity_id text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      IF p_category_id IS NOT NULL THEN
        UPDATE public.lessons
        SET lesson_activity_id = NULL
        WHERE lesson_activity_id IN (
          SELECT a.id FROM public.lesson_activities a WHERE a.category_id = p_category_id
        );
      ELSIF p_activity_id IS NOT NULL THEN
        UPDATE public.lessons
        SET lesson_activity_id = NULL
        WHERE lesson_activity_id = p_activity_id;
      END IF;
    END
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.recompute_student_overall(p_student_id text)
    RETURNS void
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      UPDATE public.users u
      SET overall = COALESCE((
        SELECT ROUND(AVG(e.score))::int
        FROM public.evaluations e
        WHERE e.student_id = p_student_id
      ), 0)
      WHERE u.id = p_student_id
        AND u.role = 'student'
        AND (public.app_is_admin() OR public.app_is_coach())
    $fn$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS public.user_two_factor (
      user_id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      secret_enc TEXT,
      pending_secret_enc TEXT,
      backup_hashes TEXT NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE public.user_two_factor ENABLE ROW LEVEL SECURITY`;
  await sql`REVOKE ALL ON TABLE public.user_two_factor FROM padellab_app`;

  await sql`
    CREATE OR REPLACE FUNCTION public.two_factor_is_enabled(p_user_id text)
    RETURNS boolean
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT COALESCE((SELECT t.enabled FROM public.user_two_factor t WHERE t.user_id = p_user_id), false)
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.two_factor_load(p_user_id text)
    RETURNS TABLE (
      enabled boolean,
      secret_enc text,
      pending_secret_enc text,
      backup_hashes text
    )
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT t.enabled, t.secret_enc, t.pending_secret_enc, t.backup_hashes
      FROM public.user_two_factor t
      WHERE t.user_id = p_user_id
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.two_factor_upsert(
      p_user_id text,
      p_enabled boolean,
      p_secret_enc text,
      p_pending_secret_enc text,
      p_backup_hashes text
    )
    RETURNS void
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      INSERT INTO public.user_two_factor (user_id, enabled, secret_enc, pending_secret_enc, backup_hashes, updated_at)
      VALUES (p_user_id, p_enabled, p_secret_enc, p_pending_secret_enc, COALESCE(p_backup_hashes, '[]'), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        secret_enc = EXCLUDED.secret_enc,
        pending_secret_enc = EXCLUDED.pending_secret_enc,
        backup_hashes = EXCLUDED.backup_hashes,
        updated_at = NOW()
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.two_factor_session_user(p_user_id text)
    RETURNS TABLE (id text, role text, session_version integer)
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      SELECT u.id, u.role::text, COALESCE(u.session_version, 0)::int
      FROM public.users u
      WHERE u.id = p_user_id
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.two_factor_delete(p_user_id text)
    RETURNS void
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
      DELETE FROM public.user_two_factor WHERE user_id = p_user_id
    $fn$
  `;

  await sql`REVOKE ALL ON FUNCTION public.lookup_user_for_login(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.lookup_user_by_neon_auth_id(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.user_email_taken(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.user_email_taken_except(text, text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.sweep_expired_student_access() FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.bump_session_version_by_email(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.clear_lesson_activity_refs(text, text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.recompute_student_overall(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.two_factor_is_enabled(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.two_factor_load(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.two_factor_upsert(text, boolean, text, text, text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.two_factor_delete(text) FROM PUBLIC`;
  await sql`REVOKE ALL ON FUNCTION public.two_factor_session_user(text) FROM PUBLIC`;
  await sql`GRANT EXECUTE ON FUNCTION public.two_factor_is_enabled(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.two_factor_load(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.two_factor_upsert(text, boolean, text, text, text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.two_factor_delete(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.two_factor_session_user(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.lookup_user_for_login(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.lookup_user_by_neon_auth_id(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.user_email_taken(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.user_email_taken_except(text, text) TO padellab_app`;
  /* sweep / bump: owner only (getSql), not padellab_app. */
  await sql`REVOKE EXECUTE ON FUNCTION public.sweep_expired_student_access() FROM padellab_app`;
  await sql`REVOKE EXECUTE ON FUNCTION public.bump_session_version_by_email(text) FROM padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.clear_lesson_activity_refs(text, text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.recompute_student_overall(text) TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.app_user_id() TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.app_user_role() TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.app_is_admin() TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.app_is_coach() TO padellab_app`;
  await sql`GRANT EXECUTE ON FUNCTION public.app_is_authenticated() TO padellab_app`;

  await sql`
    CREATE OR REPLACE FUNCTION public.users_privileged_write_guard()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public
    AS $fn$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls
      ) THEN
        RETURN NEW;
      END IF;

      IF TG_OP = 'INSERT' THEN
        IF public.app_is_admin() THEN
          IF NEW.role NOT IN ('student', 'coach', 'coach_admin', 'superadmin') THEN
            RAISE EXCEPTION 'not allowed to create this user' USING ERRCODE = '42501';
          END IF;
          RETURN NEW;
        END IF;
        IF public.app_user_role() = 'anon'
           AND NEW.role = 'student'
           AND NEW.status IN ('active', 'pending') THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'not allowed to create this user' USING ERRCODE = '42501';
      END IF;

      IF TG_OP = 'UPDATE' THEN
        IF (
          NEW.role IS DISTINCT FROM OLD.role
          OR NEW.status IS DISTINCT FROM OLD.status
          OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
          OR NEW.access_expires_at IS DISTINCT FROM OLD.access_expires_at
          OR NEW.neon_auth_user_id IS DISTINCT FROM OLD.neon_auth_user_id
        ) AND NOT public.app_is_admin() THEN
          RAISE EXCEPTION 'not allowed to change privileged user fields' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
      END IF;

      RETURN NEW;
    END
    $fn$
  `;
  await sql`REVOKE ALL ON FUNCTION public.users_privileged_write_guard() FROM PUBLIC`;
  await sql`GRANT EXECUTE ON FUNCTION public.users_privileged_write_guard() TO padellab_app`;
  await sql`DROP TRIGGER IF EXISTS users_privileged_write_guard ON public.users`;
  await sql`
    CREATE TRIGGER users_privileged_write_guard
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.users_privileged_write_guard()
  `;

  await sql`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.events ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.lesson_activities ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.lesson_activity_categories ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.coach_weekly_availability ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.coach_agenda_entries ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.coach_blocked_dates ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY`;

  await sql`
    DO $padel_drop_rls_policies$
    DECLARE
      r record;
    BEGIN
      FOR r IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public' AND policyname LIKE 'rls_%'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
      END LOOP;
    END
    $padel_drop_rls_policies$
  `;

  await sql`
    CREATE POLICY rls_users_select ON public.users
    FOR SELECT TO padellab_app
    USING (
      public.app_is_admin()
      OR id = public.app_user_id()
      OR (public.app_is_coach() AND role IN ('student', 'coach', 'coach_admin', 'superadmin'))
      OR (public.app_user_role() = 'student' AND role IN ('coach', 'coach_admin', 'superadmin'))
    )
  `;

  /* Create accounts: anon student only; staff only superadmin / coach_admin (Accounts). */
  await sql`
    CREATE POLICY rls_users_insert ON public.users
    FOR INSERT TO padellab_app
    WITH CHECK (
      (
        public.app_is_admin()
        AND role IN ('student', 'coach', 'coach_admin', 'superadmin')
      )
      OR (
        public.app_user_role() = 'anon'
        AND role = 'student'
        AND status IN ('active', 'pending')
      )
    )
  `;

  /* Other accounts: superadmin and coach-admin only. Users update their own profile. */
  await sql`
    CREATE POLICY rls_users_update ON public.users
    FOR UPDATE TO padellab_app
    USING (
      public.app_is_admin()
      OR id = public.app_user_id()
    )
    WITH CHECK (
      public.app_is_admin()
      OR (id = public.app_user_id() AND role::text = public.app_user_role())
    )
  `;

  await sql`
    CREATE POLICY rls_users_delete ON public.users
    FOR DELETE TO padellab_app
    USING (
      public.app_is_admin()
      OR id = public.app_user_id()
    )
  `;

  await sql`
    CREATE POLICY rls_courts_select ON public.courts
    FOR SELECT TO padellab_app
    USING (public.app_is_authenticated())
  `;
  await sql`
    CREATE POLICY rls_courts_write ON public.courts
    FOR ALL TO padellab_app
    USING (public.app_is_admin())
    WITH CHECK (public.app_is_admin())
  `;

  await sql`
    CREATE POLICY rls_events_select ON public.events
    FOR SELECT TO padellab_app
    USING (public.app_is_authenticated())
  `;
  await sql`
    CREATE POLICY rls_events_write ON public.events
    FOR ALL TO padellab_app
    USING (public.app_is_admin())
    WITH CHECK (public.app_is_admin())
  `;

  /* Full list: coach, admin, and superadmin. A student sees only their own signup. */
  await sql`
    CREATE POLICY rls_event_signups_select ON public.event_signups
    FOR SELECT TO padellab_app
    USING (
      public.app_is_admin()
      OR public.app_is_coach()
      OR user_id = public.app_user_id()
    )
  `;
  await sql`
    CREATE POLICY rls_event_signups_insert ON public.event_signups
    FOR INSERT TO padellab_app
    WITH CHECK (
      public.app_is_admin()
      OR user_id = public.app_user_id()
    )
  `;
  await sql`
    CREATE POLICY rls_event_signups_delete ON public.event_signups
    FOR DELETE TO padellab_app
    USING (
      public.app_is_admin()
      OR user_id = public.app_user_id()
    )
  `;

  await sql`
    CREATE POLICY rls_lessons_select ON public.lessons
    FOR SELECT TO padellab_app
    USING (
      public.app_is_admin()
      OR student_id = public.app_user_id()
      OR coach_id = public.app_user_id()
      OR (
        public.app_user_role() = 'student'
        AND coach_id IN (
          SELECT u.id FROM public.users u
          WHERE u.role IN ('coach', 'coach_admin', 'superadmin')
        )
      )
    )
  `;
  await sql`
    CREATE POLICY rls_lessons_insert ON public.lessons
    FOR INSERT TO padellab_app
    WITH CHECK (
      public.app_is_admin()
      OR public.app_is_coach()
      OR student_id = public.app_user_id()
    )
  `;
  await sql`
    CREATE POLICY rls_lessons_update ON public.lessons
    FOR UPDATE TO padellab_app
    USING (
      public.app_is_admin()
      OR coach_id = public.app_user_id()
    )
    WITH CHECK (
      public.app_is_admin()
      OR coach_id = public.app_user_id()
    )
  `;
  await sql`
    CREATE POLICY rls_lessons_delete ON public.lessons
    FOR DELETE TO padellab_app
    USING (
      public.app_is_admin()
      OR coach_id = public.app_user_id()
    )
  `;

  await sql`
    CREATE POLICY rls_evaluations_select ON public.evaluations
    FOR SELECT TO padellab_app
    USING (
      public.app_is_admin()
      OR student_id = public.app_user_id()
      OR coach_id = public.app_user_id()
    )
  `;
  await sql`
    CREATE POLICY rls_evaluations_write ON public.evaluations
    FOR INSERT TO padellab_app
    WITH CHECK (
      public.app_is_admin()
      OR coach_id = public.app_user_id()
    )
  `;
  await sql`
    CREATE POLICY rls_evaluations_update ON public.evaluations
    FOR UPDATE TO padellab_app
    USING (
      public.app_is_admin()
      OR coach_id = public.app_user_id()
    )
    WITH CHECK (
      public.app_is_admin()
      OR coach_id = public.app_user_id()
    )
  `;
  await sql`
    CREATE POLICY rls_evaluations_delete ON public.evaluations
    FOR DELETE TO padellab_app
    USING (
      public.app_is_admin()
      OR coach_id = public.app_user_id()
      OR student_id = public.app_user_id()
    )
  `;

  await sql`
    CREATE POLICY rls_catalog_select ON public.lesson_activity_categories
    FOR SELECT TO padellab_app
    USING (public.app_is_authenticated())
  `;
  await sql`
    CREATE POLICY rls_catalog_write ON public.lesson_activity_categories
    FOR ALL TO padellab_app
    USING (public.app_is_coach() OR public.app_is_admin())
    WITH CHECK (public.app_is_coach() OR public.app_is_admin())
  `;
  await sql`
    CREATE POLICY rls_activities_select ON public.lesson_activities
    FOR SELECT TO padellab_app
    USING (public.app_is_authenticated())
  `;
  await sql`
    CREATE POLICY rls_activities_write ON public.lesson_activities
    FOR ALL TO padellab_app
    USING (public.app_is_coach() OR public.app_is_admin())
    WITH CHECK (public.app_is_coach() OR public.app_is_admin())
  `;

  await sql`
    CREATE POLICY rls_agenda_select ON public.coach_agenda_entries
    FOR SELECT TO padellab_app
    USING (
      public.app_is_admin()
      OR public.app_is_coach()
      OR public.app_user_role() = 'student'
    )
  `;
  await sql`
    CREATE POLICY rls_agenda_write ON public.coach_agenda_entries
    FOR ALL TO padellab_app
    USING (public.app_is_admin() OR coach_id = public.app_user_id())
    WITH CHECK (public.app_is_admin() OR coach_id = public.app_user_id())
  `;

  await sql`
    CREATE POLICY rls_weekly_select ON public.coach_weekly_availability
    FOR SELECT TO padellab_app
    USING (
      public.app_is_admin()
      OR public.app_is_coach()
      OR public.app_user_role() = 'student'
    )
  `;
  await sql`
    CREATE POLICY rls_weekly_write ON public.coach_weekly_availability
    FOR ALL TO padellab_app
    USING (public.app_is_admin() OR coach_id = public.app_user_id())
    WITH CHECK (public.app_is_admin() OR coach_id = public.app_user_id())
  `;

  await sql`
    CREATE POLICY rls_blocked_select ON public.coach_blocked_dates
    FOR SELECT TO padellab_app
    USING (
      public.app_is_admin()
      OR public.app_is_coach()
      OR public.app_user_role() = 'student'
    )
  `;
  await sql`
    CREATE POLICY rls_blocked_write ON public.coach_blocked_dates
    FOR ALL TO padellab_app
    USING (public.app_is_admin() OR coach_id = public.app_user_id())
    WITH CHECK (public.app_is_admin() OR coach_id = public.app_user_id())
  `;

  /* No anonymous access: password reset goes through Neon Auth, not this table. */
  await sql`
    CREATE POLICY rls_reset_tokens ON public.password_reset_tokens
    FOR ALL TO padellab_app
    USING (
      public.app_is_admin()
      OR user_id = public.app_user_id()
    )
    WITH CHECK (
      public.app_is_admin()
      OR user_id = public.app_user_id()
    )
  `;

  void APP_ROLE;
}
