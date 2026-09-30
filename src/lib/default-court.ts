import type { Court } from "@/lib/types";

/** Courts are no longer managed in the UI; pick a stable id for DB-required court_id. */
export function resolveDefaultCourtId(courts: Court[]): string {
  return courts[0]?.id ?? "";
}
