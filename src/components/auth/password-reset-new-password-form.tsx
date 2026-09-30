"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  passwordPolicyApiMessage,
  translatePasswordPolicyApiMessage,
  validateAppPassword,
  APP_PASSWORD_MIN_LENGTH,
} from "@/lib/password-policy";
import { clearResetPasswordOtp, readResetPasswordOtp } from "@/lib/reset-password-otp";
import { Button } from "@/components/ui/button";
import { AUTH_CONTROL_CLASS, AUTH_FIELD_LABEL_CLASS, Input, Label } from "@/components/ui/input";
import { PasswordToggle } from "@/components/ui/password-toggle";
import { cn } from "@/lib/utils";

export function PasswordResetNewPasswordForm({
  email,
  codeHref,
  backHref,
  backLabel,
  successRedirectHref,
  successDelayMs = 2000,
}: {
  email: string;
  codeHref: string;
  backHref: string;
  backLabel: string;
  successRedirectHref: string;
  successDelayMs?: number;
}) {
  const t = useTranslations("Login");
  const tProfile = useTranslations("Profile");
  const router = useRouter();
  const [otp, setOtp] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stored = readResetPasswordOtp(email);
    if (!stored) {
      router.replace(codeHref);
      return;
    }
    setOtp(stored);
  }, [email, codeHref, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setErr(null);
    const policy = validateAppPassword(password);
    if (!policy.ok) {
      setErr(
        translatePasswordPolicyApiMessage(passwordPolicyApiMessage(policy.code), tProfile) ??
          tProfile("passwordError"),
      );
      return;
    }
    if (password !== confirm) {
      setErr(t("resetPasswordMismatch"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password, revokeOtherSessions }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || data.ok === false) {
        const policyErr = translatePasswordPolicyApiMessage(data.message, tProfile);
        if (policyErr) {
          setErr(policyErr);
          return;
        }
        setErr(t("verifyError"));
        return;
      }
      clearResetPasswordOtp();
      setDone(true);
      setTimeout(() => router.replace(successRedirectHref), successDelayMs);
    } finally {
      setBusy(false);
    }
  };

  if (!otp && !done) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">…</p>;
  }

  if (done) {
    return (
      <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
        {t("resetSuccess")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="npw" className={AUTH_FIELD_LABEL_CLASS}>{t("resetPasswordLabel")}</Label>
        <div className="relative min-w-0">
          <Input
            id="npw"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={APP_PASSWORD_MIN_LENGTH}
            className={cn(AUTH_CONTROL_CLASS, "mt-0 pr-12")}
            autoFocus
          />
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            hideLabel={t("hidePassword")}
            showLabel={t("showPassword")}
          />
        </div>
        <p className="mt-1 text-xs leading-snug text-court/60 dark:text-zinc-500">
          {tProfile("passwordRequirementsHint")}
        </p>
      </div>
      <div>
        <Label htmlFor="npw2" className={AUTH_FIELD_LABEL_CLASS}>{t("resetPasswordConfirm")}</Label>
        <div className="relative min-w-0">
          <Input
            id="npw2"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={APP_PASSWORD_MIN_LENGTH}
            className={cn(AUTH_CONTROL_CLASS, "mt-0 pr-12")}
          />
          <PasswordToggle
            visible={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            hideLabel={t("hidePassword")}
            showLabel={t("showPassword")}
          />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm leading-snug text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={revokeOtherSessions}
          onChange={(e) => setRevokeOtherSessions(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-accent focus:ring-accent/40 dark:border-zinc-600 dark:bg-zinc-900"
        />
        <span>
          {tProfile("signOutOtherDevicesLead")} {tProfile("signOutOtherDevicesDetail")}
        </span>
      </label>
      {err ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{err}</p> : null}
      <Button
        type="submit"
        disabled={busy}
        className={cn(
          "h-11 min-h-[44px] w-full touch-manipulation rounded-xl border border-orange-500/35 bg-gradient-to-br from-accent to-orange-600 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-45 dark:border-orange-500/40 dark:shadow-accent/25",
        )}
      >
        {t("resetSubmit")}
      </Button>
      <Link href={backHref} className="block text-center text-sm font-semibold text-accent hover:underline">
        {backLabel}
      </Link>
    </form>
  );
}
