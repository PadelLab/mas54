import type { User } from "@/lib/types";

/** Static routes under `/admin/users/...` that must not clash with a slug. */
const RESERVED_ADMIN_SLUGS = new Set([
  "new",
  "students",
  "coaches",
  "administrators",
  "teachers",
  "access",
  "edit",
]);

/** Convert the name to a URL segment (without the database id). */
export function slugifyPersonName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "user";
}

/** @deprecated use slugifyPersonName */
export const slugifyStudentName = slugifyPersonName;

function shortHash(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(6, "0").slice(0, 6);
}

function scopedUsers(users: User[], scope: "student" | "all"): User[] {
  return scope === "student" ? users.filter((u) => u.role === "student") : users;
}

/**
 * Public key. Uniqueness uses only the `scope` visible in this session (already
 * filtered by RLS): students among themselves, or all roles on admin accounts.
 */
export function userPublicKey(
  person: User,
  users: User[],
  scope: "student" | "all" = "all",
  avoidReserved = false,
): string {
  const pool = scopedUsers(users, scope);
  const base = slugifyPersonName(person.name);
  const reserved = avoidReserved && RESERVED_ADMIN_SLUGS.has(base);
  const clashes = pool.filter((u) => slugifyPersonName(u.name) === base);
  if (!reserved && clashes.length <= 1) return base;
  return `${base}-${shortHash(person.id)}`;
}

/** @deprecated use userPublicKey(..., "student") */
export function studentPublicKey(student: User, users: User[]): string {
  return userPublicKey(student, users, "student");
}

export function findUserByUrlKey(
  users: User[],
  key: string,
  scope: "student" | "all" = "all",
  avoidReserved = false,
): User | undefined {
  const decoded = decodeURIComponent(key);
  const pool = scopedUsers(users, scope);
  const bySlug = pool.find((u) => userPublicKey(u, users, scope, avoidReserved) === decoded);
  if (bySlug) return bySlug;
  const byName = pool.filter((u) => slugifyPersonName(u.name) === decoded);
  if (byName.length === 1) return byName[0];
  return pool.find((u) => u.id === decoded);
}

export function findStudentByUrlKey(users: User[], key: string): User | undefined {
  return findUserByUrlKey(users, key, "student");
}

export function userAccountPath(
  area: "admin" | "coach",
  person: User,
  users: User[],
  mode: "view" | "edit" = "view",
): string {
  const scope = person.role === "student" ? "student" : "all";
  const key = userPublicKey(person, users, scope, area === "admin");
  const root = area === "admin" ? `/admin/users/${key}` : `/coach/students/${key}`;
  return mode === "edit" ? `${root}/edit` : root;
}

export function studentOverallPath(area: "admin" | "coach", student: User, users: User[]): string {
  const root = area === "admin" ? "/admin/students" : "/coach/students";
  return `${root}/${userPublicKey(student, users, "student")}/overall`;
}
