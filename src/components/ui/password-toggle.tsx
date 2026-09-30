"use client";

import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const toggleClass = cn(
  "password-toggle absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center",
  "appearance-none border-0 p-0 shadow-none ring-0",
  "rounded-none bg-transparent text-zinc-400",
  "hover:bg-transparent hover:text-zinc-600",
  "focus:bg-transparent focus:outline-none focus-visible:outline-none",
  "active:bg-transparent",
  "dark:text-zinc-500 dark:hover:bg-transparent dark:hover:text-zinc-300",
);

export function PasswordToggle({
  visible,
  onToggle,
  hideLabel,
  showLabel,
}: {
  visible: boolean;
  onToggle: () => void;
  hideLabel: string;
  showLabel: string;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      className={toggleClass}
      style={{ background: "transparent", boxShadow: "none" }}
      aria-label={visible ? hideLabel : showLabel}
    >
      {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
    </button>
  );
}
