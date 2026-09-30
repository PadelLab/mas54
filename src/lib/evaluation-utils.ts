import type { CompetencyKey, Evaluation, SkillAxisKey } from "@/lib/types";
import { COMPETENCY_KEYS, SKILL_AXIS_KEYS } from "@/lib/types";

function clamp100(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Accepts numbers or numeric strings (e.g. from JSON/Postgres). */
function normalizeSkillRecord(raw: Record<string, unknown>): Record<SkillAxisKey, number> | null {
  const out: Partial<Record<SkillAxisKey, number>> = {};
  for (const k of SKILL_AXIS_KEYS) {
    const n = toFiniteNumber(raw[k]);
    if (n === null) return null;
    out[k] = clamp100(n);
  }
  return out as Record<SkillAxisKey, number>;
}

/** Convert the four legacy dimensions to the six map axes (same logic as the radar). */
function derivedSixFromFour(t: number, ta: number, f: number, m: number): Record<SkillAxisKey, number> {
  return {
    consistency: clamp100(m * 1.02),
    tactical_read: clamp100(ta),
    control: clamp100(t * 0.98),
    serve: clamp100(t * 1.03),
    endurance: clamp100(f),
    positioning: clamp100(ta * 0.97),
  };
}

function derivedSixFromSingle(category: CompetencyKey, score: number): Record<SkillAxisKey, number> {
  const base = score;
  const t = category === "tecnica" ? score : base * 0.94;
  const ta = category === "tatico" ? score : base * 0.94;
  const f = category === "fisico" ? score : base * 0.94;
  const m = category === "mental" ? score : base * 0.94;
  return derivedSixFromFour(t, ta, f, m);
}

/**
 * Normalized 6-skill representation (for aggregations and radar).
 * `null` if the record has no usable data.
 */
export function expandEvalToSkillScores(e: Evaluation): Record<SkillAxisKey, number> | null {
  if (e.skills && typeof e.skills === "object") {
    const norm = normalizeSkillRecord(e.skills as Record<string, unknown>);
    if (norm) return norm;
  }
  if (e.competencies && COMPETENCY_KEYS.every((k) => typeof e.competencies![k] === "number")) {
    const c = e.competencies;
    return derivedSixFromFour(c.tecnica, c.tatico, c.fisico, c.mental);
  }
  if (e.category) {
    return derivedSixFromSingle(e.category, e.score);
  }
  return null;
}

export function scoresForSkill(mine: Evaluation[], axis: SkillAxisKey): number[] {
  const out: number[] = [];
  for (const e of mine) {
    const six = expandEvalToSkillScores(e);
    if (six) out.push(six[axis]);
  }
  return out;
}

export function averageSkill(mine: Evaluation[], axis: SkillAxisKey): number | null {
  const scores = scoresForSkill(mine, axis);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Legacy: mean by old dimension (only evaluations that are not just `skills`). */
export function scoresForCompetency(mine: Evaluation[], cat: CompetencyKey): number[] {
  const out: number[] = [];
  for (const e of mine) {
    if (e.skills) continue;
    if (e.competencies && typeof e.competencies[cat] === "number") {
      out.push(e.competencies[cat]);
    } else if (e.category === cat) {
      out.push(e.score);
    }
  }
  return out;
}

export function averageCompetency(mine: Evaluation[], cat: CompetencyKey): number | null {
  const scores = scoresForCompetency(mine, cat);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
