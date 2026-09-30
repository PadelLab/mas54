"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { FORM_SUBMIT_BUTTON_CLASS, LIST_CONTROL_CLASS } from "@/components/list-search-field";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { LessonActivity } from "@/lib/types";

const TONES = [
  "bg-emerald-400",
  "bg-orange-400",
  "bg-sky-400",
  "bg-violet-400",
] as const;

const FIELD_LABEL = "mb-1.5 block text-xs font-semibold normal-case tracking-normal text-zinc-800 dark:text-zinc-300";

export function CategoryEditor({ categoryId, listPath }: { categoryId: string; listPath: string }) {
  const t = useTranslations("LessonActivityCatalog");
  const tDr = useTranslations("LessonActivityDisplay");
  const router = useRouter();
  const {
    lessonActivityCatalog,
    renameLessonActivityCategory,
    updateLessonActivityCategoryDescription,
    addLessonActivity,
    updateLessonActivity,
    removeLessonActivity,
  } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LessonActivity | null>(null);
  const [adding, setAdding] = useState(false);
  const [newActName, setNewActName] = useState("");
  const [newActHasSides, setNewActHasSides] = useState(false);
  const [pendingActivities, setPendingActivities] = useState<
    { id: string; name: string; hasSides: boolean; active: boolean }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const loadedId = useRef<string | null>(null);

  const cat = useMemo(
    () => lessonActivityCatalog.categories.find((c) => c.id === categoryId),
    [lessonActivityCatalog.categories, categoryId],
  );

  const activities = useMemo(() => {
    return lessonActivityCatalog.activities
      .filter((a) => a.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [lessonActivityCatalog.activities, categoryId]);

  useEffect(() => {
    if (!cat) return;
    if (loadedId.current === cat.id) return;
    loadedId.current = cat.id;
    setName(cat.name);
    setDescription(cat.description ?? "");
  }, [cat]);

  if (!cat) {
    return null;
  }

  const nameId = `lesson-cat-name-${categoryId}`;

  const commitPendingActivity = () => {
    const trimmed = newActName.trim();
    if (!trimmed) return false;
    setPendingActivities((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmed, hasSides: newActHasSides, active: true },
    ]);
    setNewActName("");
    setNewActHasSides(false);
    setAdding(false);
    return true;
  };

  const onSaveActivity = (e: FormEvent) => {
    e.preventDefault();
    commitPendingActivity();
  };

  const onSaveCategory = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    const extra =
      newActName.trim().length > 0
        ? [{ name: newActName.trim(), hasSides: newActHasSides, active: true as const }]
        : [];
    setBusy(true);
    try {
      renameLessonActivityCategory(cat.id, trimmed);
      updateLessonActivityCategoryDescription(cat.id, description);
      for (const act of [...pendingActivities, ...extra]) {
        await addLessonActivity({
          categoryId: cat.id,
          name: act.name,
          hasSides: act.hasSides,
          active: act.active,
        });
      }
      router.push(listPath);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 pb-10 sm:space-y-8">
      <AppBreadcrumb
        items={[
          { href: listPath, label: t("pageCategoriesTitle") },
          { label: name || cat.name || t("pageCategoryDetailTitle") },
        ]}
      />

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <Label htmlFor={nameId} className={FIELD_LABEL}>
          {t("categoryLabel")}
        </Label>
        <Input
          id={nameId}
          className={LIST_CONTROL_CLASS}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("categoryNamePlaceholder")}
          autoComplete="off"
        />
        <Label htmlFor={`${nameId}-desc`} className={cn(FIELD_LABEL, "mt-5")}>
          {t("categoryDescriptionLabel")}
        </Label>
        <Textarea
          id={`${nameId}-desc`}
          className={cn(LIST_CONTROL_CLASS, "h-auto min-h-[120px] py-2.5 leading-normal")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("categoryDescriptionPlaceholder")}
        />
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t("pageCategoryDetailSubtitle")}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("categoryEditorSectionActivities")}
          </h2>
          <Button type="button" className="h-10 shrink-0 rounded-lg px-4" onClick={() => setAdding(true)}>
            {t("addActivityNavButton")}
          </Button>
        </div>

        {adding ? (
          <form
            onSubmit={onSaveActivity}
            className="mb-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40"
          >
            <Label htmlFor="edit-act-name" className={FIELD_LABEL}>
              {t("addActivityTitle")}
            </Label>
            <Input
              id="edit-act-name"
              autoFocus
              className={LIST_CONTROL_CLASS}
              value={newActName}
              onChange={(e) => setNewActName(e.target.value)}
              placeholder={t("activityNamePlaceholder")}
              autoComplete="off"
            />
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
                className="h-10 rounded-lg"
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

        {activities.length === 0 && pendingActivities.length === 0 && !adding ? (
          <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {t("categoryEditorActivitiesEmpty")}
          </p>
        ) : activities.length === 0 && pendingActivities.length === 0 ? null : (
          <ul className="flex flex-col gap-3">
            {activities.map((act, index) => (
              <li
                key={act.id}
                className="relative flex min-w-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <span className={cn("w-[3px] shrink-0", TONES[index % TONES.length])} aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                  <div className="min-w-0 flex-1">
                    {editingId === act.id ? (
                      <Input
                        autoFocus
                        className={cn(LIST_CONTROL_CLASS, "font-semibold")}
                        value={act.name}
                        onChange={(e) => updateLessonActivity(act.id, { name: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setEditingId(null);
                          }
                        }}
                        aria-label={t("activityNamePlaceholder")}
                      />
                    ) : (
                      <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{act.name}</h3>
                    )}
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
                      onClick={() => updateLessonActivity(act.id, { active: !act.active })}
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
                    <ActivityMenu
                      open={menuId === act.id}
                      onOpenChange={(open) => setMenuId(open ? act.id : null)}
                      editLabel={t("menuEdit")}
                      deleteLabel={t("menuDelete")}
                      moreLabel={t("moreActions")}
                      onEdit={() => setEditingId(act.id)}
                      onDelete={() => setPendingDelete(act)}
                    />
                  </div>
                </div>
              </li>
            ))}
            {pendingActivities.map((act, index) => (
              <li
                key={act.id}
                className="relative flex min-w-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <span className={cn("w-[3px] shrink-0", TONES[(activities.length + index) % TONES.length])} aria-hidden />
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
                        setPendingActivities((prev) =>
                          prev.map((d) => (d.id === act.id ? { ...d, active: !d.active } : d)),
                        )
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
                      onClick={() => setPendingActivities((prev) => prev.filter((d) => d.id !== act.id))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-10 rounded-lg sm:w-auto" asChild>
          <Link href={listPath}>{t("cancel")}</Link>
        </Button>
        <Button
          type="button"
          className="h-10 rounded-lg sm:w-auto"
          disabled={busy || !name.trim()}
          onClick={() => void onSaveCategory()}
        >
          {t("saveCategory")}
        </Button>
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        tone="danger"
        title={t("deleteActivityTitle")}
        description={t("deleteActivityDescription", { name: pendingDelete?.name ?? "" })}
        confirmLabel={t("menuDelete")}
        cancelLabel={t("cancel")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const act = pendingDelete;
          setPendingDelete(null);
          if (act) void removeLessonActivity(act.id);
        }}
      />
    </div>
  );
}

function ActivityMenu({
  open,
  onOpenChange,
  editLabel,
  deleteLabel,
  moreLabel,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLabel: string;
  deleteLabel: string;
  moreLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const menuWidth = 180;

  const updatePos = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 6,
      left: Math.max(8, Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (btnRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, onOpenChange, updatePos]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const menu =
    open && portalTarget
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[9999] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: menuWidth,
              visibility: pos != null ? "visible" : "hidden",
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4 text-zinc-400" aria-hidden />
              {editLabel}
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
              onClick={() => {
                onOpenChange(false);
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {deleteLabel}
            </button>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={moreLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        onClick={() => onOpenChange(!open)}
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>
      {menu}
    </>
  );
}
