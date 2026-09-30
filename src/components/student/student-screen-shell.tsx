import type { ReactNode } from "react";
import { cn, pageTitleClass } from "@/lib/utils";

function sameHeading(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
}

export function StudentScreenShell({
  eyebrow,
  title,
  description,
  headerExtra,
  children,
  className,
  /** Full width of the main column (e.g. Overall). Avoids the default `max-w-5xl`. */
  layout = "default",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  layout?: "default" | "full";
}) {
  const showEyebrow = Boolean(eyebrow && !sameHeading(eyebrow, title));

  return (
    <div
      className={cn(
        layout === "full"
          ? "mx-0 w-full min-w-0 max-w-none space-y-5 animate-fade-slide pb-2 sm:space-y-8"
          : "w-full min-w-0 max-w-none space-y-5 animate-fade-slide pb-2 sm:space-y-8",
        className,
      )}
    >
      <header className="space-y-1.5 sm:space-y-2">
        {showEyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500 sm:text-[11px] sm:tracking-[0.28em]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn(pageTitleClass, "text-zinc-900 dark:text-zinc-50")}>
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "mt-1 text-sm text-zinc-500 dark:text-zinc-400",
              layout === "full" ? "max-w-4xl" : "max-w-2xl",
            )}
          >
            {description}
          </p>
        ) : null}
        {headerExtra}
      </header>
      {children}
    </div>
  );
}
