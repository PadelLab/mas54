"use client";

import { Label } from "@/components/ui/input";
import type { SkillAxisKey } from "@/lib/types";
import { SKILL_AXIS_KEYS } from "@/lib/types";
import { useTranslations } from "next-intl";

export function EvaluationSkillSliders({
  skills,
  onChange,
}: {
  skills: Record<SkillAxisKey, number>;
  onChange: (next: Record<SkillAxisKey, number>) => void;
}) {
  const tAxis = useTranslations("StudentOverall.axes");

  return (
    <div className="space-y-4 rounded-2xl border border-court/10 bg-court/[0.02] p-4 dark:border-zinc-600 dark:bg-zinc-800/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-court/50 dark:text-zinc-400">0–100</p>
      {SKILL_AXIS_KEYS.map((key) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <Label htmlFor={`eval-skill-${key}`} className="normal-case text-court dark:text-zinc-100">
              {tAxis(key)}
            </Label>
            <span className="font-display text-sm font-bold tabular-nums text-court dark:text-zinc-100">{skills[key]}</span>
          </div>
          <input
            id={`eval-skill-${key}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={skills[key]}
            onChange={(e) => onChange({ ...skills, [key]: Number(e.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-court/10 accent-accent dark:bg-zinc-600"
          />
        </div>
      ))}
    </div>
  );
}
