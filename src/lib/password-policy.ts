/** Minimum length; also requires a letter, a digit, and a Unicode punctuation or symbol character. */
export const APP_PASSWORD_MIN_LENGTH = 6;

export type PasswordPolicyViolation = "too_short" | "needs_letter" | "needs_digit" | "needs_special";

/** Stable `message` values in API responses for client i18n mapping. */
export const PASSWORD_POLICY_MESSAGE: Record<PasswordPolicyViolation, string> = {
  too_short: "__PWD_TOO_SHORT__",
  needs_letter: "__PWD_NEEDS_LETTER__",
  needs_digit: "__PWD_NEEDS_DIGIT__",
  needs_special: "__PWD_NEEDS_SPECIAL__",
};

export function validateAppPassword(password: string): { ok: true } | { ok: false; code: PasswordPolicyViolation } {
  const pw = password;
  if (pw.length < APP_PASSWORD_MIN_LENGTH) return { ok: false, code: "too_short" };
  if (!/\p{L}/u.test(pw)) return { ok: false, code: "needs_letter" };
  if (!/\d/u.test(pw)) return { ok: false, code: "needs_digit" };
  if (!/[\p{P}\p{S}]/u.test(pw)) return { ok: false, code: "needs_special" };
  return { ok: true };
}

export function passwordPolicyApiMessage(code: PasswordPolicyViolation): string {
  return PASSWORD_POLICY_MESSAGE[code];
}

export function passwordPolicyViolationFromApiMessage(
  message: string | undefined,
): PasswordPolicyViolation | null {
  const hit = (Object.entries(PASSWORD_POLICY_MESSAGE) as [PasswordPolicyViolation, string][]).find(
    ([, v]) => v === message,
  );
  return hit ? hit[0] : null;
}

/** Keys in `Profile` (next-intl) for each violation. */
export const PASSWORD_POLICY_PROFILE_KEYS: Record<PasswordPolicyViolation, string> = {
  too_short: "passwordPolicyTooShort",
  needs_letter: "passwordPolicyNeedsLetter",
  needs_digit: "passwordPolicyNeedsDigit",
  needs_special: "passwordPolicyNeedsSpecial",
};

export function translatePasswordPolicyApiMessage(
  message: string | undefined,
  tProfile: (key: string) => string,
): string | null {
  const code = passwordPolicyViolationFromApiMessage(message);
  if (!code) return null;
  return tProfile(PASSWORD_POLICY_PROFILE_KEYS[code]);
}
