import "server-only";
import { randomUUID } from "crypto";
import type { Sql } from "./neon-client";
import type {
  AccountStatus,
  Court,
  Evaluation,
  EventItem,
  Lesson,
  LessonActivity,
  CoachAccessRole,
  SkillAxisKey,
  UserGender,
  UserRole,
} from "@/lib/types";
import {
  ALL_USER_ROLES,
  canManageOtherUserProfile,
  hasAdminPrivileges,
  hasCoachPrivileges,
  isCoachOnly,
  parseUserRole,
} from "@/lib/role-utils";
import { COMPETENCY_KEYS, SKILL_AXIS_KEYS } from "@/lib/types";
import { isValidPhoneNumber } from "libphonenumber-js/min";
import { dateToIsoLocal, validateBirthDateForRegistration } from "@/lib/birth-date";
import { isIsoCountryCode } from "@/lib/iso-regions";
import { addMonths } from "@/lib/utils";
import { hmToMinutes, isCoachSlotAvailable } from "@/lib/coach-availability";
import {
  eventScheduleStartUtcMs,
  normalizeDbEventDateString,
  normalizeDbEventTimeString,
  todayYmdInAppTz,
} from "@/lib/schedule-date";
import { passwordPolicyApiMessage, validateAppPassword } from "@/lib/password-policy";
import { isAppLocale } from "@/lib/app-locale";
import { EMAIL_API_MESSAGE, isValidAppEmail } from "@/lib/email-format";
import { parseEventType, slugifyEventTitle } from "@/lib/events-shared";
import { after } from "next/server";
import { sendLessonCalendarInvite } from "./lesson-calendar-mail";
import { sendLessonDeclineMail } from "./lesson-decline-mail";
import { sendLessonRequestAlert } from "./lesson-request-mail";
import { sendEvaluationAlert, topSkillAxisLabel } from "./evaluation-alert-mail";
import { sendAccountDeletedEmail } from "./account-deleted-mail";
import { sendStudentWelcomeEmail } from "./student-welcome-mail";
import { sendPasswordChangedEmail } from "./password-changed-mail";
import { sendStaffCredentialsEmail } from "./staff-credentials-mail";
import { formatSessionCookieValue, isSessionCookieValid, parseSessionCookieValue } from "./session-cookie";
import { changeNeonAuthPassword, createNeonAuthUser } from "./neon-auth-sync";
import { userEmailTaken, userEmailTakenExcept } from "./club-user-lookup";
import { isTempAlphanumericPassword } from "@/lib/temp-password";
import { generateTempPassword, hashPassword } from "./password";

const ALLOWED_GENDERS = new Set<UserGender>(["male", "female", "other"]);

function parseDemographicsFromBody(body: Record<string, unknown>):
  | { ok: true; nationality: string; birthDate: string; gender: UserGender }
  | { ok: false; message: string } {
  const nationalityRaw = String(body.nationality ?? "").trim().toUpperCase();
  const birthRaw = String(body.birthDate ?? body.birth_date ?? "").trim();
  const birth = validateBirthDateForRegistration(birthRaw);
  const genderRaw = String(body.gender ?? "").trim();
  const gender = (
    genderRaw === "homem" ? "male" : genderRaw === "mulher" ? "female" : genderRaw === "outro" ? "other" : genderRaw
  ) as UserGender;
  if (!isIsoCountryCode(nationalityRaw)) {
    return { ok: false, message: "Selecione uma nacionalidade válida na lista." };
  }
  if (!birth.ok) return birth;
  if (!ALLOWED_GENDERS.has(gender)) {
    return { ok: false, message: "Selecione o gênero: homem, mulher ou outro." };
  }
  return { ok: true, nationality: nationalityRaw, birthDate: birth.iso, gender };
}

async function allocateEventSlug(sql: Sql, title: string, excludeId?: string): Promise<string> {
  const base = slugifyEventTitle(title);
  let slug = base;
  let n = 2;
  for (;;) {
    const rows = (
      excludeId
        ? await sql`SELECT id FROM events WHERE slug = ${slug} AND id <> ${excludeId} LIMIT 1`
        : await sql`SELECT id FROM events WHERE slug = ${slug} LIMIT 1`
    ) as { id: string }[];
    if (rows.length === 0) return slug;
    slug = `${base}-${n++}`;
  }
}

export type MutationResult = {
  ok: boolean;
  message?: string;
  id?: string;
  /** When set, the route should write the session cookie (`userId|sessionVersion` or legacy `userId` only). */
  setCookieUserId?: string | null;
  /** When true, the route clears the session cookie (e.g. account deleted). */
  clearSessionCookie?: boolean;
  /** Signup finished; the email confirmation code still needs to be confirmed. */
  needsEmailVerification?: boolean;
  /** Staff account created; if false, the temporary-password email was not sent. */
  emailSent?: boolean;
  /** Temporary password generated on this create (this moment only; not stored in clear text). */
  tempPassword?: string;
};

function rejectIfPasswordPolicyFails(password: string): MutationResult | null {
  const v = validateAppPassword(password);
  if (v.ok) return null;
  return { ok: false, message: passwordPolicyApiMessage(v.code) };
}

async function getActor(sql: Sql, sessionRaw: string | undefined): Promise<{ id: string; role: UserRole } | null> {
  const parsed = parseSessionCookieValue(sessionRaw);
  if (!parsed) return null;
  const rows = (await sql`
    SELECT id, role, COALESCE(session_version, 0)::int AS session_version
    FROM users WHERE id = ${parsed.userId}
  `) as { id: string; role: UserRole; session_version: number }[];
  const row = rows[0];
  if (!row) return null;
  const role = parseUserRole(row.role);
  if (!role) return null;
  if (!isSessionCookieValid(parsed.version, row.session_version)) return null;
  return { id: row.id, role };
}

function accountLocaleFromBody(body: Record<string, unknown>): string {
  const raw = String(body.preferredLanguage ?? body.locale ?? "")
    .trim()
    .toLowerCase();
  const base = raw.split("-")[0] ?? raw;
  return isAppLocale(base) ? base : "es";
}

function queueAfterResponse(task: () => Promise<void>) {
  try {
    after(() => {
      void task();
    });
  } catch {
    void task();
  }
}

async function deleteUserCascade(sql: Sql, id: string) {
  await sql`DELETE FROM event_signups WHERE event_id IN (SELECT id FROM events WHERE created_by = ${id})`;
  await sql`DELETE FROM events WHERE created_by = ${id}`;
  await sql`DELETE FROM event_signups WHERE user_id = ${id}`;
  await sql`DELETE FROM evaluations WHERE student_id = ${id} OR coach_id = ${id}`;
  await sql`DELETE FROM lessons WHERE student_id = ${id} OR coach_id = ${id}`;
  await sql`DELETE FROM coach_agenda_entries WHERE coach_id = ${id}`;
  await sql`DELETE FROM coach_blocked_dates WHERE coach_id = ${id}`;
  await sql`DELETE FROM coach_weekly_availability WHERE coach_id = ${id}`;
  await sql`SELECT public.two_factor_delete(${id})`;
  await sql`DELETE FROM users WHERE id = ${id}`;
}

async function queueStudentEvaluationAlert(
  sql: Sql,
  input: {
    studentId: string;
    coachId: string;
    score: number;
    date?: string | null;
    time?: string | null;
    skills?: Partial<Record<SkillAxisKey, number>> | null;
  },
) {
  const rows = (await sql`
    SELECT
      s.email AS student_email,
      s.preferred_language AS student_locale,
      COALESCE(s.evaluation_alerts_enabled, true) AS student_alerts,
      p.name AS coach_name
    FROM users s, users p
    WHERE s.id = ${input.studentId} AND p.id = ${input.coachId}
  `) as {
    student_email: string;
    student_locale: string | null;
    student_alerts: boolean;
    coach_name: string;
  }[];
  const row = rows[0];
  if (!row?.student_email || !row.student_alerts) return;
  const payload = {
    to: row.student_email,
    locale: row.student_locale,
    coachName: row.coach_name,
    score: input.score,
    date: input.date,
    time: input.time,
    topStrength: topSkillAxisLabel(input.skills, row.student_locale),
  };
  queueAfterResponse(() => sendEvaluationAlert(payload));
}

function isUniqueEmailViolation(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /idx_users_email_lower|users_neon_auth_user_id_uidx|duplicate key value/i.test(msg);
}

function emailTakenMessage() {
  return { ok: false as const, message: EMAIL_API_MESSAGE.taken };
}

function emailInvalidMessage() {
  return { ok: false as const, message: EMAIL_API_MESSAGE.invalid };
}

function requireActor(actor: { id: string; role: UserRole } | null): MutationResult | null {
  if (!actor) return { ok: false, message: "Sessão expirada. Faça login novamente." };
  return null;
}

export async function handlePadellabMutation(
  sql: Sql,
  body: Record<string, unknown>,
  sessionId: string | undefined
): Promise<MutationResult> {
  if (body.action === "create_professor_access") body.action = "create_coach_access";
  const lessonBody = body.lesson;
  if (lessonBody && typeof lessonBody === "object") {
    const lesson = lessonBody as Record<string, unknown>;
    if (lesson.coachId == null && lesson.professorId != null) lesson.coachId = lesson.professorId;
  }
  const evaluationBody = body.evaluation;
  if (evaluationBody && typeof evaluationBody === "object") {
    const evaluation = evaluationBody as Record<string, unknown>;
    if (evaluation.coachId == null && evaluation.professorId != null) evaluation.coachId = evaluation.professorId;
  }
  const action = String(body.action ?? "");
  const actor = await getActor(sql, sessionId);

  if (action === "register_student") {
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name || !email || !password) return { ok: false, message: "Preencha todos os campos." };
    if (!isValidAppEmail(email)) return emailInvalidMessage();
    const policyStudent = rejectIfPasswordPolicyFails(password);
    if (policyStudent) return policyStudent;
    const demo = parseDemographicsFromBody(body);
    if (!demo.ok) return demo;
    const dup = await userEmailTaken(sql, email);
    if (dup) return emailTakenMessage();
    const neon = await createNeonAuthUser({ email, password, name });
    if (!neon.ok) return { ok: false, message: neon.message };
    const id = `u-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const password_hash = await hashPassword(password);
    const accountLocale = accountLocaleFromBody(body);
    try {
    await sql`
      INSERT INTO users (
        id, email, name, role, password_hash, status, created_at, access_expires_at, overall, preferred_language,
        nationality, birth_date, gender, neon_auth_user_id
      ) VALUES (
        ${id},
        ${email},
        ${name},
        ${"student"},
        ${password_hash},
        ${"active"},
        ${createdAt},
        ${addMonths(createdAt, 3)},
        ${0},
        ${accountLocale},
        ${demo.nationality},
        ${demo.birthDate},
        ${demo.gender},
        ${neon.userId}
      )
    `;
    } catch (e) {
      if (isUniqueEmailViolation(e)) return emailTakenMessage();
      throw e;
    }
    queueAfterResponse(() =>
      sendStudentWelcomeEmail({
        to: email,
        name,
        locale: accountLocale,
      }),
    );
    return { ok: true, needsEmailVerification: true };
  }

  if (action === "register_professor" || action === "register_coach") {
    return { ok: false, message: "Sem permissão." };
  }

  const denied = requireActor(actor);
  if (denied) return denied;

  if (action === "set_calendar_feed_enabled") {
    const enabled = Boolean(body.enabled);
    await sql`UPDATE users SET calendar_feed_enabled = ${enabled} WHERE id = ${actor!.id}`;
    return { ok: true };
  }

  if (action === "set_lesson_reminders_enabled") {
    const enabled = Boolean(body.enabled);
    await sql`UPDATE users SET lesson_reminders_enabled = ${enabled} WHERE id = ${actor!.id}`;
    return { ok: true };
  }

  if (action === "set_lesson_request_alerts_enabled") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const enabled = Boolean(body.enabled);
    await sql`UPDATE users SET lesson_request_alerts_enabled = ${enabled} WHERE id = ${actor!.id}`;
    return { ok: true };
  }

  if (action === "set_evaluation_alerts_enabled") {
    const enabled = Boolean(body.enabled);
    await sql`UPDATE users SET evaluation_alerts_enabled = ${enabled} WHERE id = ${actor!.id}`;
    return { ok: true };
  }

  if (action === "update_profile") {
    const id = String(body.id ?? "");
    const patch = (body.patch ?? {}) as Partial<{
      name: string;
      email: string;
      phone: string;
      bio: string;
      avatarUrl: string;
      preferredLanguage: string;
      nationality: string;
      birthDate: string;
      gender: string;
    }>;
    if (!id) return { ok: false, message: "Usuário inválido." };
    if (typeof patch.email === "string") {
      const em = patch.email.trim().toLowerCase();
      if (!isValidAppEmail(em)) return emailInvalidMessage();
      if (await userEmailTakenExcept(sql, em, id)) {
        return { ok: false, message: EMAIL_API_MESSAGE.taken };
      }
    }
    const curRows = (await sql`
      SELECT name, email, phone, bio, avatar_url, preferred_language, nationality, birth_date, gender, role
      FROM users WHERE id = ${id}
    `) as {
      name: string;
      email: string;
      phone: string | null;
      bio: string | null;
      avatar_url: string | null;
      preferred_language: string | null;
      nationality: string | null;
      birth_date: string | Date | null;
      gender: string | null;
      role: string;
    }[];
    const cur = curRows[0];
    if (!cur) return { ok: false, message: "Usuário não encontrado." };
    const targetRole = parseUserRole(cur.role);
    if (!targetRole) return { ok: false, message: "Usuário não encontrado." };
    if (
      actor!.id !== id &&
      !canManageOtherUserProfile(actor!.role, targetRole)
    ) {
      return { ok: false, message: "Sem permissão." };
    }

    const patchKeys = Object.keys(patch) as string[];
    const cosmeticOnly =
      patchKeys.length > 0 && patchKeys.every((k) => k === "avatarUrl" || k === "preferredLanguage");
    if (cosmeticOnly) {
      const avatar_url = patch.avatarUrl !== undefined ? patch.avatarUrl || null : cur.avatar_url;
      const preferred_language =
        patch.preferredLanguage !== undefined ? patch.preferredLanguage || null : cur.preferred_language;
      await sql`
        UPDATE users SET
          avatar_url = ${avatar_url},
          preferred_language = ${preferred_language}
        WHERE id = ${id}
      `;
      return { ok: true };
    }

    const name = typeof patch.name === "string" ? patch.name.trim() : cur.name;
    const email = typeof patch.email === "string" ? patch.email.trim().toLowerCase() : cur.email;
    let phone: string | null;
    if (patch.phone !== undefined) {
      const raw = typeof patch.phone === "string" ? patch.phone.trim() : "";
      const next = raw || null;
      if (next) {
        if (!isValidPhoneNumber(next)) {
          return { ok: false, message: "Telefone inválido. Use o número completo para o país selecionado." };
        }
      }
      phone = next;
    } else {
      phone = cur.phone;
    }
    const bio = patch.bio !== undefined ? patch.bio || null : cur.bio;
    const avatar_url = patch.avatarUrl !== undefined ? patch.avatarUrl || null : cur.avatar_url;
    const preferred_language =
      patch.preferredLanguage !== undefined ? patch.preferredLanguage || null : cur.preferred_language;

    let nationality =
      patch.nationality !== undefined ? String(patch.nationality).trim() : (cur.nationality ?? "").trim();
    if (nationality.length === 2) {
      const u = nationality.toUpperCase();
      if (!isIsoCountryCode(u)) {
        return { ok: false, message: "Selecione uma nacionalidade válida na lista." };
      }
      nationality = u;
    } else if (nationality.length > 0 && nationality.length < 3) {
      return { ok: false, message: "Selecione uma nacionalidade válida na lista." };
    } else if (nationality.length > 80) {
      return { ok: false, message: "Nacionalidade inválida." };
    }
    const curBirthIso =
      cur.birth_date != null
        ? typeof cur.birth_date === "string"
          ? cur.birth_date.slice(0, 10)
          : dateToIsoLocal(new Date(cur.birth_date))
        : "";
    let nextBirthDate = curBirthIso;
    if (patch.birthDate !== undefined) {
      const v = validateBirthDateForRegistration(String(patch.birthDate).trim());
      if (!v.ok) return v;
      nextBirthDate = v.iso;
    }
    let nextGender: UserGender | null =
      cur.gender === "male" || cur.gender === "female" || cur.gender === "other"
        ? cur.gender
        : null;
    if (patch.gender !== undefined) {
      const raw = String(patch.gender).trim();
      const g = (
        raw === "homem" ? "male" : raw === "mulher" ? "female" : raw === "outro" ? "other" : raw
      ) as UserGender;
      if (!ALLOWED_GENDERS.has(g)) {
        return { ok: false, message: "Selecione o gênero: homem, mulher ou outro." };
      }
      nextGender = g;
    }
    if (nationality.length < 2) {
      return { ok: false, message: "Indique a nacionalidade." };
    }
    if (!nextBirthDate) {
      return { ok: false, message: "Indique uma data de nascimento válida." };
    }
    const birthCheck = validateBirthDateForRegistration(nextBirthDate);
    if (!birthCheck.ok) return birthCheck;
    if (!nextGender) {
      return { ok: false, message: "Selecione o gênero: homem, mulher ou outro." };
    }

    try {
      await sql`
      UPDATE users SET
        name = ${name},
        email = ${email},
        phone = ${phone},
        bio = ${bio},
        avatar_url = ${avatar_url},
        preferred_language = ${preferred_language},
        nationality = ${nationality},
        birth_date = ${birthCheck.iso},
        gender = ${nextGender}
      WHERE id = ${id}
    `;
    } catch (e) {
      if (isUniqueEmailViolation(e)) return { ok: false, message: EMAIL_API_MESSAGE.taken };
      throw e;
    }
    return { ok: true };
  }

  if (action === "change_password") {
    const id = String(body.id ?? "");
    const current = String(body.current ?? "");
    const next = String(body.next ?? "");
    const revokeOtherSessions = Boolean(body.revoke_other_sessions ?? body.sign_out_other_devices);
    if (actor!.id !== id) return { ok: false, message: "Sem permissão." };
    const policyNext = validateAppPassword(next);
    if (!policyNext.ok) return { ok: false, message: passwordPolicyApiMessage(policyNext.code) };
    const neon = await changeNeonAuthPassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions,
    });
    if (!neon.ok) return { ok: false, message: neon.message };
    const mailRows = (await sql`
      SELECT email, name, preferred_language FROM users WHERE id = ${id} LIMIT 1
    `) as { email: string; name: string | null; preferred_language: string | null }[];
    const mailbox = mailRows[0]?.email?.trim().toLowerCase() ?? "";
    if (mailbox.includes("@")) {
      queueAfterResponse(() =>
        sendPasswordChangedEmail({
          to: mailbox,
          name: mailRows[0]?.name,
          locale: mailRows[0]?.preferred_language,
        }),
      );
    }
    await sql`UPDATE users SET must_change_password = false WHERE id = ${id}`;
    if (revokeOtherSessions) {
      await sql`UPDATE users SET session_version = COALESCE(session_version, 0) + 1 WHERE id = ${id}`;
      const vrows = (await sql`
        SELECT COALESCE(session_version, 0)::int AS sv FROM users WHERE id = ${id}
      `) as { sv: number }[];
      const sv = vrows[0]?.sv ?? 0;
      return { ok: true, setCookieUserId: formatSessionCookieValue(id, sv) };
    }
    return { ok: true };
  }

  if (action === "delete_own_account") {
    const id = actor!.id;
    const rows = (await sql`
      SELECT role, email, preferred_language FROM users WHERE id = ${id}
    `) as {
      role: UserRole;
      email: string;
      preferred_language: string | null;
    }[];
    const row = rows[0];
    if (!row) return { ok: false, message: "Usuário não encontrado." };
    if (hasAdminPrivileges(row.role)) {
      const others = (await sql`
        SELECT COUNT(*)::int AS n FROM users
        WHERE id <> ${id} AND role IN ('superadmin', 'coach_admin')
      `) as { n: number }[];
      if ((others[0]?.n ?? 0) === 0) {
        return { ok: false, message: "LAST_ADMIN" };
      }
    }
    await deleteUserCascade(sql, id);
    queueAfterResponse(() =>
      sendAccountDeletedEmail({
        to: row.email,
        locale: row.preferred_language,
      }),
    );
    return { ok: true, clearSessionCookie: true };
  }

  if (action === "delete_user") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    if (!id) return { ok: false, message: "Usuário não encontrado." };
    if (actor!.id === id) {
      return { ok: false, message: "DELETE_SELF" };
    }
    const rows = (await sql`
      SELECT role, status, email, preferred_language FROM users WHERE id = ${id}
    `) as {
      role: UserRole;
      status: AccountStatus;
      email: string;
      preferred_language: string | null;
    }[];
    const row = rows[0];
    if (!row) return { ok: false, message: "Usuário não encontrado." };
    if (row.status === "active") {
      return { ok: false, message: "ACCOUNT_ACTIVE" };
    }
    if (hasAdminPrivileges(row.role)) {
      const others = (await sql`
        SELECT COUNT(*)::int AS n FROM users
        WHERE id <> ${id} AND role IN ('superadmin', 'coach_admin')
      `) as { n: number }[];
      if ((others[0]?.n ?? 0) === 0) {
        return { ok: false, message: "LAST_ADMIN" };
      }
    }
    await deleteUserCascade(sql, id);
    queueAfterResponse(() =>
      sendAccountDeletedEmail({
        to: row.email,
        locale: row.preferred_language,
      }),
    );
    return { ok: true };
  }

  if (action === "activate_user") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    const rows = (await sql`SELECT role, status FROM users WHERE id = ${id}`) as {
      role: UserRole;
      status: AccountStatus;
    }[];
    const u = rows[0];
    if (!u) return { ok: false, message: "Usuário não encontrado." };
    // Students start active — approval only applies to coaches.
    if (
      (u.role === "coach" || u.role === "coach_admin") &&
      u.status === "pending"
    ) {
      await sql`UPDATE users SET status = 'active' WHERE id = ${id}`;
    }
    return { ok: true };
  }

  if (action === "reactivate_student") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    await sql`
      UPDATE users SET status = 'active', access_expires_at = ${addMonths(new Date().toISOString(), 3)}
      WHERE id = ${id} AND role = 'student'
        AND status IN ('deactivated', 'expired', 'pending')
    `;
    return { ok: true };
  }

  if (action === "set_account_status") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    const status = body.status as AccountStatus;
    const allowed: AccountStatus[] = ["active", "pending", "expired", "deactivated"];
    if (!allowed.includes(status)) return { ok: false, message: "Status inválido." };
    if ((status === "deactivated" || status === "expired") && actor!.id === id) {
      return { ok: false, message: "Você não pode desativar ou expirar sua própria conta." };
    }
    if (status === "active") {
      const uRows = (await sql`SELECT role FROM users WHERE id = ${id}`) as { role: UserRole }[];
      const role = uRows[0]?.role;
      if (role === "student") {
        await sql`
          UPDATE users SET status = ${status}, access_expires_at = COALESCE(access_expires_at, ${addMonths(new Date().toISOString(), 3)})
          WHERE id = ${id}
        `;
      } else {
        await sql`UPDATE users SET status = ${status} WHERE id = ${id}`;
      }
    } else {
      await sql`UPDATE users SET status = ${status} WHERE id = ${id}`;
    }
    return { ok: true };
  }

  if (action === "set_user_role") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    const nextRole = body.role as UserRole;
    if (!id || !ALL_USER_ROLES.includes(nextRole)) return { ok: false, message: "Dados inválidos." };
    if (actor!.id === id) {
      return { ok: false, message: "Altere seu próprio perfil na página de perfil ou peça a outro administrador." };
    }
    const uRows = (await sql`SELECT id, role FROM users WHERE id = ${id}`) as { id: string; role: UserRole }[];
    const target = uRows[0];
    if (!target) return { ok: false, message: "Usuário não encontrado." };
    const hadAdmin = hasAdminPrivileges(target.role);
    const willHaveAdmin = hasAdminPrivileges(nextRole);
    if (hadAdmin && !willHaveAdmin) {
      const cntRows = (await sql`
        SELECT COUNT(*)::int AS c FROM users
        WHERE role IN ('superadmin', 'coach_admin')
      `) as { c: number }[];
      const adminCount = cntRows[0]?.c ?? 0;
      if (adminCount <= 1) {
        return {
          ok: false,
          message: "Precisa existir pelo menos um usuário com perfil de administração.",
        };
      }
    }
    if (nextRole === "student") {
      await sql`
        UPDATE users SET
          role = ${nextRole},
          access_expires_at = COALESCE(access_expires_at, ${addMonths(new Date().toISOString(), 3)})
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE users SET role = ${nextRole}, access_expires_at = NULL
        WHERE id = ${id}
      `;
    }
    return { ok: true };
  }

  if (action === "create_coach_access") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const raw = String(body.coachRole ?? "coach").trim();
    const parsedAccess = parseUserRole(raw);
    const allowed: CoachAccessRole[] = ["coach", "coach_admin", "superadmin"];
    const rawAccessRole: CoachAccessRole =
      parsedAccess && allowed.includes(parsedAccess as CoachAccessRole)
        ? (parsedAccess as CoachAccessRole)
        : "coach";
    const newRole: UserRole = rawAccessRole;
    if (!name || !email) return { ok: false, message: "Preencha todos os campos." };
    if (!isValidAppEmail(email)) return emailInvalidMessage();
    const proposed = String(body.tempPassword ?? body.password ?? "").trim();
    const password = isTempAlphanumericPassword(proposed) ? proposed : generateTempPassword(8);
    const dup = await userEmailTaken(sql, email);
    if (dup) return emailTakenMessage();
    const neon = await createNeonAuthUser({ email, password, name });
    if (!neon.ok) return { ok: false, message: neon.message };
    const id = `u-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const password_hash = await hashPassword(password);
    const accountLocale = accountLocaleFromBody(body);
    try {
    await sql`
      INSERT INTO users (
        id, email, name, role, password_hash, status, created_at, overall, preferred_language, neon_auth_user_id, must_change_password
      ) VALUES (
        ${id},
        ${email},
        ${name},
        ${newRole},
        ${password_hash},
        ${"active"},
        ${createdAt},
        ${0},
        ${accountLocale},
        ${neon.userId},
        ${false}
      )
    `;
    } catch (e) {
      if (isUniqueEmailViolation(e)) return emailTakenMessage();
      throw e;
    }
    const mailed = await sendStaffCredentialsEmail({
      to: email,
      name,
      tempPassword: password,
      locale: accountLocale,
    });
    return { ok: true, emailSent: mailed.ok, tempPassword: password };
  }

  if (action === "add_court") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const name = String(body.name ?? "").trim();
    const courtType = String(body.courtType ?? "").trim();
    const courtNumber = String(body.courtNumber ?? body.numero ?? "").trim();
    const address = String(body.address ?? "").trim();
    const surface = String(body.surface ?? "").trim();
    const indoor = Boolean(body.indoor);
    if (!name || !courtType || !surface) return { ok: false, message: "Nome, tipo e superfície são obrigatórios." };
    const id = `c-${randomUUID().slice(0, 8)}`;
    await sql`
      INSERT INTO courts (id, name, court_type, court_number, address, surface, indoor) VALUES (${id}, ${name}, ${courtType}, ${courtNumber}, ${address}, ${surface}, ${indoor})
    `;
    return { ok: true };
  }

  if (action === "remove_court") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    await sql`DELETE FROM courts WHERE id = ${id}`;
    return { ok: true };
  }

  if (action === "update_court") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    const patch = (body.patch ?? {}) as Partial<Pick<Court, "name" | "courtType" | "courtNumber" | "address" | "surface" | "indoor">> & {
      numero?: string;
    };
    const curRows = (await sql`SELECT name, court_type, court_number, address, surface, indoor FROM courts WHERE id = ${id}`) as {
      name: string;
      court_type: string;
      court_number: string;
      address: string;
      surface: string;
      indoor: boolean;
    }[];
    const cur = curRows[0];
    if (!cur) return { ok: false, message: "Quadra não encontrada." };
    const name = patch.name !== undefined ? String(patch.name).trim() : cur.name;
    const courtType = patch.courtType !== undefined ? String(patch.courtType).trim() : cur.court_type;
    const courtNumber =
      patch.courtNumber !== undefined
        ? String(patch.courtNumber).trim()
        : patch.numero !== undefined
          ? String(patch.numero).trim()
          : cur.court_number ?? "";
    const address = patch.address !== undefined ? String(patch.address).trim() : cur.address ?? "";
    const surface = patch.surface !== undefined ? String(patch.surface).trim() : cur.surface;
    const indoor = patch.indoor !== undefined ? Boolean(patch.indoor) : cur.indoor;
    if (!name || !courtType || !surface) return { ok: false, message: "Nome, tipo e superfície são obrigatórios." };
    await sql`UPDATE courts SET name = ${name}, court_type = ${courtType}, court_number = ${courtNumber}, address = ${address}, surface = ${surface}, indoor = ${indoor} WHERE id = ${id}`;
    return { ok: true };
  }

  if (action === "add_event") {
    if (!hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const e = body.event as Omit<EventItem, "id" | "slug"> & { local?: string };
    const createdBy = e.createdBy || actor!.id;
    const id = `e-${randomUUID().slice(0, 8)}`;
    const address = String(e.address ?? "").trim();
    const venue = String(e.venue ?? e.local ?? "").trim();
    const description = String(e.description ?? "").trim();
    const eventType = parseEventType(e.type);
    const slug = await allocateEventSlug(sql, e.title);
    await sql`
      INSERT INTO events (id, title, date, time, address, venue, description, created_by, type, slug)
      VALUES (${id}, ${e.title}, ${e.date}, ${e.time}, ${address}, ${venue}, ${description}, ${createdBy}, ${eventType}, ${slug})
    `;
    return { ok: true };
  }

  if (action === "update_event") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    const patch = (body.patch ?? {}) as Partial<EventItem> & { local?: string };
    const curRows = (await sql`SELECT title, date, time, address, venue, description, type FROM events WHERE id = ${id}`) as {
      title: string;
      date: string;
      time: string;
      address: string;
      venue: string;
      description: string;
      type: string;
    }[];
    const cur = curRows[0];
    if (!cur) return { ok: false, message: "Evento não encontrado." };
    const title = patch.title ?? cur.title;
    const date = patch.date ?? cur.date;
    const time = patch.time ?? cur.time;
    const address = patch.address !== undefined ? String(patch.address).trim() : cur.address;
    const venue =
      patch.venue !== undefined
        ? String(patch.venue).trim()
        : patch.local !== undefined
          ? String(patch.local).trim()
          : cur.venue ?? "";
    const description =
      patch.description !== undefined ? String(patch.description).trim() : cur.description ?? "";
    const type = parseEventType(patch.type ?? cur.type);
    await sql`
      UPDATE events SET title = ${title}, date = ${date}, time = ${time}, address = ${address}, venue = ${venue}, description = ${description}, type = ${type}
      WHERE id = ${id}
    `;
    return { ok: true };
  }

  if (action === "remove_event") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    await sql`DELETE FROM events WHERE id = ${id}`;
    return { ok: true };
  }

  if (action === "join_event") {
    const gate = requireActor(actor);
    if (gate) return gate;
    if (actor!.role !== "student") return { ok: false, message: "Sem permissão." };
    const eventId = String(body.eventId ?? "").trim();
    if (!eventId) return { ok: false, message: "Evento inválido." };
    const evRows = (await sql`SELECT date, time FROM events WHERE id = ${eventId} LIMIT 1`) as {
      date: string;
      time: string;
    }[];
    if (!evRows.length) return { ok: false, message: "Evento não encontrado." };
    const dateStr = normalizeDbEventDateString(evRows[0]!.date);
    const timeStr = normalizeDbEventTimeString(evRows[0]!.time);
    if (!dateStr) return { ok: false, message: "Data do evento inválida." };
    const startMs = eventScheduleStartUtcMs(dateStr, timeStr);
    if (startMs == null || startMs < Date.now()) {
      return { ok: false, message: "Este evento já passou ou não está disponível." };
    }
    const id = `es-${randomUUID().slice(0, 8)}`;
    await sql`
      INSERT INTO event_signups (id, event_id, user_id, created_at)
      VALUES (${id}, ${eventId}, ${actor!.id}, NOW())
      ON CONFLICT (event_id, user_id) DO NOTHING
    `;
    return { ok: true };
  }

  if (action === "leave_event") {
    const gate = requireActor(actor);
    if (gate) return gate;
    if (actor!.role !== "student") return { ok: false, message: "Sem permissão." };
    const eventId = String(body.eventId ?? "").trim();
    if (!eventId) return { ok: false, message: "Evento inválido." };
    await sql`DELETE FROM event_signups WHERE event_id = ${eventId} AND user_id = ${actor!.id}`;
    return { ok: true };
  }

  if (action === "request_lesson") {
    if (actor!.role !== "student") return { ok: false, message: "Sem permissão." };
    const input = body.lesson as Omit<Lesson, "id" | "status">;
    if (input.studentId !== actor!.id) return { ok: false, message: "Sem permissão." };

    const weeklyRows = (await sql`
      SELECT id, coach_id, weekday, start_time, end_time
      FROM coach_weekly_availability WHERE coach_id = ${input.coachId}
    `) as { id: string; coach_id: string; weekday: number; start_time: string; end_time: string }[];
    const agendaRows = (await sql`
      SELECT id, coach_id, date, start_time, end_time, COALESCE(note, '') AS note,
        COALESCE(kind, 'available') AS kind
      FROM coach_agenda_entries WHERE coach_id = ${input.coachId}
    `) as {
      id: string;
      coach_id: string;
      date: string;
      start_time: string;
      end_time: string;
      note: string;
      kind: string;
    }[];
    const blockedRows = (await sql`
      SELECT id, coach_id, date, COALESCE(note, '') AS note
      FROM coach_blocked_dates WHERE coach_id = ${input.coachId}
    `) as { id: string; coach_id: string; date: string; note: string }[];
    const lessonRows = (await sql`
      SELECT id, student_id, coach_id, court_id, date, time, status, lesson_activity_id, lesson_type, notes
      FROM lessons
      WHERE coach_id = ${input.coachId}
        AND date = ${input.date}
        AND status IN ('pending', 'confirmed')
    `) as {
      id: string;
      student_id: string;
      coach_id: string;
      court_id: string;
      date: string;
      time: string;
      status: Lesson["status"];
      lesson_activity_id: string | null;
      lesson_type: string | null;
      notes: string | null;
    }[];

    const lessonDate = normalizeDbEventDateString(input.date);
    const lessonTime = normalizeDbEventTimeString(input.time);
    if (!lessonDate) return { ok: false, message: "Fecha inválida." };

    const slot = isCoachSlotAvailable({
      coachId: input.coachId,
      date: lessonDate,
      time: lessonTime,
      weekly: weeklyRows.map((w) => ({
        id: w.id,
        coachId: w.coach_id,
        weekday: Number(w.weekday),
        startTime: normalizeDbEventTimeString(w.start_time),
        endTime: normalizeDbEventTimeString(w.end_time),
      })),
      agenda: agendaRows.map((a) => ({
        id: a.id,
        coachId: a.coach_id,
        date: normalizeDbEventDateString(a.date) ?? String(a.date).slice(0, 10),
        startTime: normalizeDbEventTimeString(a.start_time),
        endTime: normalizeDbEventTimeString(a.end_time),
        kind: a.kind === "unavailable" ? ("unavailable" as const) : ("available" as const),
        note: a.note || undefined,
      })),
      blockedDates: blockedRows.map((b) => ({
        id: b.id,
        coachId: b.coach_id,
        date: normalizeDbEventDateString(b.date) ?? String(b.date).slice(0, 10),
        note: b.note || undefined,
      })),
      lessons: lessonRows.map((l) => ({
        id: l.id,
        studentId: l.student_id,
        coachId: l.coach_id,
        courtId: l.court_id,
        date: normalizeDbEventDateString(l.date) ?? "",
        time: normalizeDbEventTimeString(l.time),
        status: l.status,
        lessonActivityId: l.lesson_activity_id ?? undefined,
        lessonType: (l.lesson_type as Lesson["lessonType"]) ?? undefined,
        notes: l.notes ?? undefined,
      })),
    });
    if (!slot.ok) {
      if (slot.reason === "blocked_day") {
        return { ok: false, message: "El coach no está disponible ese día." };
      }
      if (slot.reason === "busy_lesson") {
        return { ok: false, message: "Ese horario ya está ocupado para el coach." };
      }
      return { ok: false, message: "Ese horario está fuera de la disponibilidad del coach." };
    }

    const id = `l-${randomUUID().slice(0, 8)}`;
    await sql`
      INSERT INTO lessons (
        id, student_id, coach_id, court_id, date, time, status, lesson_activity_id, lesson_type, notes
      ) VALUES (
        ${id},
        ${input.studentId},
        ${input.coachId},
        ${input.courtId},
        ${lessonDate},
        ${lessonTime},
        ${"pending"},
        ${input.lessonActivityId ?? null},
        ${input.lessonType ?? null},
        ${input.notes ?? null}
      )
    `;
    const coachRows = (await sql`
      SELECT
        p.email AS coach_email,
        p.preferred_language AS coach_locale,
        COALESCE(p.lesson_request_alerts_enabled, true) AS coach_alerts,
        s.name AS student_name
      FROM users p, users s
      WHERE p.id = ${input.coachId} AND s.id = ${input.studentId}
    `) as {
      coach_email: string;
      coach_locale: string | null;
      coach_alerts: boolean;
      student_name: string;
    }[];
    const coach = coachRows[0];
    if (coach?.coach_email && coach.coach_alerts) {
      queueAfterResponse(() =>
        sendLessonRequestAlert({
          to: coach.coach_email,
          locale: coach.coach_locale,
          studentName: coach.student_name,
          date: lessonDate,
          time: lessonTime ?? input.time,
        }),
      );
    }
    return { ok: true };
  }

  if (action === "set_coach_weekly_availability") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const coachId = actor!.id;
    const raw = Array.isArray(body.windows) ? body.windows : [];
    const windows: { weekday: number; startTime: string; endTime: string }[] = [];
    for (const item of raw) {
      const weekday = Number((item as { weekday?: unknown }).weekday);
      const startTime = String((item as { startTime?: unknown }).startTime ?? "").trim();
      const endTime = String((item as { endTime?: unknown }).endTime ?? "").trim();
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        return { ok: false, message: "Día de la semana inválido." };
      }
      if (hmToMinutes(startTime) < 0 || hmToMinutes(endTime) < 0 || hmToMinutes(endTime) <= hmToMinutes(startTime)) {
        return { ok: false, message: "Horario inválido (fin debe ser después del inicio)." };
      }
      windows.push({ weekday, startTime, endTime });
    }
    await sql`DELETE FROM coach_weekly_availability WHERE coach_id = ${coachId}`;
    for (const w of windows) {
      const id = `cwa-${randomUUID().slice(0, 10)}`;
      await sql`
        INSERT INTO coach_weekly_availability (id, coach_id, weekday, start_time, end_time)
        VALUES (${id}, ${coachId}, ${w.weekday}, ${w.startTime}, ${w.endTime})
      `;
    }
    return { ok: true };
  }

  if (action === "add_coach_agenda_entry") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const date = String(body.date ?? "").trim().slice(0, 10);
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();
    const note = String(body.note ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Fecha inválida." };
    if (date < todayYmdInAppTz()) {
      return { ok: false, message: "No se puede modificar la disponibilidad de un día pasado." };
    }
    if (hmToMinutes(startTime) < 0 || hmToMinutes(endTime) < 0 || hmToMinutes(endTime) <= hmToMinutes(startTime)) {
      return { ok: false, message: "Horario inválido (fin debe ser después del inicio)." };
    }
    const id = `cae-${randomUUID().slice(0, 10)}`;
    await sql`
      INSERT INTO coach_agenda_entries (id, coach_id, date, start_time, end_time, note, kind)
      VALUES (${id}, ${actor!.id}, ${date}, ${startTime}, ${endTime}, ${note}, ${"available"})
    `;
    return { ok: true };
  }

  if (action === "remove_coach_agenda_entry") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const id = String(body.id ?? "").trim();
    if (!id) return { ok: false, message: "Entrada inválida." };
    const existing = (await sql`
      SELECT date FROM coach_agenda_entries WHERE id = ${id} AND coach_id = ${actor!.id} LIMIT 1
    `) as { date: unknown }[];
    const entryDate = existing[0] ? normalizeDbEventDateString(existing[0].date) : null;
    if (entryDate && entryDate < todayYmdInAppTz()) {
      return { ok: false, message: "No se puede modificar la disponibilidad de un día pasado." };
    }
    await sql`DELETE FROM coach_agenda_entries WHERE id = ${id} AND coach_id = ${actor!.id}`;
    return { ok: true };
  }

  if (action === "add_coach_blocked_date") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const date = String(body.date ?? "").trim().slice(0, 10);
    const note = String(body.note ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Fecha inválida." };
    const id = `cbd-${randomUUID().slice(0, 10)}`;
    try {
      await sql`
        INSERT INTO coach_blocked_dates (id, coach_id, date, note)
        VALUES (${id}, ${actor!.id}, ${date}, ${note})
      `;
    } catch {
      return { ok: false, message: "Ese día ya está bloqueado." };
    }
    return { ok: true };
  }

  if (action === "remove_coach_blocked_date") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const id = String(body.id ?? "").trim();
    if (!id) return { ok: false, message: "Bloqueo inválido." };
    await sql`DELETE FROM coach_blocked_dates WHERE id = ${id} AND coach_id = ${actor!.id}`;
    return { ok: true };
  }

  if (action === "respond_lesson") {
    const id = String(body.id ?? "");
    const status = body.status as "confirmed" | "declined";
    if (status !== "confirmed" && status !== "declined") return { ok: false, message: "Status inválido." };
    const declineReason = String(body.reason ?? "").trim();
    if (status === "declined" && declineReason.length < 8) {
      return { ok: false, message: "Indique o motivo da recusa." };
    }
    const asAdmin = hasAdminPrivileges(actor!.role);
    if (!asAdmin && !hasCoachPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const inviteRows = (await sql`
      UPDATE lessons l
      SET status = ${status},
          decline_reason = ${status === "declined" ? declineReason : null}
      FROM users s, users p, courts c
      WHERE l.id = ${id}
        AND s.id = l.student_id
        AND p.id = l.coach_id
        AND c.id = l.court_id
        AND (${asAdmin} OR l.coach_id = ${actor!.id})
      RETURNING
        l.date,
        l.time,
        s.email AS student_email,
        s.name AS student_name,
        s.preferred_language AS student_locale,
        COALESCE(s.lesson_reminders_enabled, true) AS student_reminders,
        p.email AS coach_email,
        p.name AS coach_name,
        p.preferred_language AS coach_locale,
        COALESCE(p.lesson_reminders_enabled, true) AS coach_reminders,
        c.name AS court_name,
        c.address AS court_address
    `) as {
      date: unknown;
      time: unknown;
      student_email: string;
      student_name: string;
      student_locale: string | null;
      student_reminders: boolean;
      coach_email: string;
      coach_name: string;
      coach_locale: string | null;
      coach_reminders: boolean;
      court_name: string;
      court_address: string | null;
    }[];
    const invite = inviteRows[0];
    if (!invite) return { ok: false, message: "Aula não encontrada." };
    if (status === "confirmed") {
      const date = normalizeDbEventDateString(invite.date);
      const time = normalizeDbEventTimeString(invite.time);
      if (date && time) {
        const courtLabel = [invite.court_name, invite.court_address?.trim()].filter(Boolean).join(" · ");
        if (invite.student_email && invite.student_reminders) {
          queueAfterResponse(() =>
            sendLessonCalendarInvite({
              to: invite.student_email,
              attendeeName: invite.student_name,
              locale: invite.student_locale,
              lessonId: id,
              date,
              time,
              counterpartName: invite.coach_name,
              counterpartKind: "coach",
              ctaPath: "/student/schedule",
              courtLabel,
            }),
          );
        }
        if (invite.coach_email && invite.coach_reminders) {
          queueAfterResponse(() =>
            sendLessonCalendarInvite({
              to: invite.coach_email,
              attendeeName: invite.coach_name,
              locale: invite.coach_locale,
              lessonId: id,
              date,
              time,
              counterpartName: invite.student_name,
              counterpartKind: "student",
              ctaPath: "/coach/schedule",
              courtLabel,
            }),
          );
        }
      }
    }
    if (status === "declined" && invite.student_email) {
      const date = normalizeDbEventDateString(invite.date);
      const time = normalizeDbEventTimeString(invite.time);
      if (date && time) {
        queueAfterResponse(() =>
          sendLessonDeclineMail({
            to: invite.student_email,
            locale: invite.student_locale,
            coachName: invite.coach_name,
            date,
            time,
            motive: declineReason,
          }),
        );
      }
    }
    return { ok: true };
  }

  if (action === "update_lesson") {
    if (!hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const id = String(body.id ?? "");
    const patch = (body.patch ?? {}) as Partial<Lesson>;

    const curRows = (await sql`
      SELECT student_id, coach_id, court_id, date, time, status, lesson_activity_id, lesson_type, notes
      FROM lessons WHERE id = ${id}
    `) as {
      student_id: string;
      coach_id: string;
      court_id: string;
      date: string;
      time: string;
      status: Lesson["status"];
      lesson_activity_id: string | null;
      lesson_type: string | null;
      notes: string | null;
    }[];
    const cur = curRows[0];
    if (!cur) return { ok: false, message: "Aula não encontrada." };
    if (patch.status === "completed" && cur.status !== "completed") {
      return {
        ok: false,
        message: "Para marcar como concluída, use Concluir e registre a avaliação do aluno.",
      };
    }
    await sql`
      UPDATE lessons SET
        student_id = ${patch.studentId ?? cur.student_id},
        coach_id = ${patch.coachId ?? cur.coach_id},
        court_id = ${patch.courtId ?? cur.court_id},
        date = ${patch.date ?? cur.date},
        time = ${patch.time ?? cur.time},
        status = ${patch.status ?? cur.status},
        lesson_activity_id = ${patch.lessonActivityId ?? cur.lesson_activity_id},
        lesson_type = ${patch.lessonType ?? cur.lesson_type},
        notes = ${patch.notes ?? cur.notes}
      WHERE id = ${id}
    `;
    return { ok: true };
  }

  if (action === "remove_lesson") {
    if (!hasAdminPrivileges(actor!.role)) return { ok: false, message: "Sem permissão." };
    const id = String(body.id ?? "");
    await sql`DELETE FROM lessons WHERE id = ${id}`;
    return { ok: true };
  }

  if (action === "add_evaluation") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    let payload = { ...(body.evaluation as Omit<Evaluation, "id" | "createdAt">) };
    if (payload.skills) {
      const vals = SKILL_AXIS_KEYS.map((k) => payload.skills![k]).filter(
        (v): v is number => typeof v === "number"
      );
      if (vals.length === 6) {
        payload = {
          ...payload,
          score: Math.round(vals.reduce((a, b) => a + b, 0) / 6),
          category: undefined,
          competencies: undefined,
        };
      }
    } else if (payload.competencies) {
      const vals = COMPETENCY_KEYS.map((k) => payload.competencies![k]).filter(
        (v): v is number => typeof v === "number"
      );
      if (vals.length === 4) {
        payload = {
          ...payload,
          score: Math.round(vals.reduce((a, b) => a + b, 0) / 4),
          category: undefined,
        };
      }
    }
    if (isCoachOnly(actor!.role) && payload.coachId !== actor!.id) {
      return { ok: false, message: "Sem permissão." };
    }
    const stRows = (await sql`SELECT role, status FROM users WHERE id = ${payload.studentId}`) as {
      role: UserRole;
      status: AccountStatus;
    }[];
    const student = stRows[0];
    if (!student || student.role !== "student" || student.status !== "active") {
      return { ok: false, message: "Aluno inválido." };
    }
    const id = `ev-${randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString();
    const competenciesStr =
      payload.competencies != null ? JSON.stringify(payload.competencies) : null;
    const skillsStr = payload.skills != null ? JSON.stringify(payload.skills) : null;
    await sql`
      INSERT INTO evaluations (
        id, student_id, coach_id, score, comment, created_at, category, competencies, skills
      ) VALUES (
        ${id},
        ${payload.studentId},
        ${payload.coachId},
        ${payload.score},
        ${payload.comment},
        ${createdAt},
        ${payload.category ?? null},
        ${competenciesStr},
        ${skillsStr}
      )
    `;
    await sql`SELECT public.recompute_student_overall(${payload.studentId})`;
    await queueStudentEvaluationAlert(sql, {
      studentId: payload.studentId,
      coachId: payload.coachId,
      score: payload.score,
      skills: payload.skills,
    });
    return { ok: true };
  }

  /**
   * Complete a lesson only together with an evaluation (atomic insert + update in the same operation).
   * Do not use `update_lesson` with status concluida — that is blocked for admins.
   */
  if (action === "complete_lesson_with_evaluation") {
    if (!hasCoachPrivileges(actor!.role) && !hasAdminPrivileges(actor!.role)) {
      return { ok: false, message: "Sem permissão." };
    }
    const lessonId = String(body.lessonId ?? "").trim();
    const rawEval = body.evaluation;
    if (!lessonId || !rawEval || typeof rawEval !== "object") {
      return { ok: false, message: "Dados inválidos." };
    }

    const lesRows = (await sql`
      SELECT id, student_id, coach_id, status, date, time
      FROM lessons WHERE id = ${lessonId}
    `) as {
      id: string;
      student_id: string;
      coach_id: string;
      status: Lesson["status"];
      date: unknown;
      time: unknown;
    }[];
    const lessonRow = lesRows[0];
    if (!lessonRow) return { ok: false, message: "Aula não encontrada." };
    if (lessonRow.status !== "confirmed") {
      return { ok: false, message: "Só é possível concluir aulas confirmadas." };
    }
    if (!hasAdminPrivileges(actor!.role)) {
      if (lessonRow.coach_id !== actor!.id) {
        return { ok: false, message: "Sem permissão." };
      }
    }

    let payload = { ...(rawEval as Omit<Evaluation, "id" | "createdAt">) };
    payload.studentId = lessonRow.student_id;
    payload.coachId = lessonRow.coach_id;

    if (payload.skills) {
      const vals = SKILL_AXIS_KEYS.map((k) => payload.skills![k]).filter(
        (v): v is number => typeof v === "number"
      );
      if (vals.length !== 6) {
        return { ok: false, message: "Preencha as seis habilidades da avaliação." };
      }
      payload = {
        ...payload,
        score: Math.round(vals.reduce((a, b) => a + b, 0) / 6),
        category: undefined,
        competencies: undefined,
      };
    } else {
      return { ok: false, message: "A avaliação deve incluir as seis habilidades." };
    }

    if (isCoachOnly(actor!.role) && payload.coachId !== actor!.id) {
      return { ok: false, message: "Sem permissão." };
    }
    const stRows = (await sql`SELECT role, status FROM users WHERE id = ${payload.studentId}`) as {
      role: UserRole;
      status: AccountStatus;
    }[];
    const student = stRows[0];
    if (!student || student.role !== "student" || student.status !== "active") {
      return { ok: false, message: "Aluno inválido." };
    }

    const evId = `ev-${randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString();
    const competenciesStr =
      payload.competencies != null ? JSON.stringify(payload.competencies) : null;
    const skillsStr = payload.skills != null ? JSON.stringify(payload.skills) : null;

    await sql`
      INSERT INTO evaluations (
        id, student_id, coach_id, score, comment, created_at, category, competencies, skills
      ) VALUES (
        ${evId},
        ${payload.studentId},
        ${payload.coachId},
        ${payload.score},
        ${payload.comment},
        ${createdAt},
        ${payload.category ?? null},
        ${competenciesStr},
        ${skillsStr}
      )
    `;

    const updated = (await sql`
      UPDATE lessons SET status = ${"completed"}
      WHERE id = ${lessonId} AND status = ${"confirmed"}
      RETURNING id
    `) as { id: string }[];

    if (!updated.length) {
      await sql`DELETE FROM evaluations WHERE id = ${evId}`;
      return {
        ok: false,
        message: "Não foi possível concluir a aula (estado já alterado). Atualize a página e tente de novo.",
      };
    }

    await sql`SELECT public.recompute_student_overall(${payload.studentId})`;
    await queueStudentEvaluationAlert(sql, {
      studentId: payload.studentId,
      coachId: payload.coachId,
      score: payload.score,
      date: normalizeDbEventDateString(lessonRow.date),
      time: normalizeDbEventTimeString(lessonRow.time),
      skills: payload.skills,
    });
    return { ok: true };
  }

  const catalogAllowed = hasAdminPrivileges(actor!.role) || hasCoachPrivileges(actor!.role);
  if (!catalogAllowed) return { ok: false, message: "Sem permissão." };

  if (action === "add_lesson_activity_category") {
    const name = String(body.name ?? "").trim();
    if (!name) return { ok: false, message: "Nome obrigatório." };
    const maxRows = (await sql`
      SELECT COALESCE(MAX(sort_order), -1)::int AS maxo FROM lesson_activity_categories
    `) as { maxo: number }[];
    const maxo = maxRows[0]?.maxo ?? -1;
    const id = `cat-${randomUUID().slice(0, 8)}`;
    const description = String(body.description ?? "").trim();
    await sql`
      INSERT INTO lesson_activity_categories (id, name, sort_order, description)
      VALUES (${id}, ${name}, ${maxo + 1}, ${description})
    `;
    return { ok: true, id };
  }

  if (action === "rename_lesson_activity_category") {
    const id = String(body.id ?? "");
    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    if (!id || (!hasName && !hasDescription)) return { ok: false, message: "Dados inválidos." };
    if (hasName) {
      const name = String(body.name ?? "").trim();
      if (!name) return { ok: false, message: "Nome obrigatório." };
      await sql`UPDATE lesson_activity_categories SET name = ${name} WHERE id = ${id}`;
    }
    if (hasDescription) {
      const description = String(body.description ?? "").trim();
      await sql`UPDATE lesson_activity_categories SET description = ${description} WHERE id = ${id}`;
    }
    return { ok: true };
  }

  if (action === "remove_lesson_activity_category") {
    const id = String(body.id ?? "");
    if (!id) return { ok: false, message: "Dados inválidos." };
    await sql`SELECT public.clear_lesson_activity_refs(${id}, ${null})`;
    await sql`DELETE FROM lesson_activities WHERE category_id = ${id}`;
    await sql`DELETE FROM lesson_activity_categories WHERE id = ${id}`;
    return { ok: true };
  }

  if (action === "add_lesson_activity") {
    const categoryId = String(body.categoryId ?? "");
    const name = String(body.name ?? "").trim();
    const hasSides = Boolean(body.hasSides);
    const active = body.active === undefined ? true : Boolean(body.active);
    if (!name || !categoryId) return { ok: false, message: "Dados incompletos." };
    const inCat = (await sql`
      SELECT COALESCE(MAX(sort_order), -1)::int AS maxo FROM lesson_activities WHERE category_id = ${categoryId}
    `) as { maxo: number }[];
    const maxo = Number(inCat[0]?.maxo ?? -1);
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28);
    const aid = `${slug || "act"}-${randomUUID().slice(0, 6)}`;
    await sql`
      INSERT INTO lesson_activities (id, category_id, name, has_sides, active, sort_order)
      VALUES (${aid}, ${categoryId}, ${name}, ${hasSides}, ${active}, ${maxo + 1})
    `;
    return { ok: true };
  }

  if (action === "update_lesson_activity") {
    const id = String(body.id ?? "");
    const patch = (body.patch ?? {}) as Partial<
      Pick<LessonActivity, "name" | "hasSides" | "active" | "categoryId">
    >;
    const curRows = (await sql`
      SELECT name, has_sides, active, category_id FROM lesson_activities WHERE id = ${id}
    `) as {
      name: string;
      has_sides: boolean;
      active: boolean;
      category_id: string;
    }[];
    const cur = curRows[0];
    if (!cur) return { ok: false, message: "Atividade não encontrada." };
    const name = typeof patch.name === "string" ? patch.name.trim() : cur.name;
    const has_sides = patch.hasSides !== undefined ? patch.hasSides : cur.has_sides;
    const active = patch.active !== undefined ? patch.active : cur.active;
    const category_id = patch.categoryId ?? cur.category_id;
    await sql`
      UPDATE lesson_activities SET name = ${name}, has_sides = ${has_sides}, active = ${active}, category_id = ${category_id}
      WHERE id = ${id}
    `;
    return { ok: true };
  }

  if (action === "remove_lesson_activity") {
    const id = String(body.id ?? "");
    await sql`SELECT public.clear_lesson_activity_refs(${null}, ${id})`;
    await sql`DELETE FROM lesson_activities WHERE id = ${id}`;
    return { ok: true };
  }

  return { ok: false, message: "Ação desconhecida." };
}
