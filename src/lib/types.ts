export type UserRole = "student" | "coach" | "superadmin" | "coach_admin";

/** Role when creating a staff user in admin (coach and/or admin). */
export type CoachAccessRole = "coach" | "coach_admin" | "superadmin";

export type AccountStatus = "active" | "pending" | "expired" | "deactivated";

export const USER_GENDER_KEYS = ["male", "female", "other"] as const;
export type UserGender = (typeof USER_GENDER_KEYS)[number];

export const EVENT_TYPES = ["tournament", "clinic", "social", "group_lesson", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  /** Never sent by the API; only existed in the localStorage model. */
  password?: string;
  status: AccountStatus;
  createdAt: string;
  accessExpiresAt?: string;
  overall: number;
  phone?: string;
  bio?: string;
  /** Reserved for future language preferences (UI is currently Portuguese). */
  preferredLanguage?: string;
  /** Nationality (free text, e.g. Portugal, Brazil). */
  nationality?: string;
  /** Birth date `YYYY-MM-DD` (age derived on client/server). */
  birthDate?: string;
  /** Self-reported gender. */
  gender?: UserGender;
  /** Whether the phone calendar feed is enabled (confirmed lessons). */
  calendarFeedEnabled?: boolean;
  /** Whether an ICS invite is sent when the lesson is confirmed. On by default. */
  lessonRemindersEnabled?: boolean;
  /** Whether the coach is emailed when a student requests a lesson. On by default. */
  lessonRequestAlertsEnabled?: boolean;
  /** Whether the student is emailed when the coach evaluates a lesson. On by default. */
  evaluationAlertsEnabled?: boolean;
  /** Two-factor authentication (TOTP) enabled. */
  twoFactorEnabled?: boolean;
}

export interface Court {
  id: string;
  name: string;
  /** Court type (Indoor, Outdoor, Covered, etc.). */
  courtType: string;
  /** Court reference number (e.g. 1, 2, A). */
  courtNumber: string;
  /** Address or location of the court / facility. */
  address: string;
  surface: string;
  indoor: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  /** Place or address for the event (e.g. hall entrance). */
  address: string;
  /** Short venue name (e.g. hall, club) — shown on the schedule. */
  venue: string;
  /** Free text: what the event is, rules, level, equipment, etc. */
  description: string;
  createdBy: string;
  type: EventType;
  /** Public URL identifier (unique). Not the primary key. */
  slug: string;
}

/** Student signup for a club event (shared schedule). */
export interface EventSignup {
  eventId: string;
  userId: string;
  createdAt: string;
}

export const LESSON_TYPE_KEYS = [
  "individual",
  "pairs",
  "technical",
  "tactical",
  "physical",
  "match",
] as const;
export type LessonType = (typeof LESSON_TYPE_KEYS)[number];

/** Lesson-focus catalog category (editable by coach/admin). */
export interface LessonActivityCategory {
  id: string;
  name: string;
  /** Short text shown under the title in the list. */
  description: string;
  sortOrder: number;
}

/** Technical activity / lesson focus (label e.g. in Spanish). */
export interface LessonActivity {
  id: string;
  categoryId: string;
  name: string;
  /** Forehand and backhand (D / R). */
  hasSides: boolean;
  active: boolean;
  sortOrder: number;
}

export interface LessonActivityCatalog {
  categories: LessonActivityCategory[];
  activities: LessonActivity[];
}

export interface Lesson {
  id: string;
  studentId: string;
  coachId: string;
  courtId: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "declined" | "completed";
  /** Lesson focus chosen by the student (shared catalog). */
  lessonActivityId?: string;
  /** Legacy format; kept for data already stored in the browser. */
  lessonType?: LessonType;
  notes?: string;
}

/** Legacy dimensions (Technical / Tactical / Physical / Mental) — legacy data only. */
export const COMPETENCY_KEYS = ["tecnica", "tatico", "fisico", "mental"] as const;
export type CompetencyKey = (typeof COMPETENCY_KEYS)[number];

/**
 * Map skills (aligned with the radar): Consistency, Tactical reading, Control,
 * Serve, Endurance, Positioning.
 */
export const SKILL_AXIS_KEYS = [
  "consistency",
  "tactical_read",
  "control",
  "serve",
  "endurance",
  "positioning",
] as const;
export type SkillAxisKey = (typeof SKILL_AXIS_KEYS)[number];

export interface Evaluation {
  id: string;
  studentId: string;
  coachId: string;
  /** Overall evaluation score (mean of 6 skills, 4 legacy dimensions, or a single grade). */
  score: number;
  comment: string;
  createdAt: string;
  /** Legacy: a single old dimension. */
  category?: CompetencyKey;
  /** Legacy: four old dimensions on the same evaluation. */
  competencies?: Record<CompetencyKey, number>;
  /** Six map skills; `score` should be the rounded mean. */
  skills?: Record<SkillAxisKey, number>;
}

/** Recurring coach availability window (`weekday` = `Date#getDay()`). */
export interface CoachWeeklyWindow {
  id: string;
  coachId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

/** Full day the coach does not take lessons (legacy). */
export interface CoachBlockedDate {
  id: string;
  coachId: string;
  date: string;
  note?: string;
}

export type CoachAgendaKind = "available" | "unavailable";

/** Coach agenda entry: day + time + reason (+ available or not). */
export interface CoachAgendaEntry {
  id: string;
  coachId: string;
  date: string;
  startTime: string;
  endTime: string;
  kind: CoachAgendaKind;
  note?: string;
}
