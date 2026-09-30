"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  passwordPolicyApiMessage,
  translatePasswordPolicyApiMessage,
  validateAppPassword,
  APP_PASSWORD_MIN_LENGTH,
} from "@/lib/password-policy";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordResetTokenFormProps = {
  backHref: string;
  backLabel: string;
  successRedirectHref: string;
  successDelayMs?: number;
  /** If true, the bottom link (e.g. Home) only appears after a successful password change. */
  showBackLinkOnlyAfterSuccess?: boolean;
};

export function PasswordResetTokenForm({
  backHref,
  backLabel,
  successRedirectHref,
  successDelayMs = 2000,
  showBackLinkOnlyAfterSuccess = false,
}: PasswordResetTokenFormProps) {
  const t = useTranslations("Login");
  const tProfile = useTranslations("Profile");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return <p className="mb-6 text-sm text-red-600 dark:text-red-400">{t("resetInvalidToken")}</p>;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || data.ok === false) {
        const policyErr = translatePasswordPolicyApiMessage(data.message, tProfile);
        if (policyErr) {
          setErr(policyErr);
          return;
        }
        setErr(t("resetInvalidToken"));
        return;
      }
      setDone(true);
      setTimeout(() => router.replace(successRedirectHref), successDelayMs);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
        <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
          {t("resetSuccess")}
        </p>
        {showBackLinkOnlyAfterSuccess ? (
          <Link
            href={backHref}
            className="mt-2 block text-center text-sm font-semibold text-accent hover:underline"
          >
            {backLabel}
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div>
            <Label htmlFor="npw">{t("resetPasswordLabel")}</Label>
            <Input
              id="npw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={APP_PASSWORD_MIN_LENGTH}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs leading-snug text-court/60 dark:text-zinc-500">
              {tProfile("passwordRequirementsHint")}
            </p>
          </div>
          <div>
            <Label htmlFor="npw2">{t("resetPasswordConfirm")}</Label>
            <Input
              id="npw2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={APP_PASSWORD_MIN_LENGTH}
              className="mt-1.5"
            />
          </div>
        </div>
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
      </form>
      {!showBackLinkOnlyAfterSuccess ? (
        <Link
          href={backHref}
          className="mt-6 block text-center text-sm font-semibold text-accent hover:underline"
        >
          {backLabel}
        </Link>
      ) : null}
    </>
  );
}
