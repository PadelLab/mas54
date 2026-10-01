"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/contexts/auth-context";
import {
  hasCalendarSubscribeBeenPrompted,
  markCalendarSubscribeForNextPage,
} from "@/lib/calendar-subscribe-client";
import { homePathForUserRole } from "@/lib/role-utils";
import type { UserRole } from "@/lib/types";
import { isValidAppEmail, translateEmailApiMessage } from "@/lib/email-format";
import {
  passwordPolicyApiMessage,
  translatePasswordPolicyApiMessage,
  validateAppPassword,
} from "@/lib/password-policy";
import { safeNextPath } from "@/lib/safe-next-path";
import { Button } from "@/components/ui/button";
import { AUTH_CONTROL_CLASS, AUTH_FIELD_LABEL_CLASS, Input, Label } from "@/components/ui/input";
import { PasswordToggle } from "@/components/ui/password-toggle";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, completeTempPassword, verifyTwoFactor, user, hydrated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const t = useTranslations("Login");
  const tProfile = useTranslations("Profile");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [needsTempPassword, setNeedsTempPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const qEmail = (searchParams.get("email") ?? "").trim();
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated || !user) return;
    router.replace(next ?? homePathForUserRole(user.role));
  }, [hydrated, user, next, router]);

  const finishSignedIn = (role?: UserRole) => {
    if (
      !next &&
      (role === "student" || role === "coach" || role === "coach_admin") &&
      !hasCalendarSubscribeBeenPrompted()
    ) {
      markCalendarSubscribeForNextPage();
    }
    if (next) router.replace(next);
    else if (role) router.replace(homePathForUserRole(role));
    else router.replace("/student/home");
  };

  if (!hydrated) {
    return (
      <div className="signup-page flex min-h-dvh items-center justify-center bg-zinc-50 dark:bg-[#060606]">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">…</p>
      </div>
    );
  }

  if (user) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (needsTempPassword) {
      const policy = validateAppPassword(newPassword);
      if (!policy.ok) {
        setError(
          translatePasswordPolicyApiMessage(passwordPolicyApiMessage(policy.code), tProfile) ??
            tProfile("passwordError"),
        );
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("resetPasswordMismatch"));
        return;
      }
      setBusy(true);
      const changed = await completeTempPassword(password, newPassword);
      setBusy(false);
      if (!changed.ok) {
        const policyErr = translatePasswordPolicyApiMessage(changed.message, tProfile);
        setError(
          changed.message === "EXPIRED"
            ? t("twoFactorExpired")
            : changed.message === "SAME_AS_TEMP"
              ? tProfile("passwordError")
              : (policyErr ?? changed.message ?? t("errorGeneric")),
        );
        return;
      }
      if (changed.needsTwoFactor) {
        setNeedsTempPassword(false);
        setNeedsTwoFactor(true);
        return;
      }
      finishSignedIn(changed.role);
      return;
    }
    if (needsTwoFactor) {
      setBusy(true);
      const verified = await verifyTwoFactor(twoFactorCode);
      setBusy(false);
      if (!verified.ok) {
        setError(
          verified.message === "EXPIRED"
            ? t("twoFactorExpired")
            : t("twoFactorInvalid"),
        );
        if (verified.message === "EXPIRED") setNeedsTwoFactor(false);
        return;
      }
      finishSignedIn(verified.role);
      return;
    }
    if (!isValidAppEmail(email)) {
      setError(tProfile("emailInvalid"));
      return;
    }
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) {
      if (res.message === "EMAIL_NOT_VERIFIED") {
        router.replace(`/register/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      const emailErr = translateEmailApiMessage(res.message, tProfile);
      setError(
        res.message === "__SESSION_NOT_LOADED__"
          ? t("sessionNotLoaded")
          : res.message === "INVALID_CREDENTIALS" ||
              /invalid email or password/i.test(res.message ?? "")
            ? t("errorGeneric")
            : (emailErr ?? res.message ?? t("errorGeneric")),
      );
      return;
    }
    if (res.mustChangePassword) {
      setNeedsTempPassword(true);
      return;
    }
    if (res.needsTwoFactor) {
      setNeedsTwoFactor(true);
      return;
    }
    finishSignedIn(res.role);
  };

  return (
    <div className="signup-page relative flex min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-zinc-50 p-4 pt-[max(1rem,env(safe-area-inset-top))] text-zinc-900 dark:bg-[#060606] dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-100/25 via-transparent to-zinc-50 dark:from-zinc-900/30 dark:via-transparent dark:to-[#060606]"
        aria-hidden
      />
      <Card className="relative z-10 w-full max-w-md bg-white/95 p-5 shadow-lg backdrop-blur-sm dark:bg-zinc-900/75 dark:shadow-2xl dark:shadow-black/50 dark:backdrop-blur-xl sm:p-7">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/" priority imgClassName="h-11 sm:h-12" />
        </div>

        <CardTitle className="mb-1 text-center text-court dark:text-white">
          {needsTempPassword ? t("resetPasswordLabel") : needsTwoFactor ? t("twoFactorTitle") : t("title")}
        </CardTitle>
        {needsTwoFactor ? (
          <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">{t("twoFactorIntro")}</p>
        ) : needsTempPassword ? (
          <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">{tProfile("passwordRequirementsHint")}</p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {needsTwoFactor ? (
            <div>
              <Label htmlFor="two-factor-code" className={AUTH_FIELD_LABEL_CLASS}>
                {t("twoFactorCode")}
              </Label>
              <Input
                id="two-factor-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => {
                  setTwoFactorCode(e.target.value);
                  setError(null);
                }}
                required
                placeholder="000000"
                className={cn(AUTH_CONTROL_CLASS, "mt-0")}
              />
            </div>
          ) : needsTempPassword ? (
            <>
              <div>
                <Label htmlFor="new-password" className={AUTH_FIELD_LABEL_CLASS}>
                  {t("resetPasswordLabel")}
                </Label>
                <div className="relative min-w-0">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className={cn(AUTH_CONTROL_CLASS, "mt-0 pr-12")}
                  />
                  <PasswordToggle
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword((v) => !v)}
                    hideLabel={t("hidePassword")}
                    showLabel={t("showPassword")}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password" className={AUTH_FIELD_LABEL_CLASS}>
                  {t("resetPasswordConfirm")}
                </Label>
                <Input
                  id="confirm-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={cn(AUTH_CONTROL_CLASS, "mt-0")}
                />
              </div>
            </>
          ) : (
          <>
          <div>
            <Label htmlFor="email" className={AUTH_FIELD_LABEL_CLASS}>
              {t("email")}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              required
              aria-invalid={Boolean(error && error === tProfile("emailInvalid"))}
              placeholder={t("emailPlaceholder")}
              className={cn(
                AUTH_CONTROL_CLASS,
                "mt-0",
                error === tProfile("emailInvalid") &&
                  "border-red-400 focus:border-red-500 focus:ring-red-500/30",
              )}
            />
            {error === tProfile("emailInvalid") ? (
              <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="password" className={AUTH_FIELD_LABEL_CLASS}>
              {t("password")}
            </Label>
            <div className="relative min-w-0">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={cn(AUTH_CONTROL_CLASS, "mt-0 pr-12")}
              />
              <PasswordToggle
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                hideLabel={t("hidePassword")}
                showLabel={t("showPassword")}
              />
            </div>
          </div>
          </>
          )}
          {error && error !== tProfile("emailInvalid") ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <Button
            type="submit"
            disabled={busy}
            className="h-11 min-h-[44px] w-full touch-manipulation rounded-xl border border-orange-500/35 bg-gradient-to-br from-accent to-orange-600 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-45 dark:border-orange-500/40 dark:shadow-accent/25"
          >
            {needsTwoFactor ? t("twoFactorSubmit") : needsTempPassword ? tProfile("updatePassword") : t("submit")}
          </Button>
          {needsTwoFactor ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setNeedsTwoFactor(false);
                setTwoFactorCode("");
                setError(null);
              }}
              className="block w-full text-center text-sm font-semibold text-zinc-600 transition hover:underline dark:text-zinc-400"
            >
              {t("twoFactorBack")}
            </button>
          ) : needsTempPassword ? null : (
          <p className="text-center text-sm">
            <Link
              href="/login/recover"
              className="font-semibold text-accent transition hover:underline dark:text-white dark:hover:text-zinc-200"
            >
              {t("recoverLink")}
            </Link>
          </p>
          )}
        </form>

        {needsTwoFactor || needsTempPassword ? null : (
        <p className="mt-6 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600 dark:border-zinc-800/90 dark:text-zinc-500">
          <Link
            href="/register/student"
            className="font-semibold text-accent transition hover:underline dark:text-white dark:hover:text-zinc-200"
          >
            {t("createStudent")}
          </Link>
        </p>
        )}
      </Card>
    </div>
  );
}
