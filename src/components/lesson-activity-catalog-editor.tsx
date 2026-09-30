"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ListPlus, Trash2 } from "lucide-react";

type Props = {
  /** Short text above the form (e.g. admin vs coach). Omitted for `variant="admin"` if you want it only on the page. */
  introKey?: "introCoach" | "introAdmin";
  /** `admin`: colors and cards aligned with the admin panel. `professor`: original style. */
  variant?: "coach" | "admin";
};

export function LessonActivityCatalogEditor({ introKey = "introCoach", variant = "coach" }: Props) {
  const admin = variant === "admin";
  const {
    lessonActivityCatalog,
    addLessonActivityCategory,
    renameLessonActivityCategory,
    removeLessonActivityCategory,
    addLessonActivity,
    updateLessonActivity,
    removeLessonActivity,
  } = useAuth();
  const t = useTranslations("LessonActivityCatalog");
  const tRef = useTranslations("CoachActivities");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newActivityByCat, setNewActivityByCat] = useState<Record<string, { name: string; hasSides: boolean }>>({});
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...lessonActivityCatalog.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [lessonActivityCatalog.categories],
  );

  const activitiesByCategory = useMemo(() => {
    const map = new Map<string, typeof lessonActivityCatalog.activities>();
    for (const c of lessonActivityCatalog.categories) {
      map.set(
        c.id,
        lessonActivityCatalog.activities
          .filter((a) => a.categoryId === c.id)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    }
    return map;
  }, [lessonActivityCatalog]);

  const getNewActivity = (categoryId: string) => newActivityByCat[categoryId] ?? { name: "", hasSides: false };

  const setNewActivity = (categoryId: string, patch: Partial<{ name: string; hasSides: boolean }>) => {
    setNewActivityByCat((prev) => ({
      ...prev,
      [categoryId]: { ...getNewActivity(categoryId), ...patch },
    }));
  };

  const shell = admin
    ? "rounded-2xl border border-court/12 bg-white/90 shadow-sm ring-1 ring-black/[0.02] dark:border-emerald-800/50 dark:bg-zinc-900/90 dark:ring-white/5"
    : "surface-card";

  return (
    <div className="space-y-8 animate-fade-slide">
      {!admin && <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t(introKey)}</p>}

      {!admin ? (
        <aside
          className={cn(
            "p-5 md:p-6",
            shell,
            "border-amber-100/80 bg-gradient-to-br from-amber-50/50 to-white dark:border-amber-900/40 dark:from-amber-950/40 dark:to-zinc-900",
          )}
        >
          <div className="flex items-start gap-3">
            <div>
              <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-50">{tRef("legendTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{tRef("legendBody")}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
                {tRef("legendBadge")}
              </p>
            </div>
          </div>
        </aside>
      ) : null}

      {catalogError ? (
        <p
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/50"
          role="alert"
        >
          {catalogError}
        </p>
      ) : null}

      <div className="space-y-6 md:space-y-8">
        {sortedCategories.map((cat) => (
          <section key={cat.id} className={cn(shell, "p-5 md:p-8")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <Label
                  className={cn(
                    "text-xs font-semibold normal-case tracking-normal",
                    admin ? "text-court/45 dark:text-emerald-200/50" : "text-zinc-400 dark:text-zinc-500",
                  )}
                >
                  {t("categoryLabel")}
                </Label>
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    className={cn(
                      "max-w-md rounded-2xl font-display text-lg font-bold",
                      admin
                        ? "border-court/20 text-court dark:border-emerald-700/50 dark:text-emerald-100"
                        : "border-zinc-200 text-zinc-900 dark:border-zinc-600 dark:text-zinc-100",
                    )}
                    value={cat.name}
                    onChange={(e) => renameLessonActivityCategory(cat.id, e.target.value)}
                    aria-label={t("categoryLabel")}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 shrink-0 rounded-xl border-red-200 px-3 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
                onClick={async () => {
                  setCatalogError(null);
                  const r = await removeLessonActivityCategory(cat.id);
                  if (!r.ok) setCatalogError(r.message ?? t("errorGeneric"));
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("removeCategory")}
              </Button>
            </div>

            <ul className={cn("mt-6 divide-y", admin ? "divide-court/10 dark:divide-emerald-900/30" : "divide-zinc-100 dark:divide-zinc-800")}>
              {(activitiesByCategory.get(cat.id) ?? []).map((act) => (
                <li key={act.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      className={cn(
                        "rounded-2xl text-sm font-medium",
                        admin
                          ? "border-court/20 text-court dark:border-emerald-700/50 dark:text-emerald-100"
                          : "border-zinc-200 text-zinc-800 dark:border-zinc-600 dark:text-zinc-200",
                      )}
                      value={act.name}
                      onChange={(e) => updateLessonActivity(act.id, { name: e.target.value })}
                    />
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 text-xs",
                        admin ? "text-court/65 dark:text-emerald-200/65" : "text-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      <input
                        type="checkbox"
                        className={cn("rounded", admin ? "border-court/30 text-court" : "border-zinc-300")}
                        checked={act.hasSides}
                        onChange={(e) => updateLessonActivity(act.id, { hasSides: e.target.checked })}
                      />
                      {t("hasSidesHint")}
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 text-xs font-medium",
                        admin ? "text-court/65 dark:text-emerald-200/65" : "text-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      <input
                        type="checkbox"
                        className={cn("rounded", admin ? "border-court/30" : "border-zinc-300")}
                        checked={act.active}
                        onChange={(e) => updateLessonActivity(act.id, { active: e.target.checked })}
                      />
                      {act.active ? t("active") : t("inactive")}
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                      onClick={() => void removeLessonActivity(act.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div
              className={cn(
                "mt-6 rounded-2xl p-4 ring-1",
                admin ? "bg-court/[0.04] ring-court/10 dark:bg-emerald-950/30 dark:ring-emerald-800/40" : "bg-zinc-50 ring-zinc-100 dark:bg-zinc-800/50 dark:ring-zinc-700",
              )}
            >
              <p
                className={cn(
                  "text-xs font-semibold normal-case tracking-normal",
                  admin ? "text-court/45 dark:text-emerald-200/50" : "text-zinc-400 dark:text-zinc-500",
                )}
              >
                {t("addActivityTitle")}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Input
                  className={cn(
                    "flex-1 rounded-2xl",
                    admin ? "border-court/20 dark:border-emerald-700/50" : "border-zinc-200 dark:border-zinc-600",
                  )}
                  placeholder={t("activityNamePlaceholder")}
                  value={getNewActivity(cat.id).name}
                  onChange={(e) => setNewActivity(cat.id, { name: e.target.value })}
                />
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 text-xs sm:px-2",
                    admin ? "text-court/65 dark:text-emerald-200/65" : "text-zinc-600 dark:text-zinc-400",
                  )}
                >
                  <input
                    type="checkbox"
                    className={cn("rounded", admin ? "border-court/30" : "border-zinc-300")}
                    checked={getNewActivity(cat.id).hasSides}
                    onChange={(e) => setNewActivity(cat.id, { hasSides: e.target.checked })}
                  />
                  D/R
                </label>
                <Button
                  type="button"
                  className="rounded-2xl"
                  onClick={() => {
                    const row = getNewActivity(cat.id);
                    if (!row.name.trim()) return;
                    addLessonActivity({
                      categoryId: cat.id,
                      name: row.name,
                      hasSides: row.hasSides,
                    });
                    setNewActivity(cat.id, { name: "", hasSides: false });
                  }}
                >
                  <ListPlus className="h-4 w-4" />
                  {t("addActivity")}
                </Button>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className={cn(shell, "p-5 md:p-8")}>
        <h2 className={cn("font-display text-lg font-bold", admin ? "text-court dark:text-emerald-100" : "text-zinc-900 dark:text-zinc-50")}>
          {t("addCategoryTitle")}
        </h2>
        <div className="mt-4 flex w-full items-center justify-between gap-3">
          <Input
            className={cn(
              "min-w-0 w-full max-w-md rounded-2xl",
              admin ? "border-court/20 dark:border-emerald-700/50" : "border-zinc-200 dark:border-zinc-600",
            )}
            placeholder={t("categoryNamePlaceholder")}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button
            type="button"
            className="ml-auto h-10 shrink-0 rounded-2xl"
            onClick={() => {
              if (!newCategoryName.trim()) return;
              addLessonActivityCategory(newCategoryName);
              setNewCategoryName("");
            }}
          >
            {t("addCategory")}
          </Button>
        </div>
      </div>
    </div>
  );
}
