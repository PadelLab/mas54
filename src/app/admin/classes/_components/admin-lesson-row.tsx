"use client";

import { useAuth } from "@/contexts/auth-context";
import { lessonActivityCategoryAndFocusLine } from "@/lib/lesson-activity-display";
import { formatHm24 } from "@/lib/schedule-date";
import { cn } from "@/lib/utils";
import type { Court, Lesson, User } from "@/lib/types";
import { lessonCategoryBadgeClass, lessonKindBadgeClass } from "@/components/schedule/schedule-timeline";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label, Textarea } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { ChevronDown, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STATUS_META } from "./lessons-shared";

const RESPOND_MENU_WIDTH_PX = 176;

export function AdminLessonRow({
  lesson: l,
  student,
  coach,
  court: _court,
  onUpdateStatus,
  onBeginComplete,
  onRemove,
  canDelete = true,
}: {
  lesson: Lesson;
  student?: User;
  coach?: User;
  court?: Court;
  onUpdateStatus: (id: string, status: Lesson["status"], reason?: string) => void;
  onBeginComplete: (lesson: Lesson) => void;
  onRemove: (id: string) => void;
  canDelete?: boolean;
}) {
  const { lessonActivityCatalog } = useAuth();
  const t = useTranslations("AdminLessons");
  const tProg = useTranslations("StudentSchedule");
  const tTypes = useTranslations("LessonTypes");
  const tAct = useTranslations("LessonActivityDisplay");
  const meta = STATUS_META[l.status];
  const { category, focusLine } = lessonActivityCategoryAndFocusLine(
    l,
    lessonActivityCatalog,
    (k) => tTypes(k),
    tAct("drShort"),
  );
  const [respondOpen, setRespondOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const respondBtnRef = useRef<HTMLButtonElement>(null);
  const respondMenuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const updateMenuPos = useCallback(() => {
    const el = respondBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 6,
      left: Math.max(8, Math.min(r.right - RESPOND_MENU_WIDTH_PX, window.innerWidth - RESPOND_MENU_WIDTH_PX - 8)),
    });
  }, []);

  useEffect(() => {
    if (!respondOpen) return;
    updateMenuPos();
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (respondBtnRef.current?.contains(node) || respondMenuRef.current?.contains(node)) return;
      setRespondOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRespondOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updateMenuPos);
    window.addEventListener("scroll", updateMenuPos, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updateMenuPos);
      window.removeEventListener("scroll", updateMenuPos, true);
    };
  }, [respondOpen, updateMenuPos]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const respondMenu =
    respondOpen && portalTarget
      ? createPortal(
          <div
            ref={respondMenuRef}
            role="menu"
            className="fixed z-[9999] min-w-[11rem] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              top: menuPos?.top ?? 0,
              left: menuPos?.left ?? 0,
              width: RESPOND_MENU_WIDTH_PX,
              visibility: menuPos != null ? "visible" : "hidden",
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2.5 text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
              onClick={() => {
                onUpdateStatus(l.id, "confirmed");
                setRespondOpen(false);
              }}
            >
              {t("confirm")}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2.5 text-left text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
              onClick={() => {
                setRespondOpen(false);
                setDeclineReason("");
                setDeclineOpen(true);
              }}
            >
              {t("reject")}
            </button>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <li>
      <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 py-3 pl-4 pr-3 sm:flex-nowrap sm:gap-4 sm:py-3.5 sm:pl-5 sm:pr-4">
          <span className="absolute inset-y-0 left-0 w-[3px] bg-emerald-400" aria-hidden />
          <div className="w-[4.75rem] shrink-0 sm:w-[5.25rem]">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-300" aria-hidden />
              <span className="text-sm font-semibold tabular-nums text-emerald-500 dark:text-emerald-300">
                {formatHm24(l.time)}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h3 className="truncate text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-base">
              {focusLine}
            </h3>
            {student?.name ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                {tProg("studentPrefix", { name: student.name })}
              </p>
            ) : null}
            {coach?.name ? (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                {tProg("coachPrefix", { name: coach.name })}
              </p>
            ) : null}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto sm:flex-none sm:justify-end">
            <span className={lessonKindBadgeClass()}>{tProg("kindLesson")}</span>
            {category ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  lessonCategoryBadgeClass(category),
                )}
              >
                {category}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                meta.pill,
              )}
            >
              {t(`status.${l.status}`)}
            </span>
          </div>
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 sm:ml-0">
            {l.status === "pending" && (
              <>
                <button
                  ref={respondBtnRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={respondOpen}
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  onClick={() => setRespondOpen((open) => !open)}
                >
                  {t("respond")}
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                </button>
                {respondMenu}
              </>
            )}
            {l.status !== "declined" && l.status !== "pending" && l.status !== "completed" && (
              <Button className="h-9 px-3.5 text-xs" type="button" variant="outline" onClick={() => onBeginComplete(l)}>
                {t("complete")}
              </Button>
            )}
            {canDelete ? (
              <Button
                className="h-9 px-3.5 text-xs text-red-700 hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950/40"
                type="button"
                variant="outline"
                onClick={() => onRemove(l.id)}
              >
                {t("delete")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={declineOpen}
        tone="danger"
        title={t("declineTitle")}
        description={t("declineDescription")}
        confirmLabel={t("declineConfirm")}
        confirmDisabled={declineReason.trim().length < 8}
        onCancel={() => {
          setDeclineOpen(false);
          setDeclineReason("");
        }}
        onConfirm={() => {
          const reason = declineReason.trim();
          if (reason.length < 8) return;
          onUpdateStatus(l.id, "declined", reason);
          setDeclineOpen(false);
          setDeclineReason("");
        }}
      >
        <Label htmlFor={`decline-reason-${l.id}`}>{t("declineReasonLabel")}</Label>
        <Textarea
          id={`decline-reason-${l.id}`}
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder={t("declineReasonPlaceholder")}
          maxLength={500}
          rows={4}
        />
      </ConfirmDialog>
    </li>
  );
}
