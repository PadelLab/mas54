import { isValidPhoneNumber } from "libphonenumber-js/min";

/** Optional phone: empty is valid; otherwise it must be valid E.164 (country code + length). */
export function isValidOptionalProfilePhone(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
  return isValidPhoneNumber(v);
}
