"use client";

import { StudentScreenShell } from "@/components/student/student-screen-shell";
import { BookingWhenPanel } from "@/components/student/booking-when-panel";
import { Button } from "@/components/ui/button";
import { isCoachSlotAvailable } from "@/lib/coach-availability";
import { resolveDefaultCourtId } from "@/lib/default-court";
import { formatLessonActivityPlainText } from "@/lib/lesson-activity-display";
import { formatHm12 } from "@/lib/schedule-date";
import { cn } from "@/lib/utils";
import { hasCoachPrivileges } from "@/lib/role-utils";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  UserCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";

const STEP_COUNT = 4;

const STEPS = [
  { n: 1, labelKey: "stepProfessor" as const, icon: UserCircle2 },
  { n: 2, labelKey: "stepWhen" as const, icon: CalendarClock },
  { n: 3, labelKey: "stepType" as const, icon: ClipboardList },
  { n: 4, labelKey: "stepReview" as const, icon: ClipboardCheck },
] as const;

/** Candidates every 30 min; availability only accepts published start times (1h lesson). */
const HALF_HOUR_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function choiceCardClass(selected: boolean) {
  return cn(
    "group relative w-full rounded-2xl border p-5 text-left transition-all duration-200",
    selected
      ? "border-court/50 bg-court/[0.06] shadow-md ring-2 ring-court/25 dark:border-emerald-500/40 dark:bg-emerald-950/35 dark:ring-emerald-500/25"
      : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600",
  );
}

/** Flow footer: Back and Continue, same size on every step. */
const FOOTER_ROW = "flex items-center gap-3 pt-1";
const FOOTER_BACK = "h-12 flex-1 rounded-2xl font-medium";
const FOOTER_NEXT = "h-12 flex-1 rounded-2xl font-semibold";

export function StudentBookingFlow() {
  const {
    user,
    courts,
    users,
    lessons,
    coachWeeklyAvailability,
    coachAgendaEntries,
    coachBlockedDates,
    requestLesson,
    lessonActivityCatalog,
    refresh,
  } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("StudentBooking");
  const tTypes = useTranslations("LessonTypes");

  const [step, setStep] = useState(1);
  const [lessonActivityId, setLessonActivityId] = useState("");
  const [step2Phase, setStep2Phase] = useState<"category" | "activity">("category");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [coachId, setCoachId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "sent">("idle");
  const courtId = resolveDefaultCourtId(courts);

  useEffect(() => {
    if (submitState !== "sent") return;
    const id = window.setTimeout(() => {
      router.push("/student/home");
    }, 3200);
    return () => window.clearTimeout(id);
  }, [submitState, router]);

  const sortedCategories = useMemo(
    () => [...lessonActivityCatalog.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [lessonActivityCatalog.categories],
  );

  const activeActivitiesByCategory = useMemo(() => {
    const map = new Map<string, typeof lessonActivityCatalog.activities>();
    for (const c of lessonActivityCatalog.categories) {
      map.set(
        c.id,
        lessonActivityCatalog.activities
          .filter((a) => a.categoryId === c.id && a.active)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    }
    return map;
  }, [lessonActivityCatalog]);

  const hasAnyActiveActivity = useMemo(
    () => lessonActivityCatalog.activities.some((a) => a.active),
    [lessonActivityCatalog.activities],
  );

  const categoriesWithActivities = useMemo(
    () => sortedCategories.filter((c) => (activeActivitiesByCategory.get(c.id) ?? []).length > 0),
    [sortedCategories, activeActivitiesByCategory],
  );

  const selectedCategory = sortedCategories.find((c) => c.id === selectedCategoryId);
  const activitiesInSelectedCategory = selectedCategoryId
    ? (activeActivitiesByCategory.get(selectedCategoryId) ?? [])
    : [];

  useEffect(() => {
    if (step !== 3 || !lessonActivityId) return;
    const act = lessonActivityCatalog.activities.find((a) => a.id === lessonActivityId);
    if (act?.active) {
      setSelectedCategoryId(act.categoryId);
      setStep2Phase("activity");
    }
  }, [step, lessonActivityId, lessonActivityCatalog.activities]);

  const coaches = useMemo(
    () =>
      users.filter((u) => hasCoachPrivileges(u.role) && u.status === "active"),
    [users],
  );

  const selectedCoach = coaches.find((p) => p.id === coachId);

  const availabilityInput = useMemo(
    () => ({
      coachId: coachId,
      date,
      weekly: coachWeeklyAvailability,
      agenda: coachAgendaEntries,
      blockedDates: coachBlockedDates,
      lessons,
    }),
    [coachId, date, coachWeeklyAvailability, coachAgendaEntries, coachBlockedDates, lessons],
  );

  const dayBlocked = useMemo(() => {
    if (!coachId || !date) return false;
    return coachBlockedDates.some((b) => b.coachId === coachId && b.date === date);
  }, [coachId, date, coachBlockedDates]);

  /** Refresh lessons on entering When and preselect today on the cards. */
  useEffect(() => {
    if (step !== 2) return;
    void refresh();
    if (!date) {
      setDate(todayYmd());
      setTime("");
    }
  }, [step, refresh, date]);

  const availableTimes = useMemo(() => {
    if (!coachId || !date || dayBlocked) return [] as string[];
    return HALF_HOUR_TIMES.filter((slot) => isCoachSlotAvailable({ ...availabilityInput, time: slot }).ok);
  }, [coachId, date, dayBlocked, availabilityInput]);

  const selectedTimeOk = useMemo(() => {
    if (!coachId || !date || !time) return false;
    return availableTimes.includes(time);
  }, [coachId, date, time, availableTimes]);

  useEffect(() => {
    if (!date) {
      if (time) setTime("");
      return;
    }
    if (time && !availableTimes.includes(time)) setTime("");
  }, [date, availableTimes, time]);

  const summaryActivityLabel = useMemo(
    () =>
      formatLessonActivityPlainText(
        { lessonActivityId: lessonActivityId || undefined, lessonType: undefined },
        lessonActivityCatalog,
        (k) => tTypes(k),
      ),
    [lessonActivityId, lessonActivityCatalog, tTypes],
  );

  const scheduleLabel = useMemo(() => {
    if (!date) return "";
    const [y, m, d] = date.split("-").map(Number);
    const timeLabel = formatHm12(time);
    if (!y || !m || !d) return `${date} · ${timeLabel}`;
    const dt = new Date(y, m - 1, d);
    const datePart = dt.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    return `${datePart} · ${timeLabel}`;
  }, [date, time, locale]);

  const stepHeading = useMemo(() => {
    if (step === 1) return { title: t("step3Title"), intro: t("step3Intro") };
    if (step === 2) return { title: t("step4Title"), intro: "" };
    if (step === 3 && step2Phase === "category") {
      return { title: t("step2CategoryTitle"), intro: t("step2CategoryIntro") };
    }
    if (step === 3) {
      return {
        title: t("step2ActivityTitle", { category: selectedCategory?.name ?? "" }),
        intro: t("step2ActivityIntro"),
      };
    }
    if (step === 4 && submitState === "sent") {
      return { title: t("sentTitle"), intro: t("sentSubtitle") };
    }
    if (step === 4 && submitState === "submitting") {
      return { title: t("reviewTitle"), intro: t("sendingHint") };
    }
    return { title: t("reviewTitle"), intro: t("stepReviewIntro") };
  }, [step, step2Phase, selectedCategory?.name, submitState, t]);

  if (!user) return null;

  const submit = async () => {
    setSubmitError(null);
    if (!courtId || !date || !time || !coachId || !lessonActivityId) return;
    setSubmitState("submitting");
    const res = await requestLesson({
      studentId: user.id,
      coachId,
      courtId,
      date,
      time,
      lessonActivityId,
    });
    if (!res.ok) {
      setSubmitState("idle");
      setSubmitError(res.message ?? t("submitError"));
      return;
    }
    setSubmitState("sent");
  };

  const progressPct = (step / STEP_COUNT) * 100;

  return (
    <StudentScreenShell
      className="w-full"
      title={t("title")}
      description={t("description")}
    >
      <div className="surface-card overflow-hidden">
        <div className="p-4 sm:p-8 sm:p-10">
            <div className="mb-8">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <p className="text-sm font-semibold text-court dark:text-emerald-400/90">
                  {t("stepProgress", { current: step, total: STEP_COUNT })}
                </p>
                <span className="text-xs tabular-nums text-zinc-400">{Math.round(progressPct)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-court to-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {STEPS.map((s) => {
                  const done = submitState === "sent" || step > s.n;
                  const active = submitState === "sent" ? false : step === s.n;
                  const Icon = s.icon;
                  return (
                    <span
                      key={s.n}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        active && "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
                        done && !active && "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200",
                        !done && !active && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
                      )}
                    >
                      <span className="relative inline-flex h-3.5 w-3.5 shrink-0" aria-hidden>
                        <Check
                          className={cn("h-3.5 w-3.5", done ? "block" : "hidden")}
                          strokeWidth={2.5}
                        />
                        <Icon className={cn("absolute inset-0 h-3.5 w-3.5", done ? "hidden" : "block")} />
                      </span>
                      <span>{t(s.labelKey)}</span>
                    </span>
                  );
                })}
              </div>
              <h2
                className={cn(
                  "mt-6 font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50",
                  step === 2 ? "text-2xl sm:text-[2rem]" : "text-xl sm:text-2xl",
                )}
              >
                {stepHeading.title}
              </h2>
              {stepHeading.intro ? (
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {stepHeading.intro}
                </p>
              ) : null}
              {step === 3 && step2Phase === "activity" ? (
                <p className="mt-2 text-xs font-medium text-amber-800/90 dark:text-amber-200/85">{t("step2Legend")}</p>
              ) : null}
            </div>

            <div className="w-full min-w-0">
              {step === 1 && (
                <div className="space-y-8 animate-fade-slide">
                  {coaches.length === 0 ? (
                    <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900/50">
                      {t("noCoaches")}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {coaches.map((p) => {
                        const selected = coachId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setCoachId(p.id);
                              setDate("");
                              setTime("");
                            }}
                            className={cn(
                              choiceCardClass(selected),
                              "flex items-center gap-4 p-4 sm:min-h-[5.5rem]",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-full bg-court text-white dark:bg-emerald-500",
                                selected ? "flex" : "hidden",
                              )}
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </span>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 font-display text-xl font-bold text-zinc-500 ring-1 ring-zinc-200/80 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-300 dark:ring-zinc-700">
                              {p.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pr-8 text-left">
                              <div className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                                {p.name}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {selected ? t("coachSelectedHint") : t("coachTapHint")}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className={FOOTER_ROW}>
                    <Button
                      className={FOOTER_NEXT}
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!coachId || coaches.length === 0}
                    >
                      {t("continue")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-fade-slide">
                  {coachId ? (
                    <BookingWhenPanel
                      coachId={coachId}
                      coachName={selectedCoach?.name}
                      date={date}
                      time={time}
                      today={todayYmd()}
                      agenda={coachAgendaEntries}
                      weekly={coachWeeklyAvailability}
                      blockedDates={coachBlockedDates}
                      lessons={lessons}
                      onSelectDate={(ymd) => {
                        setDate(ymd);
                        setTime("");
                      }}
                      onSelectTime={setTime}
                    />
                  ) : null}

                  <div className={FOOTER_ROW}>
                    <Button variant="outline" type="button" className={FOOTER_BACK} onClick={() => setStep(1)}>
                      <ChevronLeft className="h-4 w-4" />
                      {t("back")}
                    </Button>
                    <Button
                      className={FOOTER_NEXT}
                      type="button"
                      onClick={() => {
                        setStep2Phase("category");
                        setStep(3);
                      }}
                      disabled={!date || !time || !selectedTimeOk}
                    >
                      {t("continue")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-fade-slide">
                  {!hasAnyActiveActivity ? (
                    <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900/50">
                      {t("noCatalogActivities")}
                    </p>
                  ) : step2Phase === "category" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {categoriesWithActivities.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setLessonActivityId("");
                            setStep2Phase("activity");
                          }}
                          className="rounded-2xl border border-zinc-200/90 bg-white p-5 text-left transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600"
                        >
                          <div className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">{cat.name}</div>
                          <div className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                            {t("step2OptionCount", { count: (activeActivitiesByCategory.get(cat.id) ?? []).length })}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="ghost"
                        className="-ml-2 h-10 rounded-xl px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        onClick={() => {
                          setStep2Phase("category");
                          setSelectedCategoryId("");
                          setLessonActivityId("");
                        }}
                      >
                        <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
                        {t("backToCategories")}
                      </Button>
                      <div className="scrollbar-themed max-h-[min(440px,52vh)] overflow-y-auto pr-1">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {activitiesInSelectedCategory.map((act) => {
                            const selected = lessonActivityId === act.id;
                            return (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => setLessonActivityId(act.id)}
                                className={cn(choiceCardClass(selected), "p-4")}
                              >
                                <span
                                  className={cn(
                                    "absolute right-2.5 top-2.5 h-6 w-6 items-center justify-center rounded-full bg-court text-white dark:bg-emerald-500",
                                    selected ? "flex" : "hidden",
                                  )}
                                >
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </span>
                                <div className="pr-8 font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{act.name}</div>
                                {act.hasSides ? (
                                  <div className="mt-2 inline-block rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
                                    D / R
                                  </div>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={FOOTER_ROW}>
                    <Button
                      variant="outline"
                      type="button"
                      className={FOOTER_BACK}
                      onClick={() => {
                        if (step2Phase === "activity") {
                          setStep2Phase("category");
                          setSelectedCategoryId("");
                          setLessonActivityId("");
                        } else {
                          setStep(2);
                        }
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t("back")}
                    </Button>
                    {step2Phase === "activity" ? (
                      <Button
                        className={FOOTER_NEXT}
                        type="button"
                        onClick={() => setStep(4)}
                        disabled={!lessonActivityId}
                      >
                        {t("stepReview")}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}

              {step === 4 && submitState === "sent" && (
                <div className="flex flex-col items-center py-10 sm:py-14 animate-fade-slide">
                  <div className="mb-2 flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-court text-white shadow-xl shadow-emerald-900/20 ring-4 ring-emerald-500/25 motion-safe:animate-success-pop dark:from-emerald-400 dark:to-emerald-700 dark:ring-emerald-400/20">
                    <Check className="h-11 w-11" strokeWidth={2.75} aria-hidden />
                  </div>
                  <p className="mt-6 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">{t("sentDoneLine")}</p>
                  <Button
                    className="mt-8 h-12 w-full max-w-xs rounded-2xl font-semibold"
                    type="button"
                    onClick={() => router.push("/student/home")}
                  >
                    {t("sentCta")}
                  </Button>
                  <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500">{t("sentRedirectHint")}</p>
                </div>
              )}

              {step === 4 && submitState !== "sent" && (
                <div className="space-y-8 animate-fade-slide">
                  <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/90 p-6 sm:p-8 dark:border-zinc-700 dark:bg-zinc-800/40">
                    <dl className="space-y-6 text-sm">
                      <div className="flex flex-col gap-1.5 border-b border-zinc-200/80 pb-5 dark:border-zinc-700/80">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t("summaryCoach")}
                        </dt>
                        <dd className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {selectedCoach?.name ?? "—"}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1.5 border-b border-zinc-200/80 pb-5 dark:border-zinc-700/80">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t("summarySchedule")}
                        </dt>
                        <dd className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {date && time ? scheduleLabel : "—"}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t("summaryFocus")}
                        </dt>
                        <dd className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                          {summaryActivityLabel || "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {submitError ? (
                    <p
                      className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50"
                      role="alert"
                    >
                      {submitError}
                    </p>
                  ) : null}

                  <div className={FOOTER_ROW}>
                    <Button
                      variant="outline"
                      type="button"
                      className={FOOTER_BACK}
                      disabled={submitState === "submitting"}
                      onClick={() => setStep(3)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t("back")}
                    </Button>
                    <Button
                      className={FOOTER_NEXT}
                      type="button"
                      onClick={() => void submit()}
                      disabled={!coachId || !lessonActivityId || submitState === "submitting"}
                    >
                      {submitState === "submitting" ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          {t("sending")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          {t("submit")}
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </StudentScreenShell>
  );
}
