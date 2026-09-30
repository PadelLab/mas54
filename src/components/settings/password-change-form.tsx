"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  passwordPolicyApiMessage,
  translatePasswordPolicyApiMessage,
  validateAppPassword,
  APP_PASSWORD_MIN_LENGTH,
} from "@/lib/password-policy";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordToggle } from "@/components/ui/password-toggle";
import { cn } from "@/lib/utils";

export function PasswordChangeForm({ stacked = false }: { stacked?: boolean }) {
  const { user, changePassword } = useAuth();
  const tProfile = useTranslations("Profile");
  const tLogin = useTranslations("Login");
  const router = useRouter();
  const pathname = usePathname() ?? "/settings/account";
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmNextPw, setConfirmNextPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNextPw, setShowNextPw] = useState(false);
  const [showConfirmNextPw, setShowConfirmNextPw] = useState(false);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotNotice, setForgotNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const mapPasswordError = (message?: string) => {
    const policyText = translatePasswordPolicyApiMessage(message, tProfile);
    if (policyText) return policyText;
    const m = (message ?? "").toLowerCase();
    if (m.includes("senha atual incorreta")) return tProfile("passwordCurrentIncorrect");
    if (m.includes("nova senha deve ter ao menos")) return tProfile("passwordPolicyTooShort");
    return message ?? tProfile("passwordError");
  };

  if (!user) return null;

  const onForgotPasswordSession = async () => {
    setForgotNotice(null);
    setForgotBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password-session", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        throttled?: boolean;
      };
      if (data.throttled) {
        setForgotNotice({ tone: "ok", text: tProfile("forgotPasswordSessionThrottled") });
        return;
      }
      if (res.status === 401) {
        setForgotNotice({ tone: "err", text: tProfile("forgotPasswordSessionError") });
        return;
      }
      if (res.status === 503 && data.message === "EMAIL_NOT_CONFIGURED") {
        setForgotNotice({ tone: "err", text: tProfile("forgotPasswordSessionEmailNotConfigured") });
        return;
      }
      if (res.status === 503 && data.message === "EMAIL_SEND_FAILED") {
        setForgotNotice({ tone: "err", text: tProfile("forgotPasswordSessionEmailSendFailed") });
        return;
      }
      if (!res.ok || data.ok === false) {
        setForgotNotice({ tone: "err", text: tProfile("forgotPasswordSessionError") });
        return;
      }
      const returnTo =
        pathname.startsWith("/coach") || pathname.startsWith("/student") ? pathname : "/settings/account";
      router.push(
        `/settings/security/reset?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(returnTo)}`,
      );
    } catch {
      setForgotNotice({ tone: "err", text: tProfile("forgotPasswordSessionError") });
    } finally {
      setForgotBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setForgotNotice(null);
    if (nextPw !== confirmNextPw) {
      setErr(tProfile("passwordMismatch"));
      return;
    }
    const nextPolicy = validateAppPassword(nextPw);
    if (!nextPolicy.ok) {
      setErr(translatePasswordPolicyApiMessage(passwordPolicyApiMessage(nextPolicy.code), tProfile) ?? tProfile("passwordError"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await changePassword(user.id, currentPw, nextPw, {
        revokeOtherSessions,
      });
      if (!res.ok) {
        setErr(mapPasswordError(res.message));
        return;
      }
      setCurrentPw("");
      setNextPw("");
      setConfirmNextPw("");
      setRevokeOtherSessions(false);
      setMsg(tProfile("msgPassword"));
      setTimeout(() => setMsg(null), 3200);
    } catch {
      setErr(tProfile("passwordError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {err ? (
        <p className="rounded-xl border border-red-100/90 bg-red-50/90 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-xl border border-emerald-100/90 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-100">
          {msg}
        </p>
      ) : null}
      <div className={cn("grid gap-4", stacked ? "grid-cols-1" : "sm:grid-cols-2")}>
      <div className={stacked ? undefined : "sm:col-span-2"}>
        <Label htmlFor="security-current">{tProfile("currentPassword")}</Label>
        <div className="relative min-w-0">
          <Input
            id="security-current"
            type={showCurrentPw ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            required
          />
          <PasswordToggle
            visible={showCurrentPw}
            onToggle={() => setShowCurrentPw((v) => !v)}
            hideLabel={tLogin("hidePassword")}
            showLabel={tLogin("showPassword")}
          />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{tProfile("currentPasswordHint")}</p>
      </div>
      <div>
        <Label htmlFor="security-new">{tProfile("newPassword")}</Label>
        <div className="relative min-w-0">
          <Input
            id="security-new"
            type={showNextPw ? "text" : "password"}
            autoComplete="new-password"
            className="pr-12"
            value={nextPw}
            onChange={(e) => setNextPw(e.target.value)}
            required
            minLength={APP_PASSWORD_MIN_LENGTH}
          />
          <PasswordToggle
            visible={showNextPw}
            onToggle={() => setShowNextPw((v) => !v)}
            hideLabel={tLogin("hidePassword")}
            showLabel={tLogin("showPassword")}
          />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{tProfile("passwordRequirementsHint")}</p>
      </div>
      <div>
        <Label htmlFor="security-confirm-new">{tProfile("confirmNewPassword")}</Label>
        <div className="relative min-w-0">
          <Input
            id="security-confirm-new"
            type={showConfirmNextPw ? "text" : "password"}
            autoComplete="new-password"
            className="pr-12"
            value={confirmNextPw}
            onChange={(e) => setConfirmNextPw(e.target.value)}
            required
            minLength={APP_PASSWORD_MIN_LENGTH}
          />
          <PasswordToggle
            visible={showConfirmNextPw}
            onToggle={() => setShowConfirmNextPw((v) => !v)}
            hideLabel={tLogin("hidePassword")}
            showLabel={tLogin("showPassword")}
          />
        </div>
      </div>
      </div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void onForgotPasswordSession()}
          disabled={forgotBusy}
          className="text-left text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline disabled:opacity-50 dark:text-emerald-300"
        >
          {tProfile("securityForgotPasswordLink")}
        </button>
        {forgotNotice ? (
          <p
            className={cn(
              "text-sm leading-snug",
              forgotNotice.tone === "ok"
                ? "text-emerald-800 dark:text-emerald-200"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {forgotNotice.text}
          </p>
        ) : null}
      </div>
      <div className="flex items-start gap-3">
        <input
          id="security-revoke-sessions"
          type="checkbox"
          checked={revokeOtherSessions}
          onChange={(e) => setRevokeOtherSessions(e.target.checked)}
          aria-labelledby="security-revoke-sessions-desc"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-emerald-500"
        />
        <span id="security-revoke-sessions-desc" className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">
          {tProfile("signOutOtherDevicesLead")} {tProfile("signOutOtherDevicesDetail")}
        </span>
      </div>
      <div className="pt-2">
        <Button type="submit" variant="secondary" className="h-11 rounded-xl sm:w-auto" disabled={isSubmitting}>
          {tProfile("updatePassword")}
        </Button>
      </div>
    </form>
  );
}
