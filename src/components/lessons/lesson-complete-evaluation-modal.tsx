"use client";

import { FORM_SUBMIT_BUTTON_CLASS } from "@/components/list-search-field";
import { Button } from "@/components/ui/button";
import { EvaluationSkillSliders } from "@/components/lessons/evaluation-skill-sliders";
import { Label, Textarea } from "@/components/ui/input";
import { LessonActivityLine } from "@/components/lesson-activity-line";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { formatDate, cn } from "@/lib/utils";
import type { Evaluation, Lesson, SkillAxisKey, User } from "@/lib/types";
import { SKILL_AXIS_KEYS } from "@/lib/types";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { X } from "lucide-react";

function defaultSkills(): Record<SkillAxisKey, number> {
  return {
    consistency: 75,
    tactical_read: 75,
    control: 75,
    serve: 75,
    endurance: 75,
    positioning: 75,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save (e.g. toast on the page), before closing the modal. */
  onSaveSuccess?: () => void;
  lesson: Lesson | null;
  student?: User;
  courtName?: string;
  /** Lesson coach (credited on the evaluation); matches the current user when they are the coach. */
  evaluationCoachId: string;
  studentId: string;
  completeLessonWithEvaluation: (
    lessonId: string,
    input: Omit<Evaluation, "id" | "createdAt">,
  ) => Promise<{ ok: boolean; message?: string }>;
};

export function LessonCompleteEvaluationModal({
  open,
  onOpenChange,
  onSaveSuccess,
  lesson,
  student,
  courtName: _courtName,
  evaluationCoachId,
  studentId,
  completeLessonWithEvaluation,
}: Props) {
  const t = useTranslations("LessonCompleteEval");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const [skills, setSkills] = useState(defaultSkills);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !lesson) return;
    setSkills(defaultSkills());
    setComment("");
    setError(null);
    setSubmitting(false);
  }, [open, lesson?.id]);

  const close = () => {
    if (submitting) return;
    onOpenChange(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;
    const lessonId = lesson.id;
    setError(null);
    const trimmed = comment.trim();
    if (!trimmed) {
      setError(t("commentRequired"));
      return;
    }
    const vals = SKILL_AXIS_KEYS.map((k) => skills[k]);
    const score = Math.round(vals.reduce((a, b) => a + b, 0) / 6);
    setSubmitting(true);
    try {
      const res = await completeLessonWithEvaluation(lessonId, {
        studentId,
        coachId: evaluationCoachId,
        score,
        comment: trimmed,
        skills: { ...skills },
      });
      if (!res.ok) {
        setError(res.message ?? t("errorGeneric"));
        return;
      }
      flushSync(() => {
        onSaveSuccess?.();
        onOpenChange(false);
      });
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !lesson || typeof document === "undefined") {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={t("closeOverlay")}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-eval-title"
        className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-court/15 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 sm:rounded-2xl sm:pb-0"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-court/10 px-5 py-4 dark:border-zinc-700 sm:px-6">
          <div className="min-w-0">
            <h2 id="lesson-eval-title" className="font-display text-lg font-bold text-court dark:text-zinc-50">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-court/65 dark:text-zinc-400">
              {t("intro", { student: student?.name ?? "—" })}
            </p>
            <p className="mt-2 text-xs text-court/50 dark:text-zinc-500">
              {formatDate(lesson.date, intlLocale)} · {lesson.time}
            </p>
            <div className="mt-1 text-xs text-court/45 dark:text-zinc-500">
              <LessonActivityLine lesson={lesson} />
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-court/50 transition hover:bg-court/5 hover:text-court dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={close}
            disabled={submitting}
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-themed min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <EvaluationSkillSliders skills={skills} onChange={setSkills} />
            <div>
              <Label htmlFor="lesson-eval-comment">{t("commentLabel")}</Label>
              <Textarea
                id="lesson-eval-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                placeholder={t("commentPlaceholder")}
                className="mt-1.5 dark:border-zinc-600 dark:bg-zinc-800/80"
                rows={3}
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-court/10 p-4 dark:border-zinc-700 sm:flex-row sm:justify-end sm:px-6">
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={submitting} onClick={close}>
              {t("cancel")}
            </Button>
            <Button type="submit" className={cn(FORM_SUBMIT_BUTTON_CLASS, "w-full sm:w-auto")} disabled={submitting}>
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
