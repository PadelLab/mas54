"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  description: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  children?: ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  description,
  title,
  confirmLabel,
  cancelLabel,
  tone = "default",
  children,
  confirmDisabled,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations("ConfirmDialog");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const heading = title ?? t("title");
  const confirmText = confirmLabel ?? t("confirm");
  const cancelText = cancelLabel ?? t("cancel");
  const danger = tone === "danger";

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-[3px]"
        aria-label={cancelText}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        aria-describedby="app-confirm-desc"
        className="relative z-10 w-full max-w-md animate-fade-slide rounded-2xl border border-zinc-200/90 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl shadow-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6 sm:pb-6"
      >
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              danger
                ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-200",
            )}
          >
            {danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="app-confirm-title" className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {heading}
            </h2>
            <p id="app-confirm-desc" className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          </div>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11 rounded-xl font-medium sm:min-w-[7.5rem]" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            type="button"
            className={cn(
              "h-11 rounded-xl font-semibold sm:min-w-[7.5rem]",
              danger &&
                "bg-red-600 from-red-600 to-red-700 shadow-red-600/25 hover:brightness-110 dark:from-red-600 dark:to-red-700",
            )}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
