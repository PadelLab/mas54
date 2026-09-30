import type { Lesson, LessonActivityCatalog, LessonType } from "./types";

export type LessonActivityDisplay = {
  categoryName: string | null;
  activityName: string;
  hasSides: boolean;
  /** Legacy request with only `lessonType`. */
  legacyLessonType?: LessonType;
};

/** Single text for lists/timeline (no JSX). */
export function formatLessonActivityPlainText(
  lesson: Pick<Lesson, "lessonActivityId" | "lessonType">,
  catalog: LessonActivityCatalog | null,
  tLegacy: (key: string) => string
): string {
  const disp = resolveLessonActivityDisplay(lesson, catalog);
  if (!disp) return "—";
  if (disp.legacyLessonType) return tLegacy(disp.legacyLessonType);
  const core = [disp.categoryName, disp.activityName].filter(Boolean).join(" · ");
  return disp.hasSides ? `${core} (D/R)` : core;
}

/**
 * Category (badge) and focus line without category — for cards where the category is not in the title.
 * `drShort` = short D/R text (e.g. `LessonActivityDisplay.drShort` translation).
 */
export function lessonActivityCategoryAndFocusLine(
  lesson: Pick<Lesson, "lessonActivityId" | "lessonType">,
  catalog: LessonActivityCatalog | null,
  tLegacy: (key: string) => string,
  drShort: string
): { category: string | null; focusLine: string } {
  const disp = resolveLessonActivityDisplay(lesson, catalog);
  if (!disp) return { category: null, focusLine: "—" };
  if (disp.legacyLessonType) {
    return { category: null, focusLine: tLegacy(disp.legacyLessonType) };
  }
  const dr = disp.hasSides ? ` · ${drShort}` : "";
  return {
    category: disp.categoryName?.trim() ? disp.categoryName.trim() : null,
    focusLine: `${disp.activityName}${dr}`,
  };
}

export function resolveLessonActivityDisplay(
  lesson: Pick<Lesson, "lessonActivityId" | "lessonType">,
  catalog: LessonActivityCatalog | null
): LessonActivityDisplay | null {
  if (catalog && lesson.lessonActivityId) {
    const act = catalog.activities.find((a) => a.id === lesson.lessonActivityId);
    if (act) {
      const cat = catalog.categories.find((c) => c.id === act.categoryId);
      return {
        categoryName: cat?.name ?? null,
        activityName: act.name,
        hasSides: act.hasSides,
      };
    }
  }
  if (lesson.lessonType) {
    return {
      categoryName: null,
      activityName: "",
      hasSides: false,
      legacyLessonType: lesson.lessonType,
    };
  }
  return null;
}
