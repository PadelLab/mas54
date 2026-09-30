"use client";

import { cn } from "@/lib/utils";

const RING_GREEN = "#00A651";
const RING_TRACK = "#111827";

export function OverallRing({
  value,
  size = 160,
  className,
  label = "Overall",
}: {
  value: number;
  size?: number;
  className?: string;
  /** Label above the value (e.g. “Overall”). */
  label?: string;
}) {
  const stroke = Math.max(3.5, size * 0.032);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.min(100, Math.max(0, value));
  const offset = c - (safe / 100) * c;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative aspect-square w-full max-w-full" style={{ maxWidth: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={RING_TRACK}
            strokeWidth={stroke}
            fill="none"
            className="dark:stroke-zinc-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={RING_GREEN}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500 sm:text-[11px]">
            {label}
          </span>
          <span className="mt-1 font-display text-4xl font-bold tabular-nums leading-none tracking-tight text-[#001A33] dark:text-zinc-50 sm:text-5xl">
            {safe}
          </span>
        </div>
      </div>
    </div>
  );
}
