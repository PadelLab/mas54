"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { FORM_SUBMIT_BUTTON_CLASS, LIST_CONTROL_CLASS } from "@/components/list-search-field";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { cn, pageTitleClass } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

const TONES = ["bg-emerald-400", "bg-orange-400", "bg-sky-400", "bg-violet-400"] as const;

const FIELD_LABEL = "mb-1.5 block text-xs font-semibold normal-case tracking-normal text-zinc-800 dark:text-zinc-300";
const SECTION_TITLE = "text-sm font-semibold text-zinc-800 dark:text-zinc-200";

type DraftActivity = { id: string; name: string; hasSides: boolean; active: boolean };

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function NewCategoryForm({ listPath }: { listPath: string }) {
  const t = useTranslations("LessonActivityCatalog");
  const tDr = useTranslations("LessonActivityDisplay");
  const { addLessonActivityCategory, addLessonActivity } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<DraftActivity[]>([]);
  const [adding, setAdding] = useState(false);
  const [newActName, setNewActName] = useState("");
  const [newActHasSides, setNewActHasSides] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitDraft = () => {
    const trimmed = newActName.trim();
    if (!trimmed) return;
    setDrafts((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed, hasSides: newActHasSides, active: true }]);
    setNewActName("");
    setNewActHasSides(false);
    setAdding(false);
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await addLessonActivityCategory(trimmed, description);
      if (!r.ok || !r.id) {
        setError(r.message ?? t("errorGeneric"));
        return;
      }
      for (const act of drafts) {
        await addLessonActivity({
          categoryId: r.id,
          name: act.name,
          hasSides: act.hasSides,
          active: act.active,
        });
      }
      router.replace(listPath);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-8 pb-10">
      <div>
        <AppBreadcrumb
          items={[
            { href: listPath, label: t("pageCategoriesTitle") },
            { label: t("pageNewCategoryTitle") },
          ]}
        />
        <h1 className={`${pageTitleClass} text-zinc-900 dark:text-zinc-50`}>{t("pageNewCategoryTitle")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{t("pageNewCategorySubtitle")}</p>
      </div>

      <Card>
        <CardContent className="space-y-5">
          <Field id="nova-cat-name" label={t("categoryLabel")}>
            <Input
              id="nova-cat-name"
              className={LIST_CONTROL_CLASS}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categoryNamePlaceholder")}
              autoComplete="off"
            />
          </Field>
          <Field id="nova-cat-description" label={t("categoryDescriptionLabel")}>
            <Textarea
              id="nova-cat-description"
              className={cn(LIST_CONTROL_CLASS, "h-auto min-h-[120px] py-2.5 leading-normal")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("categoryDescriptionPlaceholder")}
            />
          </Field>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className={SECTION_TITLE}>{t("categoryEditorSectionActivities")}</p>
            <Button type="button" className="h-10 min-h-10 shrink-0 rounded-lg px-4 py-0" onClick={() => setAdding(true)}>
              {t("addActivityNavButton")}
            </Button>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}

          {adding ? (
            <form
              className="space-y-3 rounded-xl bg-zinc-50/80 p-4 ring-1 ring-zinc-200/80 dark:bg-zinc-950/40 dark:ring-zinc-700"
              onSubmit={(e) => {
                e.preventDefault();
                commitDraft();
              }}
            >
              <Field id="draft-act-name" label={t("addActivityTitle")}>
                <Input
                  id="draft-act-name"
                  autoFocus
                  className={LIST_CONTROL_CLASS}
                  value={newActName}
                  onChange={(e) => setNewActName(e.target.value)}
                  placeholder={t("activityNamePlaceholder")}
                  autoComplete="off"
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  className="rounded border-zinc-300"
                  checked={newActHasSides}
                  onChange={(e) => setNewActHasSides(e.target.checked)}
                />
                {t("hasSidesHint")}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className={FORM_SUBMIT_BUTTON_CLASS} disabled={!newActName.trim()}>
                  {t("addActivity")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-h-10 rounded-lg px-4 py-0"
                  onClick={() => {
                    setAdding(false);
                    setNewActName("");
                    setNewActHasSides(false);
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          ) : null}

          {drafts.length === 0 && !adding ? (
            <p className="rounded-xl py-10 text-center text-sm text-zinc-500 ring-1 ring-dashed ring-zinc-200 dark:text-zinc-400 dark:ring-zinc-700">
              {t("createCategoryActivitiesHint")}
            </p>
          ) : drafts.length === 0 ? null : (
            <ul className="flex flex-col gap-3">
              {drafts.map((act, index) => (
                <li
                  key={act.id}
                  className="relative flex min-w-0 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200/80 dark:bg-zinc-950/40 dark:ring-zinc-800"
                >
                  <span className={cn("w-[3px] shrink-0", TONES[index % TONES.length])} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{act.name}</h3>
                      {act.hasSides ? (
                        <span className="mt-1.5 inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {tDr("drShort")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{t("active")}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={act.active}
                        aria-label={t("active")}
                        onClick={() =>
                          setDrafts((prev) => prev.map((d) => (d.id === act.id ? { ...d, active: !d.active } : d)))
                        }
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                          act.active ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left]",
                            act.active ? "left-[1.375rem]" : "left-0.5",
                          )}
                        />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                        aria-label={t("menuDelete")}
                        onClick={() => setDrafts((prev) => prev.filter((d) => d.id !== act.id))}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2 pt-5">
          <Button
            type="button"
            variant="outline"
            className="h-10 min-h-10 rounded-lg px-4 py-0"
            onClick={() => router.push(listPath)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            className="h-10 min-h-10 rounded-lg px-4 py-0"
            disabled={busy || !name.trim()}
            onClick={() => void onSave()}
          >
            {t("saveCategory")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
