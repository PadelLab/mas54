"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  User,
  UserRole,
  UserGender,
  AccountStatus,
  Court,
  EventItem,
  EventSignup,
  Lesson,
  Evaluation,
  LessonActivity,
  LessonActivityCatalog,
  LessonActivityCategory,
  CoachAccessRole,
  CoachWeeklyWindow,
  CoachAgendaEntry,
  CoachAgendaKind,
  CoachBlockedDate,
} from "@/lib/types";
import { COMPETENCY_KEYS, SKILL_AXIS_KEYS } from "@/lib/types";
import { createDefaultLessonActivityCatalog } from "@/lib/padel-activities";
import { isAccessExpired } from "@/lib/utils";

const JSON_HEADERS = { "Content-Type": "application/json" };

type AppSnapshot = {
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

const emptyCatalog = (): LessonActivityCatalog => ({ categories: [], activities: [] });

const fallbackSnapshot = (): AppSnapshot => ({
  user: null,
  users: [],
  courts: [],
  events: [],
  eventSignups: [],
  lessons: [],
  evaluations: [],
  lessonActivityCatalog: emptyCatalog(),
  coachWeeklyAvailability: [],
  coachAgendaEntries: [],
  coachBlockedDates: [],
});

async function apiPostJson<T>(url: string, body: unknown): Promise<{ res: Response; data: T }> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { res, data };
}

type AuthContextValue = {
  hydrated: boolean;
  dbError: string | null;
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
  setCoachWeeklyAvailability: (
    windows: { weekday: number; startTime: string; endTime: string }[],
  ) => Promise<{ ok: boolean; message?: string }>;
  addCoachAgendaEntry: (input: {
    date: string;
    startTime: string;
    endTime: string;
    kind: CoachAgendaKind;
    note?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  removeCoachAgendaEntry: (id: string) => Promise<{ ok: boolean; message?: string }>;
  addCoachBlockedDate: (date: string, note?: string) => Promise<{ ok: boolean; message?: string }>;
  removeCoachBlockedDate: (id: string) => Promise<{ ok: boolean; message?: string }>;
  addLessonActivityCategory: (
    name: string,
    description?: string,
  ) => Promise<{ ok: boolean; id?: string; message?: string }>;
  renameLessonActivityCategory: (id: string, name: string) => void;
  updateLessonActivityCategoryDescription: (id: string, description: string) => void;
  removeLessonActivityCategory: (id: string) => Promise<{ ok: boolean; message?: string }>;
  addLessonActivity: (input: {
    categoryId: string;
    name: string;
    hasSides: boolean;
    active?: boolean;
  }) => Promise<void>;
  updateLessonActivity: (
    id: string,
    patch: Partial<Pick<LessonActivity, "name" | "hasSides" | "active" | "categoryId">>
  ) => void;
  removeLessonActivity: (id: string) => Promise<void>;
  login: (
    email: string,
    password: string
  ) => Promise<{
    ok: boolean;
    message?: string;
    role?: UserRole;
    needsTwoFactor?: boolean;
    mustChangePassword?: boolean;
  }>;
  completeTempPassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; message?: string; role?: UserRole; needsTwoFactor?: boolean }>;
  verifyTwoFactor: (
    code: string
  ) => Promise<{ ok: boolean; message?: string; role?: UserRole }>;
  completeEmailVerification: (
    email: string,
    otp: string
  ) => Promise<{ ok: boolean; message?: string; role?: UserRole; mustChangePassword?: boolean }>;
  resendEmailVerification: (email: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  registerStudent: (data: {
    name: string;
    email: string;
    password: string;
    nationality: string;
    birthDate: string;
    gender: UserGender;
  }) => Promise<{ ok: boolean; message?: string; needsEmailVerification?: boolean }>;
  registerProfessor: (data: {
    name: string;
    email: string;
    password: string;
    nationality: string;
    birthDate: string;
    gender: UserGender;
  }) => Promise<{ ok: boolean; message?: string }>;
  updateProfile: (
    id: string,
    patch: Partial<User>
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  setCalendarFeedEnabled: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>;
  setLessonRemindersEnabled: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>;
  setLessonRequestAlertsEnabled: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>;
  setEvaluationAlertsEnabled: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>;
  changePassword: (
    id: string,
    current: string,
    next: string,
    opts?: { revokeOtherSessions?: boolean },
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteOwnAccount: () => Promise<{ ok: boolean; message?: string }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
  activateUser: (id: string) => Promise<void>;
  reactivateStudent: (id: string) => Promise<void>;
  setAccountStatus: (id: string, status: AccountStatus) => Promise<void>;
  setUserRole: (id: string, role: UserRole) => Promise<{ ok: boolean; message?: string }>;
  createCoachAccess: (data: {
    name: string;
    email: string;
    coachRole?: CoachAccessRole;
    tempPassword?: string;
  }) => Promise<{ ok: boolean; message?: string; emailSent?: boolean; tempPassword?: string }>;
  addCourt: (c: Omit<Court, "id">) => Promise<void>;
  updateCourt: (id: string, patch: Partial<Pick<Court, "name" | "courtType" | "courtNumber" | "address" | "surface" | "indoor">>) => Promise<void>;
  removeCourt: (id: string) => Promise<void>;
  addEvent: (e: Omit<EventItem, "id" | "slug">) => Promise<void>;
  updateEvent: (id: string, patch: Partial<EventItem>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  joinEvent: (eventId: string) => Promise<{ ok: boolean; message?: string }>;
  leaveEvent: (eventId: string) => Promise<{ ok: boolean; message?: string }>;
  requestLesson: (
    input: Omit<Lesson, "id" | "status">
  ) => Promise<{ ok: boolean; message?: string }>;
  respondLesson: (id: string, status: "confirmed" | "declined", reason?: string) => Promise<void>;
  updateLesson: (id: string, patch: Partial<Lesson>) => Promise<{ ok: boolean; message?: string }>;
  removeLesson: (id: string) => Promise<void>;
  addEvaluation: (input: Omit<Evaluation, "id" | "createdAt">) => Promise<{ ok: boolean; message?: string }>;
  completeLessonWithEvaluation: (
    lessonId: string,
    input: Omit<Evaluation, "id" | "createdAt">,
  ) => Promise<{ ok: boolean; message?: string }>;
  accessBlocked: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const renameCategoryTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const updateActivityNameTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pullSeqRef = useRef(0);

  const pullState = useCallback(async (): Promise<{ ok: boolean; user: User | null }> => {
    const seq = ++pullSeqRef.current;
    try {
      const res = await fetch("/api/padellab", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as AppSnapshot & { error?: string; eventSignups?: EventSignup[] };
      const user = data.user ?? null;
      if (seq !== pullSeqRef.current) {
        return { ok: res.ok, user };
      }
      if (!res.ok) {
        setDbError(data.error ?? `Erro ${res.status}`);
        setSnapshot(fallbackSnapshot());
        return { ok: false, user: null };
      }
      setDbError(null);
      const next: AppSnapshot = {
        user,
        users: data.users ?? [],
        courts: data.courts ?? [],
        events: data.events ?? [],
        eventSignups: data.eventSignups ?? [],
        lessons: data.lessons ?? [],
        evaluations: data.evaluations ?? [],
        lessonActivityCatalog: data.lessonActivityCatalog ?? {
          categories: [],
          activities: [],
        },
        coachWeeklyAvailability: data.coachWeeklyAvailability ?? [],
        coachAgendaEntries: data.coachAgendaEntries ?? [],
        coachBlockedDates: data.coachBlockedDates ?? [],
      };
      setSnapshot(next);
      return { ok: true, user };
    } catch (e) {
      if (seq !== pullSeqRef.current) {
        return { ok: false, user: null };
      }
      setDbError(e instanceof Error ? e.message : "Falha de rede.");
      setSnapshot(fallbackSnapshot());
      return { ok: false, user: null };
    } finally {
      if (seq === pullSeqRef.current) {
        setHydrated(true);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const pulled = await pullState();
      if (!active) return;
      if (!pulled.user) {
        await new Promise((r) => setTimeout(r, 200));
        if (!active) return;
        await pullState();
      }
    })();
    return () => {
      active = false;
      pullSeqRef.current += 1;
    };
  }, [pullState]);

  const refresh = useCallback(async () => {
    await pullState();
  }, [pullState]);

  const mutate = useCallback(
    async (body: Record<string, unknown>) => {
      const { res, data } = await apiPostJson<{ ok?: boolean; message?: string }>("/api/padellab", body);
      if (!res.ok || data.ok === false) {
        return { ok: false as const, message: data.message ?? res.statusText };
      }
      // Do not block the UI waiting for GET: modals (e.g. complete lesson) close right after a successful POST.
      void pullState();
      return { ok: true as const };
    },
    [pullState]
  );

  const addLessonActivityCategory = useCallback(
    async (name: string, description?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false as const };
      const { res, data } = await apiPostJson<{ ok?: boolean; id?: string; message?: string }>("/api/padellab", {
        action: "add_lesson_activity_category",
        name: trimmed,
        description: (description ?? "").trim(),
      });
      if (!res.ok || data.ok === false) {
        return { ok: false as const, message: data.message ?? "Erro ao criar." };
      }
      await pullState();
      return { ok: true as const, id: data.id };
    },
    [pullState]
  );

  const patchCategoryLocal = useCallback((id: string, patch: Partial<Pick<LessonActivityCategory, "name" | "description">>) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lessonActivityCatalog: {
          ...prev.lessonActivityCatalog,
          categories: prev.lessonActivityCatalog.categories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        },
      };
    });
  }, []);

  const renameLessonActivityCategory = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      patchCategoryLocal(id, { name });
      const prev = renameCategoryTimers.current[id];
      if (prev) clearTimeout(prev);
      renameCategoryTimers.current[id] = setTimeout(() => {
        void mutate({ action: "rename_lesson_activity_category", id, name: trimmed });
      }, 400);
    },
    [mutate, patchCategoryLocal]
  );

  const updateLessonActivityCategoryDescription = useCallback(
    (id: string, description: string) => {
      patchCategoryLocal(id, { description });
      const prev = renameCategoryTimers.current[`desc-${id}`];
      if (prev) clearTimeout(prev);
      renameCategoryTimers.current[`desc-${id}`] = setTimeout(() => {
        void mutate({ action: "rename_lesson_activity_category", id, description });
      }, 400);
    },
    [mutate, patchCategoryLocal]
  );

  const removeLessonActivityCategory = useCallback(
    async (id: string) => {
      const { res, data } = await apiPostJson<{ ok?: boolean; message?: string }>("/api/padellab", {
        action: "remove_lesson_activity_category",
        id,
      });
      if (!res.ok || data.ok === false) {
        return { ok: false as const, message: data.message ?? "Erro ao remover." };
      }
      await pullState();
      return { ok: true as const };
    },
    [pullState]
  );

  const addLessonActivity = useCallback(
    async (input: { categoryId: string; name: string; hasSides: boolean; active?: boolean }) => {
      const trimmed = input.name.trim();
      if (!trimmed || !input.categoryId) return;
      await mutate({
        action: "add_lesson_activity",
        categoryId: input.categoryId,
        name: trimmed,
        hasSides: input.hasSides,
        active: input.active ?? true,
      });
    },
    [mutate]
  );

  const updateLessonActivity = useCallback(
    (id: string, patch: Partial<Pick<LessonActivity, "name" | "hasSides" | "active" | "categoryId">>) => {
      if (typeof patch.name === "string") {
        const trimmed = patch.name.trim();
        const prev = updateActivityNameTimers.current[id];
        if (prev) clearTimeout(prev);
        updateActivityNameTimers.current[id] = setTimeout(() => {
          void mutate({ action: "update_lesson_activity", id, patch: { ...patch, name: trimmed } });
        }, 400);
        return;
      }
      void mutate({ action: "update_lesson_activity", id, patch });
    },
    [mutate]
  );

  const removeLessonActivity = useCallback(
    async (id: string) => {
      await mutate({ action: "remove_lesson_activity", id });
    },
    [mutate]
  );

  const finishLogin = useCallback(async () => {
    let pulled = await pullState();
    if (!pulled.user) {
      await new Promise((r) => setTimeout(r, 150));
      pulled = await pullState();
    }
    if (!pulled.ok || !pulled.user) {
      return { ok: false as const, message: "__SESSION_NOT_LOADED__" };
    }
    return { ok: true as const, role: pulled.user.role };
  }, [pullState]);

  const login = useCallback(async (email: string, password: string) => {
    const { res, data } = await apiPostJson<{
      ok?: boolean;
      message?: string;
      role?: UserRole;
      needsTwoFactor?: boolean;
      mustChangePassword?: boolean;
    }>(
      "/api/auth/login",
      { email, password }
    );
    if (!res.ok || data.ok === false) {
      return { ok: false as const, message: data.message ?? "Erro ao entrar." };
    }
    if (data.mustChangePassword) {
      return { ok: true as const, mustChangePassword: true };
    }
    if (data.needsTwoFactor) {
      return { ok: true as const, needsTwoFactor: true };
    }
    return finishLogin();
  }, [finishLogin]);

  const completeTempPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const { res, data } = await apiPostJson<{
      ok?: boolean;
      message?: string;
      role?: UserRole;
      needsTwoFactor?: boolean;
    }>("/api/auth/complete-temp-password", { currentPassword, newPassword });
    if (!res.ok || data.ok === false) {
      return { ok: false as const, message: data.message ?? "Não foi possível alterar a senha." };
    }
    if (data.needsTwoFactor) {
      return { ok: true as const, needsTwoFactor: true };
    }
    return finishLogin();
  }, [finishLogin]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    const { res, data } = await apiPostJson<{ ok?: boolean; message?: string; role?: UserRole }>(
      "/api/auth/verify-2fa",
      { code },
    );
    if (!res.ok || data.ok === false) {
      return { ok: false as const, message: data.message ?? "INVALID_CODE" };
    }
    return finishLogin();
  }, [finishLogin]);

  const completeEmailVerification = useCallback(async (email: string, otp: string) => {
    const { res, data } = await apiPostJson<{
      ok?: boolean;
      message?: string;
      role?: UserRole;
      mustChangePassword?: boolean;
    }>("/api/auth/confirm-email", { email, otp });
    if (!res.ok || data.ok === false) {
      if (res.status >= 500) {
        return { ok: false as const, message: "__VERIFY_UNAVAILABLE__" };
      }
      return { ok: false as const, message: data.message ?? "INVALID_CODE" };
    }
    if (data.mustChangePassword) {
      return { ok: true as const, mustChangePassword: true, role: data.role };
    }
    void pullState();
    return { ok: true as const, role: data.role ?? "student" };
  }, [pullState]);

  const resendEmailVerification = useCallback(async (email: string) => {
    const { res, data } = await apiPostJson<{ ok?: boolean; message?: string }>(
      "/api/auth/resend-email-code",
      { email },
    );
    if (!res.ok || data.ok === false) {
      return { ok: false as const, message: data.message ?? "Não foi possível reenviar o código." };
    }
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      setDbError(null);
      setSnapshot(fallbackSnapshot());
      await pullState();
    }
  }, [pullState]);

  const registerStudent = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      nationality: string;
      birthDate: string;
      gender: UserGender;
    }) => {
      const { res, data: j } = await apiPostJson<{
        ok?: boolean;
        message?: string;
        needsEmailVerification?: boolean;
      }>("/api/padellab", {
        action: "register_student",
        name: data.name,
        email: data.email,
        password: data.password,
        nationality: data.nationality,
        birthDate: data.birthDate,
        gender: data.gender,
      });
      if (!res.ok || j.ok === false) {
        return { ok: false as const, message: j.message ?? "Erro no cadastro." };
      }
      if (j.needsEmailVerification) {
        return { ok: true as const, needsEmailVerification: true };
      }
      let pulled = await pullState();
      if (!pulled.user) {
        await new Promise((r) => setTimeout(r, 150));
        pulled = await pullState();
      }
      if (!pulled.ok || !pulled.user) {
        return { ok: false as const, message: "Conta criada mas a sessão não iniciou. Faça login manualmente." };
      }
      return { ok: true as const };
    },
    [pullState]
  );

  const registerProfessor = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      nationality: string;
      birthDate: string;
      gender: UserGender;
    }) => {
      const { res, data: j } = await apiPostJson<{ ok?: boolean; message?: string }>("/api/padellab", {
        action: "register_coach",
        name: data.name,
        email: data.email,
        password: data.password,
        nationality: data.nationality,
        birthDate: data.birthDate,
        gender: data.gender,
      });
      if (!res.ok || j.ok === false) {
        return { ok: false as const, message: j.message ?? "Erro no cadastro." };
      }
      await pullState();
      return {
        ok: true as const,
        message: "Cadastro enviado. Um administrador irá liberar seu acesso.",
      };
    },
    [pullState]
  );

  const updateProfile = useCallback(
    async (id: string, patch: Partial<User>) => {
      return mutate({ action: "update_profile", id, patch });
    },
    [mutate]
  );

  const setCalendarFeedEnabled = useCallback(
    async (enabled: boolean) => mutate({ action: "set_calendar_feed_enabled", enabled }),
    [mutate],
  );

  const setLessonRemindersEnabled = useCallback(
    async (enabled: boolean) => mutate({ action: "set_lesson_reminders_enabled", enabled }),
    [mutate],
  );

  const setLessonRequestAlertsEnabled = useCallback(
    async (enabled: boolean) => mutate({ action: "set_lesson_request_alerts_enabled", enabled }),
    [mutate],
  );

  const setEvaluationAlertsEnabled = useCallback(
    async (enabled: boolean) => mutate({ action: "set_evaluation_alerts_enabled", enabled }),
    [mutate],
  );

  const changePassword = useCallback(
    async (id: string, current: string, next: string, opts?: { revokeOtherSessions?: boolean }) => {
      const { res, data } = await apiPostJson<{ ok?: boolean; message?: string }>("/api/padellab", {
        action: "change_password",
        id,
        current,
        next,
        revoke_other_sessions: Boolean(opts?.revokeOtherSessions),
      });
      if (!res.ok || data.ok === false) {
        return { ok: false as const, message: data.message ?? "Erro." };
      }
      await pullState();
      return { ok: true as const };
    },
    [pullState]
  );

  const deleteOwnAccount = useCallback(async () => {
    const { res, data } = await apiPostJson<{ ok?: boolean; message?: string }>("/api/padellab", {
      action: "delete_own_account",
    });
    if (!res.ok || data.ok === false) {
      return { ok: false as const, message: data.message ?? "Erro." };
    }
    setSnapshot(fallbackSnapshot());
    return { ok: true as const };
  }, []);

  const deleteUser = useCallback(
    async (id: string) => {
      return mutate({ action: "delete_user", id });
    },
    [mutate],
  );

  const activateUser = useCallback(
    async (id: string) => {
      await mutate({ action: "activate_user", id });
    },
    [mutate]
  );

  const reactivateStudent = useCallback(
    async (id: string) => {
      await mutate({ action: "reactivate_student", id });
    },
    [mutate]
  );

  const setAccountStatus = useCallback(
    async (id: string, status: AccountStatus) => {
      await mutate({ action: "set_account_status", id, status });
    },
    [mutate]
  );

  const setUserRole = useCallback(
    async (id: string, role: UserRole) => {
      return mutate({ action: "set_user_role", id, role });
    },
    [mutate]
  );

  const createCoachAccess = useCallback(
    async (data: {
      name: string;
      email: string;
      coachRole?: CoachAccessRole;
      tempPassword?: string;
    }) => {
      const { res, data: j } = await apiPostJson<{
        ok?: boolean;
        message?: string;
        emailSent?: boolean;
        tempPassword?: string;
      }>("/api/padellab", {
        action: "create_coach_access",
        ...data,
      });
      if (!res.ok || j.ok === false) {
        return { ok: false as const, message: j.message ?? "Não foi possível criar o acesso." };
      }
      await pullState();
      return {
        ok: true as const,
        emailSent: j.emailSent !== false,
        tempPassword: typeof j.tempPassword === "string" ? j.tempPassword : undefined,
      };
    },
    [pullState]
  );

  const addCourt = useCallback(
    async (c: Omit<Court, "id">) => {
      await mutate({
        action: "add_court",
        name: c.name,
        courtType: c.courtType,
        courtNumber: c.courtNumber ?? "",
        address: c.address ?? "",
        surface: c.surface,
        indoor: c.indoor,
      });
    },
    [mutate]
  );

  const updateCourt = useCallback(
    async (id: string, patch: Partial<Pick<Court, "name" | "courtType" | "courtNumber" | "address" | "surface" | "indoor">>) => {
      await mutate({ action: "update_court", id, patch });
    },
    [mutate]
  );

  const removeCourt = useCallback(
    async (id: string) => {
      await mutate({ action: "remove_court", id });
    },
    [mutate]
  );

  const addEvent = useCallback(
    async (e: Omit<EventItem, "id" | "slug">) => {
      await mutate({ action: "add_event", event: e });
    },
    [mutate]
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<EventItem>) => {
      await mutate({ action: "update_event", id, patch });
    },
    [mutate]
  );

  const removeEvent = useCallback(
    async (id: string) => {
      await mutate({ action: "remove_event", id });
    },
    [mutate]
  );

  const joinEvent = useCallback(
    async (eventId: string) => mutate({ action: "join_event", eventId }),
    [mutate]
  );

  const leaveEvent = useCallback(
    async (eventId: string) => mutate({ action: "leave_event", eventId }),
    [mutate]
  );

  const requestLesson = useCallback(
    async (input: Omit<Lesson, "id" | "status">) => {
      return mutate({ action: "request_lesson", lesson: input });
    },
    [mutate]
  );

  const setCoachWeeklyAvailability = useCallback(
    async (windows: { weekday: number; startTime: string; endTime: string }[]) => {
      return mutate({ action: "set_coach_weekly_availability", windows });
    },
    [mutate],
  );

  const addCoachAgendaEntry = useCallback(
    async (input: {
      date: string;
      startTime: string;
      endTime: string;
      kind: CoachAgendaKind;
      note?: string;
    }) => {
      return mutate({
        action: "add_coach_agenda_entry",
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        kind: input.kind,
        note: input.note ?? "",
      });
    },
    [mutate],
  );

  const removeCoachAgendaEntry = useCallback(
    async (id: string) => {
      return mutate({ action: "remove_coach_agenda_entry", id });
    },
    [mutate],
  );

  const addCoachBlockedDate = useCallback(
    async (date: string, note?: string) => {
      return mutate({ action: "add_coach_blocked_date", date, note: note ?? "" });
    },
    [mutate],
  );

  const removeCoachBlockedDate = useCallback(
    async (id: string) => {
      return mutate({ action: "remove_coach_blocked_date", id });
    },
    [mutate],
  );

  const respondLesson = useCallback(
    async (id: string, status: "confirmed" | "declined", reason?: string) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lessons: prev.lessons.map((l) => (l.id === id ? { ...l, status } : l)),
        };
      });
      const result = await mutate({ action: "respond_lesson", id, status, reason });
      if (!result.ok) void pullState();
    },
    [mutate, pullState]
  );

  const updateLesson = useCallback(
    async (id: string, patch: Partial<Lesson>) => {
      return mutate({ action: "update_lesson", id, patch });
    },
    [mutate]
  );

  const removeLesson = useCallback(
    async (id: string) => {
      await mutate({ action: "remove_lesson", id });
    },
    [mutate]
  );

  const addEvaluation = useCallback(
    async (input: Omit<Evaluation, "id" | "createdAt">) => {
      let payload: Omit<Evaluation, "id" | "createdAt"> = { ...input };
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
      return mutate({ action: "add_evaluation", evaluation: payload });
    },
    [mutate]
  );

  const completeLessonWithEvaluation = useCallback(
    async (lessonId: string, input: Omit<Evaluation, "id" | "createdAt">) => {
      let payload: Omit<Evaluation, "id" | "createdAt"> = { ...input };
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
      return mutate({ action: "complete_lesson_with_evaluation", lessonId, evaluation: payload });
    },
    [mutate]
  );

  const value = useMemo<AuthContextValue>(() => {
    const user = snapshot?.user ?? null;
    const users = snapshot?.users ?? [];
    const courts = snapshot?.courts ?? [];
    const events = snapshot?.events ?? [];
    const eventSignups = snapshot?.eventSignups ?? [];
    const lessons = snapshot?.lessons ?? [];
    const evaluations = snapshot?.evaluations ?? [];
    const lessonActivityCatalog =
      snapshot?.lessonActivityCatalog ?? createDefaultLessonActivityCatalog();
    const coachWeeklyAvailability = snapshot?.coachWeeklyAvailability ?? [];
    const coachAgendaEntries = snapshot?.coachAgendaEntries ?? [];
    const coachBlockedDates = snapshot?.coachBlockedDates ?? [];
    const accessBlocked = Boolean(user && isAccessExpired(user));

    return {
      hydrated,
      dbError,
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
      setCoachWeeklyAvailability,
      addCoachAgendaEntry,
      removeCoachAgendaEntry,
      addCoachBlockedDate,
      removeCoachBlockedDate,
      addLessonActivityCategory,
      renameLessonActivityCategory,
      updateLessonActivityCategoryDescription,
      removeLessonActivityCategory,
      addLessonActivity,
      updateLessonActivity,
      removeLessonActivity,
      login,
      completeTempPassword,
      verifyTwoFactor,
      logout,
      completeEmailVerification,
      resendEmailVerification,
      registerStudent,
      registerProfessor,
      updateProfile,
      setCalendarFeedEnabled,
      setLessonRemindersEnabled,
      setLessonRequestAlertsEnabled,
      setEvaluationAlertsEnabled,
      changePassword,
      deleteOwnAccount,
      deleteUser,
      refresh,
      activateUser,
      reactivateStudent,
      setAccountStatus,
      setUserRole,
      createCoachAccess,
      addCourt,
      updateCourt,
      removeCourt,
      addEvent,
      updateEvent,
      removeEvent,
      joinEvent,
      leaveEvent,
      requestLesson,
      respondLesson,
      updateLesson,
      removeLesson,
      addEvaluation,
      completeLessonWithEvaluation,
      accessBlocked,
    };
  }, [
      snapshot,
      hydrated,
      dbError,
      setCoachWeeklyAvailability,
      addCoachAgendaEntry,
      removeCoachAgendaEntry,
      addCoachBlockedDate,
      removeCoachBlockedDate,
      addLessonActivityCategory,
      renameLessonActivityCategory,
      updateLessonActivityCategoryDescription,
      removeLessonActivityCategory,
      addLessonActivity,
      updateLessonActivity,
      removeLessonActivity,
      login,
      completeTempPassword,
      verifyTwoFactor,
      logout,
      completeEmailVerification,
      resendEmailVerification,
      registerStudent,
      registerProfessor,
      updateProfile,
      setCalendarFeedEnabled,
      setLessonRemindersEnabled,
      setLessonRequestAlertsEnabled,
      setEvaluationAlertsEnabled,
      changePassword,
      deleteOwnAccount,
      deleteUser,
      refresh,
      activateUser,
      reactivateStudent,
      setAccountStatus,
      setUserRole,
      createCoachAccess,
      addCourt,
      updateCourt,
      removeCourt,
      addEvent,
      updateEvent,
      removeEvent,
      joinEvent,
      leaveEvent,
      requestLesson,
      respondLesson,
      updateLesson,
      removeLesson,
      addEvaluation,
      completeLessonWithEvaluation,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
