const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Convert a `Date` (e.g. from the DB) to `YYYY-MM-DD` on the local calendar. */
export function dateToIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseCalendarDate(ymd: string): Date | null {
  const m = ISO_DATE.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

/** Normalize to `YYYY-MM-DD`, or `null` if invalid. */
export function normalizeBirthDateInput(ymd: string): string | null {
  const birth = parseCalendarDate(ymd);
  if (!birth) return null;
  const y = birth.getFullYear();
  const mo = String(birth.getMonth() + 1).padStart(2, "0");
  const d = String(birth.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/** Age in completed years on the reference date (default: today, local midnight). */
export function ageFromBirthDate(ymd: string, ref: Date = new Date()): number | null {
  const birth = parseCalendarDate(ymd);
  if (!birth) return null;
  const r = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (birth > r) return null;
  let age = r.getFullYear() - birth.getFullYear();
  const hadBirthday =
    r.getMonth() > birth.getMonth() ||
    (r.getMonth() === birth.getMonth() && r.getDate() >= birth.getDate());
  if (!hadBirthday) age--;
  return age >= 0 ? age : null;
}

export function validateBirthDateForRegistration(
  ymd: string
): { ok: true; iso: string } | { ok: false; message: string } {
  const iso = normalizeBirthDateInput(ymd);
  if (!iso) {
    return { ok: false, message: "Indique uma data de nascimento válida (AAAA-MM-DD)." };
  }
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  const birth = parseCalendarDate(iso)!;
  if (birth > todayMid) {
    return { ok: false, message: "A data de nascimento não pode ser no futuro." };
  }
  const age = ageFromBirthDate(iso, todayMid);
  if (age == null || age < 1 || age > 120) {
    return { ok: false, message: "A idade calculada deve estar entre 1 e 120 anos." };
  }
  return { ok: true, iso };
}
