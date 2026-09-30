"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Lesson } from "@/lib/types";
import { LessonCompleteEvaluationModal } from "@/components/lessons/lesson-complete-evaluation-modal";
import { EmptyState, EMPTY_ICON } from "@/components/empty-state";
import { LessonsListByDate } from "./_components/lessons-list-by-date";
import { LessonStatusStatCards } from "./_components/lesson-status-stat-cards";
import { sortLessonsByDateTime } from "./_components/lessons-shared";
import { pageTitleClass } from "@/lib/utils";

export default function AdminLessonsPage() {
  const t = useTranslations("AdminLessons");
  const tEval = useTranslations("LessonCompleteEval");
  const pageIntro = t("pageIntro").trim();
  const { lessons, courts, users, removeLesson, respondLesson, completeLessonWithEvaluation } = useAuth();
  const [completeLesson, setCompleteLesson] = useState<Lesson | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 4500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const sortedLessons = useMemo(() => sortLessonsByDateTime(lessons), [lessons]);

  const counts = useMemo(() => {
    return {
      pending: lessons.filter((l) => l.status === "pending").length,
      confirmed: lessons.filter((l) => l.status === "confirmed").length,
      declined: lessons.filter((l) => l.status === "declined").length,
      completed: lessons.filter((l) => l.status === "completed").length,
    };
  }, [lessons]);

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
        <h1 className={`${pageTitleClass} text-court`}>{t("pageTitle")}</h1>
        {pageIntro ? <p className="mt-1 max-w-2xl text-sm text-court/60">{pageIntro}</p> : null}
      </div>

      <LessonStatusStatCards counts={counts} hrefFor={(key) => `/admin/classes/status/${key}`} />

      {sortedLessons.length === 0 ? (
        <EmptyState icon={ClipboardList} iconClass={EMPTY_ICON.sky} title={t("emptyTitle")} description={t("emptyHint")} />
      ) : (
        <LessonsListByDate
          lessons={sortedLessons}
          users={users}
          courts={courts}
          onUpdateStatus={(id, next, reason) => {
            if (next === "confirmed" || next === "declined") void respondLesson(id, next, reason);
          }}
          onBeginComplete={setCompleteLesson}
          onRemove={removeLesson}
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
