"use client";

import { Button } from "@/components/ui/button";
import { EventDetailFields, ScheduleDetailWhen } from "@/components/student/schedule-detail-modal";
import type { EventItem } from "@/lib/types";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { useLocale, useTranslations } from "next-intl";
import { Trophy, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

export function StudentEventDetailModal({
  open,
  event,
  onClose,
}: {
  open: boolean;
  event: EventItem | null;
  onClose: () => void;
}) {
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const tProg = useTranslations("StudentSchedule");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !event || typeof document === "undefined") return null;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={tProg("detail.closeOverlay")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aluno-evento-detail-title"
        className="relative z-10 flex max-h-[min(90dvh,680px)] w-full max-w-xl flex-col rounded-t-2xl border border-zinc-200/90 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 sm:rounded-2xl sm:pb-0"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-700 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
              <Trophy className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold normal-case tracking-normal text-zinc-400 dark:text-zinc-500">
                {tProg("detail.kindEvent")}
              </p>
              <h2
                id="aluno-evento-detail-title"
                className="font-display text-lg font-bold leading-snug text-zinc-900 dark:text-zinc-50"
              >
                {event.title}
              </h2>
              <ScheduleDetailWhen date={event.date} time={event.time} intlLocale={intlLocale} />
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            aria-label={tProg("detail.closeOverlay")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <EventDetailFields event={event} />
        </div>

        <div className="shrink-0 border-t border-zinc-200/80 p-4 dark:border-zinc-700 sm:px-6">
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl sm:w-auto" onClick={onClose}>
            {tProg("detail.close")}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
