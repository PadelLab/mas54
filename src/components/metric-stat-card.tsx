"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SHELL =
  "flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-zinc-800 dark:bg-zinc-900 sm:gap-4 sm:px-5 sm:py-5";

export function MetricStatCard({
  icon,
  iconClass,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full", iconClass)}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-1 text-[1.75rem] font-bold leading-none tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-[32px]">
          {value}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(SHELL, "outline-none transition hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-court focus-visible:ring-offset-2 dark:hover:border-zinc-600 dark:focus-visible:ring-emerald-500/50 dark:focus-visible:ring-offset-zinc-950")}
      >
        {inner}
      </Link>
    );
  }

  return <div className={SHELL}>{inner}</div>;
}
