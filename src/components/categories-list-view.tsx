"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { MoreVertical, Pencil, Search, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, EMPTY_ICON } from "@/components/empty-state";
import { LIST_SEARCH_INPUT_CLASS, LIST_SEARCH_LABEL_CLASS, ListToolbar } from "@/components/list-search-field";
import { useAuth } from "@/contexts/auth-context";
import { foldEventSearch } from "@/lib/events-shared";
import type { LessonActivityCategory } from "@/lib/types";
import { cn, pageTitleClass, tSafe } from "@/lib/utils";

const TONES = [
  {
    bar: "bg-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
    box: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  {
    bar: "bg-orange-400",
    text: "text-orange-700 dark:text-orange-300",
    box: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200",
  },
  {
    bar: "bg-sky-400",
    text: "text-sky-700 dark:text-sky-300",
    box: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200",
  },
  {
    bar: "bg-violet-400",
    text: "text-violet-700 dark:text-violet-300",
    box: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200",
  },
] as const;

function toneFor(cat: LessonActivityCategory, index: number) {
  if (cat.id === "defensa") return TONES[0];
  if (cat.id === "transicion") return TONES[1];
  if (cat.id === "ataque") return TONES[2];
  if (cat.id === "servicios") return TONES[3];
  return TONES[index % TONES.length]!;
}

export function CategoriesListView({ basePath }: { basePath: string }) {
  const t = useTranslations("LessonActivityCatalog");
  const router = useRouter();
  const { lessonActivityCatalog, removeLessonActivityCategory } = useAuth();
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LessonActivityCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...lessonActivityCatalog.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [lessonActivityCatalog.categories],
  );
  const filtered = useMemo(() => {
    const q = foldEventSearch(query);
    if (!q) return sorted;
    return sorted.filter((c) => foldEventSearch(`${c.name} ${c.description ?? ""}`).includes(q));
  }, [sorted, query]);

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="min-w-0">
        <h1 className={cn(pageTitleClass, "text-zinc-900 dark:text-zinc-50")}>
          {t("pageCategoriesTitle")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{t("pageCategoriesSubtitle")}</p>
      </div>

      <ListToolbar
        className="flex-row items-center"
        leading={
          <label className={cn(LIST_SEARCH_LABEL_CLASS, "w-auto flex-1 sm:w-full sm:flex-none")}>
            <span className="sr-only">{t("searchPlaceholder")}</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
              className={LIST_SEARCH_INPUT_CLASS}
            />
          </label>
        }
        trailing={
          <Button asChild className="h-10 min-h-10 shrink-0 rounded-lg px-4 shadow-md">
            <Link href={`${basePath}/new`}>{t("addCategoryTitle")}</Link>
          </Button>
        }
      />

      {deleteError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100" role="alert">
          {deleteError}
        </p>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Layers}
          iconClass={EMPTY_ICON.purple}
          title={t("categoriesEmpty")}
          description={tSafe(t, "categoriesEmptyHint", "categoriesEmptyCta")}
        >
          <Link href={`${basePath}/new`} className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
            {t("categoriesEmptyCta")}
          </Link>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t("emptySearch")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((cat, index) => {
            const n = lessonActivityCatalog.activities.filter((a) => a.categoryId === cat.id).length;
            const tone = toneFor(cat, index);
            const description = (cat.description ?? "").trim();
            return (
              <li key={cat.id}>
                <article className="relative flex min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <span className={cn("w-[3px] shrink-0", tone.bar)} aria-hidden />
                  <div className="relative flex min-w-0 flex-1 items-center gap-3 py-5 pl-4 pr-12 sm:gap-4 sm:px-5 sm:py-6 sm:pr-5">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-base font-bold text-zinc-900 dark:text-zinc-50 sm:text-lg">
                        {cat.name}
                      </h2>
                      {description ? (
                        <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
                      ) : null}
                      <p className={cn("mt-1.5 text-sm font-medium", tone.text)}>
                        {n === 1 ? t("activityCountOne") : t("activityCountMany", { count: n })}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl sm:h-[4.25rem] sm:w-[4.25rem]",
                        tone.box,
                      )}
                    >
                      <span className="font-display text-2xl font-bold tabular-nums leading-none">{n}</span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                        {t("activitiesBoxLabel")}
                      </span>
                    </div>
                    <CategoryMenu
                      className="absolute right-2.5 top-3.5 z-10 sm:static sm:right-auto sm:top-auto"
                      open={menuId === cat.id}
                      onOpenChange={(open) => setMenuId(open ? cat.id : null)}
                      editLabel={t("menuEdit")}
                      deleteLabel={t("menuDelete")}
                      moreLabel={t("moreActions")}
                      onEdit={() => router.push(`${basePath}/${cat.id}`)}
                      onDelete={() => {
                        setDeleteError(null);
                        setPendingDelete(cat);
                      }}
                    />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        tone="danger"
        title={t("deleteCategoryTitle")}
        description={t("deleteCategoryDescription", { name: pendingDelete?.name ?? "" })}
        confirmLabel={t("menuDelete")}
        cancelLabel={t("cancel")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const cat = pendingDelete;
          setPendingDelete(null);
          if (!cat) return;
          void (async () => {
            const r = await removeLessonActivityCategory(cat.id);
            if (!r.ok) setDeleteError(r.message ?? t("errorGeneric"));
          })();
        }}
      />
    </div>
  );
}

function CategoryMenu({
  open,
  onOpenChange,
  editLabel,
  deleteLabel,
  moreLabel,
  onEdit,
  onDelete,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLabel: string;
  deleteLabel: string;
  moreLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
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
    <div className={className}>
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
    </div>
  );
}
