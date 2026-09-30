"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Public signup labels: readable, no forced caps. */
export const signupLabelClassName =
  "mb-0 block text-sm font-medium normal-case tracking-normal text-zinc-600 dark:text-zinc-400";

const signupFieldBase =
  "mt-2 w-full rounded-2xl border border-zinc-200/90 bg-white px-4 py-3.5 text-[15px] leading-snug text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700/90 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

/** Text and birth date on signup */
export const signupInputClassName = signupFieldBase;

/** `<select>` on signup */
export const signupSelectClassName = `${signupFieldBase} cursor-pointer`;

/**
 * Shared frame for public signup pages (student / coach):
 * light/dark neutral background aligned with login; glass card with a soft shadow.
 */
export function SignupPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="signup-page relative min-h-dvh overflow-x-hidden overflow-y-auto bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 sm:py-16 dark:bg-[#060606] dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-100/25 via-transparent to-zinc-50 dark:from-zinc-900/30 dark:via-transparent dark:to-[#060606]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto w-full max-w-md sm:max-w-lg">
        <div
          className={cn(
            "rounded-[2rem] border border-white/45 bg-white/[0.98] p-7 shadow-[0_24px_80px_-28px_rgba(13,59,44,0.38)] backdrop-blur-2xl",
            "ring-1 ring-zinc-900/[0.035] dark:border-zinc-700/55 dark:bg-zinc-950/[0.94] dark:shadow-[0_28px_90px_-24px_rgba(0,0,0,0.72)] dark:ring-white/[0.05]",
            "sm:p-9",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Group title inside the form (e.g. account). */
export function SignupSectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">{children}</h2>;
}

/** Soft-background panel to group fields. */
export function SignupFieldPanel({ className, children }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/55 bg-gradient-to-b from-zinc-50/90 to-white/40 p-5 sm:p-6 dark:border-zinc-800/60 dark:from-zinc-900/40 dark:to-zinc-950/20",
        className,
      )}
    >
      {children}
    </div>
  );
}
