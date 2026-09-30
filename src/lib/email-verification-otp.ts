const KEY = "padellab.emailVerificationOtp";

export function storeEmailVerificationOtp(email: string, otp: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify({ email, otp, at: Date.now() }));
}

export function readEmailVerificationOtp(email: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { email?: string; otp?: string; at?: number };
    if (data.email !== email || !data.otp) return null;
    if (typeof data.at === "number" && Date.now() - data.at > 15 * 60 * 1000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return data.otp;
  } catch {
    return null;
  }
}

export function clearEmailVerificationOtp() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
