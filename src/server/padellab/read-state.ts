import "server-only";
import { getSql, type Sql } from "./neon-client";
import type {
  CoachAgendaEntry,
  CoachBlockedDate,
  CoachWeeklyWindow,
  Court,
  Evaluation,
  EventItem,
  EventSignup,
  Lesson,
  LessonActivity,
  LessonActivityCatalog,
  LessonActivityCategory,
  User,
} from "@/lib/types";
import { dateToIsoLocal } from "@/lib/birth-date";
import { parseEventType } from "@/lib/events-shared";
import { parseUserRoleOrStudent } from "@/lib/role-utils";
import { normalizeDbEventDateString, normalizeDbEventTimeString } from "@/lib/schedule-date";
import { sendDueLicenseExpiringNotices } from "./license-expiring-mail";
import { isSessionCookieValid, parseSessionCookieValue } from "./session-cookie";

export type AppStatePayload = {
  user: User | null;
  users: User[];
  courts: Court[];
  events: EventItem[];
  eventSignups: EventSignup[];
  lessons: Lesson[];
  evaluations: Evaluation[];
  lessonActivityCatalog: LessonActivityCatalog;
  coachWeeklyAvailability: CoachWeeklyWindow[];
  coachAgendaEntries: CoachAgendaEntry[];
  coachBlockedDates: CoachBlockedDate[];
};

export type LoadAppStateResult = {
  payload: AppStatePayload;
  clearSessionCookie: boolean;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string | Date;
  access_expires_at: string | Date | null;
  overall: number;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  nationality: string | null;
  birth_date: string | Date | null;
  gender: string | null;
  calendar_feed_enabled?: boolean;
  lesson_reminders_enabled?: boolean;
  lesson_request_alerts_enabled?: boolean;
  evaluation_alerts_enabled?: boolean;
  session_version?: number;
  two_factor_enabled?: boolean;
};

function mapUser(r: UserRow): User {
  const gender =
    r.gender === "male" || r.gender === "female" || r.gender === "other" ? r.gender : undefined;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: parseUserRoleOrStudent(r.role),
    status: r.status as User["status"],
    createdAt: new Date(r.created_at).toISOString(),
    accessExpiresAt: r.access_expires_at
      ? new Date(r.access_expires_at).toISOString()
      : undefined,
    overall: Number(r.overall),
    phone: r.phone ?? undefined,
    bio: r.bio ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    preferredLanguage: r.preferred_language ?? undefined,
    nationality: r.nationality ?? undefined,
    birthDate:
      r.birth_date != null
        ? typeof r.birth_date === "string"
          ? r.birth_date.slice(0, 10)
          : dateToIsoLocal(new Date(r.birth_date))
        : undefined,
    gender,
    calendarFeedEnabled: Boolean(r.calendar_feed_enabled),
    lessonRemindersEnabled: r.lesson_reminders_enabled !== false,
    lessonRequestAlertsEnabled: r.lesson_request_alerts_enabled !== false,
    evaluationAlertsEnabled: r.evaluation_alerts_enabled !== false,
    twoFactorEnabled: Boolean(r.two_factor_enabled),
  };
}

/**
 * `competencies` / `skills` columns (TEXT or JSONB): Neon may return a JSON string
 * or an already parsed object. `JSON.parse` on an object fails and used to clear skills on the client.
 */
function dbJsonColumn<T>(value: unknown): T | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function emptyAppState(): AppStatePayload {
  return {
    user: null,
    users: [],
    courts: [],
    events: [],
    eventSignups: [],
    lessons: [],
    evaluations: [],
    lessonActivityCatalog: { categories: [], activities: [] },
    coachWeeklyAvailability: [],
    coachAgendaEntries: [],
    coachBlockedDates: [],
  };
}

function mapLessonActivityCatalog(
  catRows: { id: string; name: string; sort_order: number; description: string }[],
  actRows: {
    id: string;
    category_id: string;
    name: string;
    has_sides: boolean;
    active: boolean;
    sort_order: number;
  }[],
): LessonActivityCatalog {
  return {
    categories: catRows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      sortOrder: c.sort_order,
    })),
    activities: actRows.map((a) => ({
      id: a.id,
      categoryId: a.category_id,
      name: a.name,
      hasSides: a.has_sides,
      active: a.active,
      sortOrder: a.sort_order,
    })),
  };
}

type AppStateSnapshot = {
  users: UserRow[];
  courts: { id: string; name: string; court_type: string; court_number: string; address: string; surface: string; indoor: boolean }[];
  events: {
    id: string;
    title: string;
    date: string;
    time: string;
    address: string;
    venue: string;
    description: string;
    created_by: string;
    type: EventItem["type"];
  }[];
  signups: { event_id: string; user_id: string; created_at: string | Date }[];
  lessons: {
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
  evaluations: {
    id: string;
    student_id: string;
    coach_id: string;
    score: number;
    comment: string;
    created_at: string | Date;
    category: string | null;
    competencies: unknown;
    skills: unknown;
  }[];
  weekly: { id: string; coach_id: string; weekday: number; start_time: string; end_time: string }[];
  agenda: {
    id: string;
    coach_id: string;
    date: string;
    start_time: string;
    end_time: string;
    note: string;
    kind: string;
  }[];
  blocked: { id: string; coach_id: string; date: string; note: string }[];
  activity_categories: { id: string; name: string; sort_order: number; description: string }[];
  activities: {
    id: string;
    category_id: string;
    name: string;
    has_sides: boolean;
    active: boolean;
    sort_order: number;
  }[];
};

function asRowArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

let lastExpirySweepMs = 0;

export async function loadAppState(sql: Sql, sessionCookieRaw: string | null): Promise<LoadAppStateResult> {
  if (!sessionCookieRaw) {
    return { payload: emptyAppState(), clearSessionCookie: false };
  }

  const parsedSession = parseSessionCookieValue(sessionCookieRaw);
  if (!parsedSession) {
    return { payload: emptyAppState(), clearSessionCookie: true };
  }

  const sweepDue = Date.now() - lastExpirySweepMs > 60_000;
  if (sweepDue) {
    lastExpirySweepMs = Date.now();
    await getSql()`SELECT public.sweep_expired_student_access()`;
    void sendDueLicenseExpiringNotices().catch((e) => {
      const detail = e instanceof Error ? e.message : String(e);
      console.error("[license-expiring-mail] due notices failed:", detail);
    });
  }

  const snapRows = (await sql`
    SELECT jsonb_build_object(
      'users', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at), '[]'::jsonb)
        FROM (
          SELECT id, email, name, role, status, created_at, access_expires_at, overall, phone, bio, avatar_url,
            preferred_language, nationality, birth_date, gender,
            COALESCE(calendar_feed_enabled, false) AS calendar_feed_enabled,
            COALESCE(lesson_reminders_enabled, true) AS lesson_reminders_enabled,
            COALESCE(lesson_request_alerts_enabled, true) AS lesson_request_alerts_enabled,
            COALESCE(evaluation_alerts_enabled, true) AS evaluation_alerts_enabled,
            COALESCE(session_version, 0)::int AS session_version,
            (id = ${parsedSession.userId} AND public.two_factor_is_enabled(id)) AS two_factor_enabled
          FROM users
        ) t
      ),
      'courts', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.name), '[]'::jsonb)
        FROM (
          SELECT id, name, COALESCE(court_type, 'Standard') AS court_type, COALESCE(court_number, '') AS court_number,
            COALESCE(address, '') AS address, surface, indoor
          FROM courts
        ) t
      ),
      'events', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.date, t.time), '[]'::jsonb)
        FROM (
          SELECT id, title, date, time, COALESCE(address, '') AS address, COALESCE(venue, '') AS venue,
            COALESCE(description, '') AS description,
            created_by, type, COALESCE(NULLIF(slug, ''), id) AS slug
          FROM events
        ) t
      ),
      'signups', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at), '[]'::jsonb)
        FROM (
          SELECT event_id, user_id, created_at FROM event_signups
        ) t
      ),
      'lessons', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.date, t.time), '[]'::jsonb)
        FROM (
          SELECT id, student_id, coach_id, court_id, date, time, status, lesson_activity_id, lesson_type, notes
          FROM lessons
        ) t
      ),
      'evaluations', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
        FROM (
          SELECT id, student_id, coach_id, score, comment, created_at, category, competencies, skills
          FROM evaluations
        ) t
      ),
      'weekly', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.coach_id, t.weekday, t.start_time), '[]'::jsonb)
        FROM (
          SELECT id, coach_id, weekday, start_time, end_time FROM coach_weekly_availability
        ) t
      ),
      'agenda', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.coach_id, t.date, t.start_time), '[]'::jsonb)
        FROM (
          SELECT id, coach_id, date, start_time, end_time, COALESCE(note, '') AS note,
            COALESCE(kind, 'available') AS kind
          FROM coach_agenda_entries
        ) t
      ),
      'blocked', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.coach_id, t.date), '[]'::jsonb)
        FROM (
          SELECT id, coach_id, date, COALESCE(note, '') AS note FROM coach_blocked_dates
        ) t
      ),
      'activity_categories', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order, t.name), '[]'::jsonb)
        FROM (
          SELECT id, name, sort_order, COALESCE(description, '') AS description
          FROM lesson_activity_categories
        ) t
      ),
      'activities', (
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.sort_order, t.name), '[]'::jsonb)
        FROM (
          SELECT id, category_id, name, has_sides, active, sort_order FROM lesson_activities
        ) t
      )
    ) AS snapshot
  `) as { snapshot: AppStateSnapshot | string }[];

  const raw = snapRows[0]?.snapshot;
  const snap: AppStateSnapshot =
    typeof raw === "string" ? (JSON.parse(raw) as AppStateSnapshot) : (raw ?? ({} as AppStateSnapshot));

  const userRows = asRowArray<UserRow>(snap.users);
  const courtRows = asRowArray<AppStateSnapshot["courts"][number]>(snap.courts);
  const eventRows = asRowArray<AppStateSnapshot["events"][number]>(snap.events);
  const signupRows = asRowArray<AppStateSnapshot["signups"][number]>(snap.signups);
  const lessonRows = asRowArray<AppStateSnapshot["lessons"][number]>(snap.lessons);
  const evalRows = asRowArray<AppStateSnapshot["evaluations"][number]>(snap.evaluations);
  const weeklyRows = asRowArray<AppStateSnapshot["weekly"][number]>(snap.weekly);
  const agendaRows = asRowArray<AppStateSnapshot["agenda"][number]>(snap.agenda);
  const blockedRows = asRowArray<AppStateSnapshot["blocked"][number]>(snap.blocked);
  const lessonActivityCatalog = mapLessonActivityCatalog(
    asRowArray(snap.activity_categories),
    asRowArray(snap.activities),
  );

  const sessionRow = (userRows as UserRow[]).find((r) => r.id === parsedSession.userId);
  const dbSessionVersion = Number(sessionRow?.session_version ?? 0);
  if (!sessionRow || !isSessionCookieValid(parsedSession.version, dbSessionVersion)) {
    return { payload: emptyAppState(), clearSessionCookie: true };
  }

  const sessionUserId = parsedSession.userId;

  const users = (userRows as UserRow[]).map((r) => mapUser(r));
  const courts: Court[] = (
    courtRows as { id: string; name: string; court_type: string; court_number: string; address: string; surface: string; indoor: boolean }[]
  ).map((c) => ({
    id: c.id,
    name: c.name,
    courtType: c.court_type ?? "Standard",
    courtNumber: c.court_number ?? "",
    address: c.address ?? "",
    surface: c.surface,
    indoor: c.indoor,
  }));
  const events: EventItem[] = (eventRows as {
    id: string;
    title: string;
    date: string;
    time: string;
    address: string;
    venue: string;
    description: string;
    created_by: string;
    type: string;
    slug: string;
  }[]).map((e) => ({
    id: e.id,
    title: e.title,
    date: normalizeDbEventDateString(e.date) ?? String(e.date ?? "").trim(),
    time: normalizeDbEventTimeString(e.time),
    address: e.address ?? "",
    venue: e.venue ?? "",
    description: e.description ?? "",
    createdBy: e.created_by,
    type: parseEventType(e.type),
    slug: (e.slug ?? "").trim() || e.id,
  }));
  const eventSignups: EventSignup[] = (signupRows as { event_id: string; user_id: string; created_at: string | Date }[]).map(
    (r) => ({
      eventId: r.event_id,
      userId: r.user_id,
      createdAt: new Date(r.created_at).toISOString(),
    }),
  );
  const lessons: Lesson[] = (lessonRows as {
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
  }[]).map((l) => ({
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
  }));

  const evaluations: Evaluation[] = (evalRows as {
    id: string;
    student_id: string;
    coach_id: string;
    score: number;
    comment: string;
    created_at: string | Date;
    category: string | null;
    competencies: unknown;
    skills: unknown;
  }[]).map((ev) => ({
    id: ev.id,
    studentId: ev.student_id,
    coachId: ev.coach_id,
    score: ev.score,
    comment: ev.comment,
    createdAt: new Date(ev.created_at).toISOString(),
    category: ev.category as Evaluation["category"],
    competencies: dbJsonColumn<Evaluation["competencies"]>(ev.competencies),
    skills: dbJsonColumn<Evaluation["skills"]>(ev.skills),
  }));

  const coachWeeklyAvailability: CoachWeeklyWindow[] = (
    weeklyRows as {
      id: string;
      coach_id: string;
      weekday: number;
      start_time: string;
      end_time: string;
    }[]
  ).map((w) => ({
    id: w.id,
    coachId: w.coach_id,
    weekday: Number(w.weekday),
    startTime: normalizeDbEventTimeString(w.start_time),
    endTime: normalizeDbEventTimeString(w.end_time),
  }));

  const coachAgendaEntries: CoachAgendaEntry[] = (
    agendaRows as {
      id: string;
      coach_id: string;
      date: string;
      start_time: string;
      end_time: string;
      note: string;
      kind: string;
    }[]
  ).map((a) => ({
    id: a.id,
    coachId: a.coach_id,
    date: normalizeDbEventDateString(a.date) ?? String(a.date).slice(0, 10),
    startTime: normalizeDbEventTimeString(a.start_time),
    endTime: normalizeDbEventTimeString(a.end_time),
    kind: a.kind === "unavailable" ? "unavailable" : "available",
    note: a.note || undefined,
  }));

  const coachBlockedDates: CoachBlockedDate[] = (
    blockedRows as { id: string; coach_id: string; date: string; note: string }[]
  ).map((b) => ({
    id: b.id,
    coachId: b.coach_id,
    date: normalizeDbEventDateString(b.date) ?? String(b.date).slice(0, 10),
    note: b.note || undefined,
  }));

  const user = users.find((u) => u.id === sessionUserId) ?? null;
  if (!user) {
    return { payload: emptyAppState(), clearSessionCookie: true };
  }

  return {
    payload: {
      user,
      users,
      courts,
      events,
      eventSignups,
      lessons,
      evaluations,
      lessonActivityCatalog,
      coachWeeklyAvailability,
      coachAgendaEntries,
      coachBlockedDates,
    },
    clearSessionCookie: false,
  };
}
