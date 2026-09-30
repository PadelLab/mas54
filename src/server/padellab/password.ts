import "server-only";
import bcrypt from "bcryptjs";
import { generateTempAlphanumericPassword } from "@/lib/temp-password";

const ROUNDS = 10;

/** Temporary password with a letter, number, and special character (first access only). */
export function generateTempPassword(length = 8): string {
  return generateTempAlphanumericPassword(length);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
