import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Same colors as the metric cards. */
export const EMPTY_ICON = {
  accent: "bg-[#fff0e6] text-[#e85d04]",
  green: "bg-[#e6f7ee] text-[#16a34a]",
  red: "bg-[#fde8e8] text-[#e11d48]",
  purple: "bg-[#eee8fb] text-[#7c5cbf]",
  sky: "bg-[#e8f3fb] text-[#2b9adf]",
} as const;

const ICON_WRAP = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full";

function isMissingMessageKey(value: string | undefined) {
  return Boolean(value && /^[A-Za-z][\w]*(\.[A-Za-z][\w]*)+$/.test(value));
}

export function EmptyState({
  icon: Icon,
  iconClass = EMPTY_ICON.accent,
  title,
  description,
  className,
  children,
}: {
  icon: LucideIcon;
  iconClass?: string;
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  const titleText = isMissingMessageKey(title) ? undefined : title;
  const descriptionText = isMissingMessageKey(description) ? undefined : description;

  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <span className={cn(ICON_WRAP, iconClass)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </span>
      {titleText ? (
        <div className="max-w-sm space-y-1.5">
          <p className="font-display text-lg font-semibold leading-tight tracking-tight text-zinc-800 dark:text-zinc-100">
            {titleText}
          </p>
          {descriptionText ? (
            <p className="font-display text-sm font-normal leading-relaxed tracking-tight text-zinc-500 dark:text-zinc-400">
              {descriptionText}
            </p>
          ) : null}
        </div>
      ) : descriptionText ? (
        <p className="max-w-sm font-display text-sm font-normal leading-relaxed tracking-tight text-zinc-500 dark:text-zinc-400">
          {descriptionText}
        </p>
      ) : null}
      {children}
    </div>
  );
}
