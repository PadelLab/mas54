"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Lesson } from "@/lib/types";
import { LessonCompleteEvaluationModal } from "@/components/lessons/lesson-complete-evaluation-modal";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { LessonsListByDate } from "@/app/admin/classes/_components/lessons-list-by-date";
import { parseLessonStatusParam, lessonsVisibleOnClasses } from "@/app/admin/classes/_components/lessons-shared";
import { EmptyState } from "@/components/empty-state";
import { STATUS_CARD } from "@/app/admin/classes/_components/lesson-status-stat-cards";
import { pageTitleClass } from "@/lib/utils";

export default function CoachLessonsByStatusPage() {
  const t = useTranslations("AdminLessons");
  const tEval = useTranslations("LessonCompleteEval");
  const params = useParams();
  const raw = typeof params.status === "string" ? params.status : "";
  const parsed = parseLessonStatusParam(raw);
  const statusOk = parsed !== null;
  const status = parsed ?? "pending";

  const { user, lessons, courts, users, respondLesson, completeLessonWithEvaluation } = useAuth();
  const [completeLesson, setCompleteLesson] = useState<Lesson | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 4500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const mine = useMemo(() => lessonsVisibleOnClasses(lessons, user), [lessons, user]);

  const filtered = useMemo(() => {
    if (!statusOk) return [];
    return mine.filter((l) => l.status === status);
  }, [mine, status, statusOk]);

  if (!user) return null;

  if (!statusOk) {
    return (
      <div className="space-y-4">
        <AppBreadcrumb items={[{ href: "/coach/classes", label: t("pageTitle") }, { label: t("invalidStateUrl") }]} />
        <p className="text-sm text-court/65">{t("invalidStateUrl")}</p>
      </div>
    );
  }

  const statusLabel = t(`status.${status}`);

  const onUpdateStatus = (id: string, next: Lesson["status"], reason?: string) => {
    if (next === "confirmed" || next === "declined") void respondLesson(id, next, reason);
  };

  return (
    <div className="space-y-8">
      {saveSuccess ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100"
          role="status"
        >
          {tEval("successSaved")}
        </div>
      ) : null}
      <div>
        <AppBreadcrumb items={[{ href: "/coach/classes", label: t("pageTitle") }, { label: statusLabel }]} />
        <h1 className={`${pageTitleClass} text-court`}>{statusLabel}</h1>
        <p className="mt-1 max-w-2xl text-sm text-court/60">
          {filtered.length === 0
            ? t("filteredEmpty")
            : filtered.length === 1
              ? t("filteredOne")
              : t("filteredMany", { count: filtered.length })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={STATUS_CARD[status].icon}
          iconClass={STATUS_CARD[status].iconClass}
          title={t("emptyStateTitle")}
          description={t("emptyStateHint", { status: statusLabel })}
        />
      ) : (
        <LessonsListByDate
          lessons={filtered}
          users={users}
          courts={courts}
          onUpdateStatus={onUpdateStatus}
          onBeginComplete={setCompleteLesson}
          onRemove={() => {}}
          canDelete={false}
        />
      )}
      <LessonCompleteEvaluationModal
        open={completeLesson != null}
        onOpenChange={(o) => {
          if (!o) setCompleteLesson(null);
        }}
        onSaveSuccess={() => setSaveSuccess(true)}
        lesson={completeLesson}
        student={completeLesson ? users.find((u) => u.id === completeLesson.studentId) : undefined}
        courtName={completeLesson ? courts.find((c) => c.id === completeLesson.courtId)?.name : undefined}
        evaluationCoachId={completeLesson?.coachId ?? ""}
        studentId={completeLesson?.studentId ?? ""}
        completeLessonWithEvaluation={completeLessonWithEvaluation}
      />
    </div>
  );
}
