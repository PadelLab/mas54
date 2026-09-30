import type { UserRole } from "./types";

/** Valid values for the `users.role` column (English in the database). */
export const ALL_USER_ROLES: UserRole[] = [
  "student",
  "coach",
  "superadmin",
  "coach_admin",
];

/** Legacy roles (PT/ES and previous English value) → current values. */
const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  aluno: "student",
  professor: "coach",
  desarrollador: "superadmin",
  administrador: "superadmin",
  developer: "superadmin",
  professor_administrador: "coach_admin",
};

/** Normalize a role from the DB or a request (accepts legacy values). */
export function parseUserRole(raw: string | null | undefined): UserRole | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  if ((ALL_USER_ROLES as string[]).includes(v)) return v as UserRole;
  return LEGACY_ROLE_MAP[v] ?? null;
}

export function parseUserRoleOrStudent(raw: string | null | undefined): UserRole {
  return parseUserRole(raw) ?? "student";
}

/** Short label (fallback; prefer i18n `Profile.roles.*`). */
export function formatUserRoleLabel(role: UserRole): string {
  switch (role) {
    case "student":
      return "Student";
    case "coach":
      return "Coach";
    case "superadmin":
      return "Super administrator";
    case "coach_admin":
      return "Coach and administrator";
    default:
      return role;
  }
}

export function hasAdminPrivileges(role: UserRole): boolean {
  return role === "superadmin" || role === "coach_admin";
}

/** Admin panel (/admin/*): superadmin only. */
export function isDeveloper(role: UserRole): boolean {
  return role === "superadmin";
}

/** Can use the coach area and give lessons (includes superadmin, who also has the admin panel). */
export function hasCoachPrivileges(role: UserRole): boolean {
  return role === "coach" || role === "coach_admin" || role === "superadmin";
}

/** Coaches list/card in Accounts — coach and coach-admin (professor + administrador). */
export function appearsInCoachesUserList(role: UserRole): boolean {
  return role === "coach" || role === "coach_admin";
}

/** Administrators list/card in Accounts — superadmin and coach-admin. */
export function appearsInAdministratorsUserList(role: UserRole): boolean {
  return role === "superadmin" || role === "coach_admin";
}

/** Coach only, without the admin panel. */
export function isCoachOnly(role: UserRole): boolean {
  return role === "coach";
}

/**
 * Edit another account's profile data:
 * superadmin and coach-admin — any user.
 * A regular coach can view only; they cannot change the account.
 */
export function canManageOtherUserProfile(actorRole: UserRole, _targetRole: UserRole): boolean {
  return hasAdminPrivileges(actorRole);
}

/** Profile page (read-only) of the signed-in user, by role. */
export function profilePathForUserRole(role: UserRole, preferAdmin = false): string {
  if (role === "student") return "/student/profile";
  if (role === "superadmin") return "/admin/profile";
  if (role === "coach_admin") return "/coach/profile";
  if (role === "coach") return "/coach/profile";
  return "/student/profile";
}

/** Home route (dashboard) after login or role-based redirect. */
export function homePathForUserRole(role: UserRole): string {
  if (role === "student") return "/student/home";
  if (isDeveloper(role)) return "/admin/analytics";
  if (hasCoachPrivileges(role)) return "/coach/home";
  return "/admin/analytics";
}
