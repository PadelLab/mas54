"use client";

/**
 * @deprecated App data (users, courts, lessons, etc.) moved to the API
 * and PostgreSQL via `DATABASE_URL`. This module remains only as a reference for old keys.
 */

import type {
  User,
  Court,
  EventItem,
  Lesson,
  Evaluation,
  LessonActivityCatalog,
} from "./types";

const KEYS = {
  users: "padellab_users",
  session: "padellab_session",
  courts: "padellab_courts",
  events: "padellab_events",
  lessons: "padellab_lessons",
  evaluations: "padellab_evaluations",
  lessonActivityCatalog: "padellab_lesson_activity_catalog",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getUsers: (): User[] => read(KEYS.users, []),
  setUsers: (u: User[]) => write(KEYS.users, u),
  getSessionUserId: (): string | null =>
    typeof window === "undefined" ? null : localStorage.getItem(KEYS.session),
  setSessionUserId: (id: string | null) => {
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem(KEYS.session, id);
    else localStorage.removeItem(KEYS.session);
  },
  getCourts: (): Court[] => read(KEYS.courts, []),
  setCourts: (c: Court[]) => write(KEYS.courts, c),
  getEvents: (): EventItem[] => read(KEYS.events, []),
  setEvents: (e: EventItem[]) => write(KEYS.events, e),
  getLessons: (): Lesson[] => read(KEYS.lessons, []),
  setLessons: (l: Lesson[]) => write(KEYS.lessons, l),
  getEvaluations: (): Evaluation[] => read(KEYS.evaluations, []),
  setEvaluations: (e: Evaluation[]) => write(KEYS.evaluations, e),
  getLessonActivityCatalog: (): LessonActivityCatalog | null => {
    const raw = read<LessonActivityCatalog | null>(KEYS.lessonActivityCatalog, null);
    if (!raw?.categories?.length || !raw?.activities) return null;
    return {
      ...raw,
      categories: raw.categories.map((c) => ({ ...c, description: c.description ?? "" })),
    };
  },
  setLessonActivityCatalog: (c: LessonActivityCatalog) =>
    write(KEYS.lessonActivityCatalog, c),
};

export { KEYS };
