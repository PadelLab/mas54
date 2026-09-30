/** Email validation shared by the API and forms. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidAppEmail(email: string): boolean {
  const e = email.trim();
  return e.length > 3 && e.length <= 254 && EMAIL_RE.test(e);
}

/** Stable codes in `message` on API responses. */
export const EMAIL_API_MESSAGE = {
  invalid: "EMAIL_INVALID",
  taken: "EMAIL_TAKEN",
} as const;

const EMAIL_TAKEN_ALIASES = new Set([
  EMAIL_API_MESSAGE.taken,
  "E-mail já cadastrado.",
  "E-mail já em uso.",
]);

const EMAIL_INVALID_ALIASES = new Set([EMAIL_API_MESSAGE.invalid, "E-mail inválido."]);

/** Keys in `Profile` (next-intl). */
export function translateEmailApiMessage(
  message: string | undefined,
  tProfile: (key: string) => string,
): string | null {
  if (!message) return null;
  if (EMAIL_INVALID_ALIASES.has(message)) return tProfile("emailInvalid");
  if (EMAIL_TAKEN_ALIASES.has(message)) return tProfile("emailInUse");
  return null;
}
