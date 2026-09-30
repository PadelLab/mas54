import type { Evaluation, SkillAxisKey } from "./types";
import { SKILL_AXIS_KEYS } from "./types";
import { averageSkill } from "@/lib/evaluation-utils";

export type RadarSkillRow = { axis: SkillAxisKey; value: number };

function clamp(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Six technical-map axes: mean per skill across evaluations
 * (includes a soft conversion of legacy records).
 */
export function buildTechnicalRadar(overall: number, mine: Evaluation[]): RadarSkillRow[] {
  const base = overall > 0 ? overall : 58;
  return SKILL_AXIS_KEYS.map((axis) => ({
    axis,
    value: clamp(averageSkill(mine, axis) ?? base),
  }));
}
