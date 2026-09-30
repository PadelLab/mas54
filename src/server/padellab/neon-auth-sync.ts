import "server-only";

import { EMAIL_API_MESSAGE } from "@/lib/email-format";
import { normalizeDatabaseUrl } from "./neon-client";

type NeonResult = { error?: { message?: string } | null; data?: unknown };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Neon Auth account ID in the sign-in / sign-up / session response. */
function extractNeonAuthUserId(result: unknown): string | null {
  const root = asRecord(result);
  if (!root) return null;
  const data = asRecord(root.data) ?? root;
  const session = asRecord(data.session) ?? asRecord(root.session);
  const user =
    asRecord(data.user) ??
    asRecord(session?.user) ??
    asRecord(root.user);
  const id = user?.id ?? data.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function neonAuthUserIdAfterAuth(
  auth: { getSession: () => Promise<unknown> },
  result: unknown,
): Promise<string | null> {
  const fromResult = extractNeonAuthUserId(result);
  if (fromResult) return fromResult;
  try {
    return extractNeonAuthUserId(await auth.getSession());
  } catch {
    return null;
  }
}

export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

function neonAuthEnabled() {
  return Boolean(process.env.NEON_AUTH_BASE_URL?.trim() && process.env.NEON_AUTH_COOKIE_SECRET?.trim());
}

function errMessage(result: NeonResult | undefined, fallback: string) {
  const m = result?.error?.message?.trim();
  return m || fallback;
}

function isDuplicateAccount(message: string) {
  const m = message.toLowerCase();
  return m.includes("already") || m.includes("exists") || m.includes("já") || m.includes("duplicate");
}

function isEmailNotVerified(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("not verified") ||
    m.includes("email_not_verified") ||
    m.includes("verify your email") ||
    m.includes("email verification") ||
    (m.includes("verificar") && m.includes("e-mail"))
  );
}

type EmailOtpApi = {
  verifyEmail: (args: { email: string; otp: string }) => Promise<NeonResult>;
  sendVerificationOtp: (args: {
    email: string;
    type: "email-verification" | "sign-in" | "forget-password";
  }) => Promise<NeonResult>;
  requestPasswordReset?: (args: { email: string }) => Promise<NeonResult>;
  resetPassword?: (args: { email: string; otp: string; password: string }) => Promise<NeonResult>;
  checkVerificationOtp?: (args: {
    email: string;
    otp: string;
    type: "email-verification" | "sign-in" | "forget-password";
  }) => Promise<NeonResult>;
};

function emailOtpApi(auth: unknown): EmailOtpApi | null {
  return (auth as { emailOtp?: EmailOtpApi }).emailOtp ?? null;
}

async function neonAuthFetch(path: string, body: Record<string, unknown>): Promise<NeonResult & { ok: boolean }> {
  const base = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
  if (!base) return { ok: false, error: { message: "Neon Auth não está configurado." } };
  const origin = authCallbackOrigin();
  const res = await fetch(`${base}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({ ...body, callbackURL: origin }),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: { message?: string } | string };
  const message =
    (typeof data.error === "object" && data.error?.message) ||
    (typeof data.error === "string" ? data.error : null) ||
    data.message;
  if (!res.ok) {
    return { ok: false, error: { message: message || res.statusText } };
  }
  return { ok: true, error: null };
}

/** Validate the password in Neon Auth and return the account ID. Does not create an identity. */
export async function authenticateWithNeonAuth(input: {
  email: string;
  password: string;
  /** Allow continuing even if Neon still requires email verification. */
  allowUnverified?: boolean;
}): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const signedIn = (await auth.signIn.email({
      email: input.email,
      password: input.password,
    })) as NeonResult;
    if (signedIn.error) {
      const unverified = isEmailNotVerified(signedIn.error.message ?? "");
      if (unverified && input.allowUnverified) {
        const userId = await neonAuthUserIdAfterAuth(auth, signedIn);
        if (userId) return { ok: true, userId };
      }
      if (unverified) {
        return { ok: false, message: EMAIL_NOT_VERIFIED };
      }
      return { ok: false, message: errMessage(signedIn, "E-mail ou senha incorretos.") };
    }
    const userId = await neonAuthUserIdAfterAuth(auth, signedIn);
    if (!userId) {
      return { ok: false, message: "Não foi possível autenticar." };
    }
    return { ok: true, userId };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] authenticate failed", err);
    }
    return { ok: false, message: "Não foi possível autenticar." };
  }
}

/** Create the Neon Auth identity (signup / new user) and return the ID. */
export async function createNeonAuthUser(input: {
  email: string;
  password: string;
  name: string;
  /** Account created by an admin: do not send the verification email. */
  skipVerificationEmail?: boolean;
}): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  if (input.skipVerificationEmail) {
    const { suppressAuthMail } = await import("./skip-auth-mail");
    await suppressAuthMail(input.email, ["emailVerification"]);
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const signedUp = (await auth.signUp.email({
      email: input.email,
      password: input.password,
      name: input.name,
    })) as NeonResult;
    if (signedUp.error) {
      if (isDuplicateAccount(signedUp.error.message ?? "")) {
        return { ok: false, message: EMAIL_API_MESSAGE.taken };
      }
      if (!isEmailNotVerified(signedUp.error.message ?? "")) {
        return { ok: false, message: errMessage(signedUp, "Não foi possível criar a conta.") };
      }
    }
    const userId = await neonAuthUserIdAfterAuth(auth, signedUp);
    if (!userId) {
      return { ok: false, message: "Não foi possível criar a conta." };
    }
    return { ok: true, userId };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] sign-up failed", err);
    }
    return { ok: false, message: "Não foi possível criar a conta." };
  }
}

function authCallbackOrigin() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (process.env.NODE_ENV === "development" || !appUrl) {
    return "http://localhost:3000";
  }
  return appUrl;
}

function isEmailAlreadyVerified(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("already verified") ||
    m.includes("already been verified") ||
    m.includes("email is verified") ||
    (m.includes("já") && m.includes("verific")) ||
    (m.includes("ya") && m.includes("verific"))
  );
}

/** Confirm the OTP code sent to the email. */
export async function verifyNeonAuthEmailOtp(input: {
  email: string;
  otp: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const otp = emailOtpApi(auth);
    if (!otp) {
      return { ok: false, message: "Verificação de e-mail indisponível." };
    }
    const result = (await otp.verifyEmail({
      email: input.email,
      otp: input.otp,
    })) as NeonResult;
    if (result.error) {
      const message = errMessage(result, "INVALID_CODE");
      if (isEmailAlreadyVerified(message)) {
        return { ok: true };
      }
      return { ok: false, message };
    }
    return { ok: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] verify-email failed", err);
    }
    return { ok: false, message: "INVALID_CODE" };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Resend the verification code. */
export async function resendNeonAuthVerification(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const otp = emailOtpApi(auth);
    if (!otp) {
      return { ok: false, message: "Verificação de e-mail indisponível." };
    }
    const sent = (await withTimeout(
      otp.sendVerificationOtp({
        email,
        type: "email-verification",
      }),
      12_000,
    )) as NeonResult;
    if (sent.error) {
      return { ok: false, message: errMessage(sent, "Não foi possível reenviar o código.") };
    }
    return { ok: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] resend-verification failed", err);
    }
    return { ok: false, message: "Não foi possível reenviar o código." };
  }
}

export async function changeNeonAuthPassword(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const result = (await auth.changePassword({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: Boolean(input.revokeOtherSessions),
    })) as NeonResult;
    if (result.error) {
      return { ok: false, message: errMessage(result, "Senha atual incorreta.") };
    }
    return { ok: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] change-password failed", err);
    }
    return { ok: false, message: "Não foi possível alterar a senha." };
  }
}

export async function requestNeonAuthPasswordReset(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const otp = emailOtpApi(auth);
    if (otp) {
      const sent = (await otp.sendVerificationOtp({
        email,
        type: "forget-password",
      })) as NeonResult;
      if (!sent.error) return { ok: true };
      if (otp.requestPasswordReset) {
        const requested = (await otp.requestPasswordReset({ email })) as NeonResult;
        if (!requested.error) return { ok: true };
      }
    }
    const fetched = await neonAuthFetch("email-otp/send-verification-otp", {
      email,
      type: "forget-password",
    });
    if (fetched.ok) return { ok: true };

    const requested = await neonAuthFetch("email-otp/request-password-reset", { email });
    if (requested.ok) return { ok: true };

    const result = (await auth.requestPasswordReset({
      email,
      redirectTo: `${authCallbackOrigin()}/login/reset`,
    })) as NeonResult;
    if (result.error) {
      return { ok: false, message: errMessage(result, fetched.error?.message ?? "Não foi possível enviar o e-mail.") };
    }
    return { ok: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] request-password-reset failed", err);
    }
    return { ok: false, message: "Não foi possível enviar o e-mail." };
  }
}

/** Confirm the reset code without consuming it. */
export async function checkNeonAuthResetOtp(input: {
  email: string;
  otp: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const api = emailOtpApi(auth);
    if (api?.checkVerificationOtp) {
      const viaSdk = (await api.checkVerificationOtp({
        email: input.email,
        otp: input.otp,
        type: "forget-password",
      })) as NeonResult;
      if (!viaSdk.error) return { ok: true };
    }
    const fetched = await neonAuthFetch("email-otp/check-verification-otp", {
      email: input.email,
      otp: input.otp,
      type: "forget-password",
    });
    if (fetched.ok) return { ok: true };
    return { ok: false, message: fetched.error?.message ?? "INVALID_CODE" };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] check-reset-otp failed", err);
    }
    return { ok: false, message: "INVALID_CODE" };
  }
}

export async function resetNeonAuthPassword(input: {
  token?: string;
  email?: string;
  otp?: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!neonAuthEnabled()) {
    return { ok: false, message: "Neon Auth não está configurado." };
  }
  const { auth } = await import("@/lib/auth/server");
  try {
    const email = input.email?.trim().toLowerCase() ?? "";
    const otp = input.otp?.replace(/\s/g, "") ?? "";
    if (email && otp) {
      const api = emailOtpApi(auth);
      if (api?.resetPassword) {
        const viaSdk = (await api.resetPassword({
          email,
          otp,
          password: input.newPassword,
        })) as NeonResult;
        if (!viaSdk.error) return { ok: true };
      }
      const fetched = await neonAuthFetch("email-otp/reset-password", {
        email,
        otp,
        password: input.newPassword,
      });
      if (fetched.ok) return { ok: true };
      return { ok: false, message: fetched.error?.message ?? "INVALID_OR_EXPIRED" };
    }

    const token = input.token?.trim() ?? "";
    if (!token) {
      return { ok: false, message: "INVALID_OR_EXPIRED" };
    }
    const result = (await auth.resetPassword({
      token,
      newPassword: input.newPassword,
    })) as NeonResult;
    if (result.error) {
      return { ok: false, message: errMessage(result, "INVALID_OR_EXPIRED") };
    }
    return { ok: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] reset-password failed", err);
    }
    return { ok: false, message: "INVALID_OR_EXPIRED" };
  }
}

export async function signOutNeonAuth() {
  if (!neonAuthEnabled()) return;
  const { auth } = await import("@/lib/auth/server");
  try {
    await auth.signOut();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[neon-auth] sign-out failed", err);
    }
  }
}

function resolveNeonAuthDatabaseUrl(): string | null {
  const explicit = process.env.NEON_AUTH_DATABASE_URL?.trim();
  if (explicit) return normalizeDatabaseUrl(explicit);
  const club = process.env.DATABASE_URL?.trim();
  if (!club) return null;
  try {
    const u = new URL(normalizeDatabaseUrl(club));
    const current = decodeURIComponent(u.pathname.replace(/^\//, "")).split("/")[0] ?? "";
    if (current.toLowerCase() === "neondb") return u.toString();
    u.pathname = "/neondb";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Remove the Neon Auth identity (`neondb.neon_auth.user` + role). Club DELETE
 * only touches `public.users` on +54, so login identities otherwise stay behind.
 */
export async function deleteNeonAuthIdentity(input: {
  neonAuthUserId?: string | null;
  email?: string | null;
}): Promise<void> {
  const userId = input.neonAuthUserId?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!userId && !email) return;

  try {
    const { auth } = await import("@/lib/auth/server");
    const admin = (
      auth as {
        admin?: { removeUser?: (args: { userId: string }) => Promise<NeonResult> };
      }
    ).admin;
    if (userId && admin?.removeUser) {
      const result = await admin.removeUser({ userId });
      if (!result?.error) return;
    }
  } catch {
    /* SQL fallback below */
  }

  if (userId) {
    const viaApi = await neonAuthFetch("admin/remove-user", { userId });
    if (viaApi.ok) return;
  }

  const url = resolveNeonAuthDatabaseUrl();
  if (!url) return;

  try {
    const { neon } = await import("@neondatabase/serverless");
    const authSql = neon(url);
    if (userId) {
      await authSql`DELETE FROM neon_auth.invitation WHERE "inviterId" = ${userId}`;
      await authSql`DELETE FROM neon_auth.member WHERE "userId" = ${userId}`;
      await authSql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`;
      await authSql`DELETE FROM neon_auth.account WHERE "userId" = ${userId}`;
    }
    if (email) {
      await authSql`DELETE FROM neon_auth.invitation WHERE lower(email) = ${email}`;
      await authSql`DELETE FROM neon_auth.verification WHERE lower(identifier) = ${email}`;
    }
    if (userId) {
      await authSql`DELETE FROM neon_auth."user" WHERE id = ${userId}`;
    }
    if (email) {
      await authSql`DELETE FROM neon_auth."user" WHERE lower(email) = ${email}`;
    }
  } catch (err) {
    console.warn("[neon-auth] failed to delete identity", err);
  }
}
