import "server-only";
import type { UserRole } from "@/lib/types";
import { parseUserRole } from "@/lib/role-utils";
import type { Sql } from "./neon-client";

export type ClubUserLookup = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  session_version: number;
  must_change_password?: boolean;
};

function asDbBool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true";
}

function mapClubUserLookup(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  session_version: number;
  must_change_password?: unknown;
} | undefined): ClubUserLookup | null {
  if (!row) return null;
  const role = parseUserRole(row.role);
  if (!role) return null;
  return { ...row, role, must_change_password: asDbBool(row.must_change_password) };
}

/** Contact (OTP, reset). Do not use as a login identifier. */
export async function lookupUserForLogin(sql: Sql, email: string): Promise<ClubUserLookup | null> {
  const rows = (await sql`
    SELECT id, email, name, role, status, session_version, must_change_password
    FROM public.lookup_user_for_login(${email})
  `) as {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    session_version: number;
    must_change_password: boolean;
  }[];
  return mapClubUserLookup(rows[0]);
}

export async function lookupUserByNeonAuthId(
  sql: Sql,
  neonAuthUserId: string,
): Promise<ClubUserLookup | null> {
  const id = neonAuthUserId.trim();
  if (!id) return null;
  const rows = (await sql`
    SELECT id, email, name, role, status, session_version, must_change_password
    FROM public.lookup_user_by_neon_auth_id(${id})
  `) as {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    session_version: number;
    must_change_password: boolean;
  }[];
  return mapClubUserLookup(rows[0]);
}

export async function userEmailTaken(sql: Sql, email: string): Promise<boolean> {
  const rows = (await sql`SELECT public.user_email_taken(${email}) AS taken`) as { taken: boolean }[];
  return Boolean(rows[0]?.taken);
}

export async function userEmailTakenExcept(sql: Sql, email: string, exceptId: string): Promise<boolean> {
  const rows = (await sql`
    SELECT public.user_email_taken_except(${email}, ${exceptId}) AS taken
  `) as { taken: boolean }[];
  return Boolean(rows[0]?.taken);
}

export async function bumpSessionVersionByEmail(
  sql: Sql,
  email: string,
): Promise<{ id: string; session_version: number } | null> {
  const rows = (await sql`
    SELECT id, session_version FROM public.bump_session_version_by_email(${email})
  `) as { id: string; session_version: number }[];
  return rows[0] ?? null;
}
