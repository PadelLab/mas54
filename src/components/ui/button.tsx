import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-accent to-orange-600 text-white shadow-lg shadow-accent/25 hover:brightness-105 active:scale-[0.98]",
  secondary:
    "bg-court text-white hover:bg-court-light shadow-md active:scale-[0.98]",
  ghost:
    "bg-transparent text-court hover:bg-court/5 dark:text-emerald-100/90 dark:hover:bg-white/10",
  outline:
    "border-2 border-court/20 text-court hover:border-court/40 hover:bg-white/80 dark:border-zinc-500 dark:text-zinc-100 dark:hover:border-zinc-400 dark:hover:bg-zinc-800",
};

export function Button({
  className,
  variant = "primary",
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
