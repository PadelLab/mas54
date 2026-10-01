export const TEMP_PASSWORD_LENGTH = 8;

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
/** Omit `+`: many mail clients copy it as a space, so the emailed password never matches. */
const SPECIALS = "!@#$%*?-";
const ALL = LETTERS + DIGITS + SPECIALS;
const ALLOWED = /^[A-Za-z0-9!@#$%*?+\-]+$/;
const HAS_SPECIAL = /[!@#$%*?+\-]/;

function randomIndex(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function isTempAlphanumericPassword(value: string): boolean {
  return (
    value.length === TEMP_PASSWORD_LENGTH &&
    ALLOWED.test(value) &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    HAS_SPECIAL.test(value)
  );
}

/** Temporary password: letter, number, and special character (Web Crypto). */
export function generateTempAlphanumericPassword(length = TEMP_PASSWORD_LENGTH): string {
  const chars: string[] = [
    LETTERS[randomIndex(LETTERS.length)]!,
    DIGITS[randomIndex(DIGITS.length)]!,
    SPECIALS[randomIndex(SPECIALS.length)]!,
  ];
  for (let i = chars.length; i < length; i++) {
    chars.push(ALL[randomIndex(ALL.length)]!);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
  return chars.join("");
}
