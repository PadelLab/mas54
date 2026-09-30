"use client";

import { useAuth } from "@/contexts/auth-context";
import { resolveLessonActivityDisplay } from "@/lib/lesson-activity-display";
import { useTranslations } from "next-intl";
import type { Lesson } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LessonActivityLine({
  lesson,
  className,
  multiline,
}: {
  lesson: Pick<Lesson, "lessonActivityId" | "lessonType">;
  className?: string;
  /** Show category on one line and activity on another. */
  multiline?: boolean;
}) {
  const { lessonActivityCatalog } = useAuth();
  const tTypes = useTranslations("LessonTypes");
  const t = useTranslations("LessonActivityDisplay");
  const disp = resolveLessonActivityDisplay(lesson, lessonActivityCatalog);

  if (!disp) {
    return (
      <span className={cn("text-zinc-400 dark:text-zinc-500", className)} title="">
        —
      </span>
    );
  }

  if (disp.legacyLessonType) {
    return <span className={className}>{tTypes(disp.legacyLessonType)}</span>;
  }

  const dr = disp.hasSides ? ` · ${t("drShort")}` : "";

  if (multiline) {
    return (
      <span className={cn("block", className)}>
        {disp.categoryName ? (
          <span className="text-xs font-semibold normal-case tracking-normal text-zinc-500 dark:text-zinc-400">
            {disp.categoryName}
          </span>
        ) : null}
        <span
          className={cn(
            "block text-sm font-medium text-zinc-900 dark:text-zinc-100",
            disp.categoryName && "mt-0.5",
          )}
        >
          {disp.activityName}
          {disp.hasSides ? (
            <span className="font-normal text-zinc-600 dark:text-zinc-300">{dr}</span>
          ) : null}
        </span>
      </span>
    );
  }

  const core = [disp.categoryName, disp.activityName].filter(Boolean).join(" · ");
  return (
    <span className={cn("text-zinc-900 dark:text-zinc-100", className)}>
      {core}
      {disp.hasSides ? <span className="text-zinc-600 dark:text-zinc-300">{dr}</span> : null}
    </span>
  );
}
