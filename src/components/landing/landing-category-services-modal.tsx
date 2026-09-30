"use client";

import { useEffect, useId, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, ChevronRight, CircleDot, Shield, X, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PADEL_ACTIVITY_SECTIONS } from "@/lib/padel-activities";
import { cn } from "@/lib/utils";

const SECTION_ICON: Record<string, LucideIcon> = {
  defensa: Shield,
  transicion: ArrowLeftRight,
  ataque: Zap,
  servicios: CircleDot,
};

export function LandingCategoryServicesModal() {
  const [openId, setOpenId] = useState<string | null>(null);
  const titleId = useId();

  const section = openId ? PADEL_ACTIVITY_SECTIONS.find((s) => s.id === openId) : undefined;
  const SectionHeaderIcon = section ? (SECTION_ICON[section.id] ?? Shield) : Shield;

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openId]);

  return (
    <>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2">
        {PADEL_ACTIVITY_SECTIONS.map((cat) => {
          const Icon = SECTION_ICON[cat.id] ?? Shield;
          const count = cat.activities.length;
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => setOpenId(cat.id)}
                className={cn(
                  "group w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-zinc-100 dark:focus-visible:ring-offset-zinc-950",
                )}
              >
                <Card
                  className={cn(
                    "relative flex h-full min-h-[5.5rem] cursor-pointer items-center gap-4 overflow-hidden border-zinc-200/80 bg-white/90 p-5 shadow-sm ring-1 ring-transparent transition duration-200",
                    "hover:border-accent/30 hover:shadow-lg hover:ring-accent/15 dark:border-zinc-800/90 dark:bg-zinc-900/70 dark:shadow-black/20",
                    "dark:hover:border-emerald-600/40 dark:hover:ring-emerald-500/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-court/15 to-court/5 text-court shadow-inner shadow-court/10",
                      "transition group-hover:from-court/25 group-hover:to-court/10 dark:from-emerald-500/20 dark:to-emerald-950/40 dark:text-emerald-200",
                      "dark:shadow-emerald-950/30 dark:group-hover:from-emerald-400/25 dark:group-hover:to-emerald-950/50",
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.65} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                        {cat.title}
                      </h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {count} {count === 1 ? "atividade" : "atividades"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      Toque para ver os focos que você pode escolher ao marcar uma aula
                    </p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-accent dark:text-zinc-500 dark:group-hover:text-accent-soft"
                    aria-hidden
                  />
                </Card>
              </button>
            </li>
          );
        })}
      </ul>

      {section ? (
        <div className="fixed inset-0 z-[100] flex min-h-full items-end justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-8">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/65 backdrop-blur-[6px] transition-colors motion-reduce:transition-none dark:bg-black/75"
            aria-label="Fechar"
            onClick={() => setOpenId(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "animate-fade-slide motion-reduce:animate-none relative z-10 flex max-h-[min(88dvh,680px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] dark:border-zinc-700/80 dark:bg-zinc-900 dark:ring-white/[0.06] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)]",
            )}
          >
            <div
              className="h-1 w-full shrink-0 bg-gradient-to-r from-accent via-accent-soft/90 to-court dark:from-accent dark:via-emerald-600/80 dark:to-court"
              aria-hidden
            />
            <div className="flex items-start gap-4 border-b border-zinc-100 bg-gradient-to-b from-zinc-50/80 to-white px-5 py-5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900 sm:gap-5 sm:px-6 sm:py-6">
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-court/12 to-court/5 text-court shadow-inner dark:from-emerald-500/25 dark:to-emerald-950/50 dark:text-emerald-200",
                )}
              >
                <SectionHeaderIcon className="h-6 w-6" strokeWidth={1.65} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
                    {section.title}
                  </h2>
                  <span className="rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {section.activities.length} {section.activities.length === 1 ? "foco" : "focos"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Focos que você pode escolher ao marcar uma aula nesta categoria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="shrink-0 rounded-full border border-zinc-200/90 bg-white/80 p-2.5 text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto bg-zinc-50/40 px-4 py-4 dark:bg-zinc-950/40 sm:px-5 sm:py-5">
              <ul className="grid gap-3 sm:grid-cols-2">
                {section.activities.map((act, index) => (
                  <li key={act.id}>
                    <div
                      className={cn(
                        "group/item flex min-h-[3.75rem] items-start gap-3 rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-3 shadow-sm transition",
                        "hover:border-accent/25 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-emerald-600/35",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 font-display text-xs font-bold text-zinc-600 ring-1 ring-zinc-200/80",
                          "dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/80",
                        )}
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{act.label}</p>
                        {act.hasSides ? (
                          <p className="mt-2">
                            <span className="inline-flex rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent dark:bg-accent/20 dark:text-accent-soft">
                              D / R
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
