"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/contexts/auth-context";
import {
  hasCalendarSubscribeBeenPrompted,
  markCalendarSubscribeForNextPage,
} from "@/lib/calendar-subscribe-client";
import { homePathForUserRole } from "@/lib/role-utils";
import { Button } from "@/components/ui/button";
import { AUTH_CONTROL_CLASS, AUTH_FIELD_LABEL_CLASS, Input, Label } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const t = useTranslations("Login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const { completeEmailVerification, resendEmailVerification } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  const digits = useMemo(() => code.replace(/\D/g, "").slice(0, 6), [code]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || digits.length < 4) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await completeEmailVerification(email, digits);
      if (!res.ok) {
        setError(
          res.message === "__VERIFY_UNAVAILABLE__"
            ? t("verifyUnavailable")
            : res.message === "__SESSION_NOT_LOADED__"
              ? t("sessionNotLoaded")
              : t("verifyError"),
        );
        return;
      }
      const r = res.role;
      if (
        (r === "student" || r === "coach" || r === "coach_admin") &&
        !hasCalendarSubscribeBeenPrompted()
      ) {
        markCalendarSubscribeForNextPage();
      }
      if (r) router.replace(homePathForUserRole(r));
      else router.replace("/student/home");
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (!email) return;
    setError(null);
    setResendBusy(true);
    try {
      const res = await resendEmailVerification(email);
      if (!res.ok) {
        setError(res.message ?? t("verifyError"));
        return;
      }
      setInfo(t("verifyResent"));
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="signup-page relative flex min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-zinc-50 p-4 text-zinc-900 dark:bg-[#060606] dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-100/25 via-transparent to-zinc-50 dark:from-zinc-900/30 dark:via-transparent dark:to-[#060606]"
        aria-hidden
      />
      <Card className="relative z-10 w-full max-w-md bg-white/95 p-6 shadow-lg backdrop-blur-sm dark:bg-zinc-900/75 dark:shadow-2xl dark:shadow-black/50 dark:backdrop-blur-xl sm:p-7">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/" priority imgClassName="h-11 sm:h-12" />
        </div>
        <CardTitle className="mb-2 text-center text-court dark:text-white">{t("verifyTitle")}</CardTitle>
        {email ? (
          <p className="mb-6 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("verifyIntro", { email })}
          </p>
        ) : (
          <p className="mb-6 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("verifyMissingEmail")}
          </p>
        )}

        {email ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="verify-code" className={AUTH_FIELD_LABEL_CLASS}>
                {t("verifyCodeLabel")}
              </Label>
              <Input
                id="verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={digits}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={6}
                placeholder="000000"
                className={cn(AUTH_CONTROL_CLASS, "mt-0 text-center text-2xl tracking-[0.4em]")}
              />
            </div>
            {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
            {info ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{info}</p> : null}
            <Button
              type="submit"
              disabled={busy || digits.length < 4}
              className="h-11 min-h-[44px] w-full touch-manipulation rounded-xl border border-orange-500/35 bg-gradient-to-br from-accent to-orange-600 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-45 dark:border-orange-500/40 dark:shadow-accent/25"
            >
              {t("verifySubmit")}
            </Button>
            <p className="text-center text-sm">
              <button
                type="button"
                onClick={() => void onResend()}
                disabled={resendBusy}
                className="font-semibold text-accent transition hover:underline disabled:opacity-50 dark:text-white dark:hover:text-zinc-200"
              >
                {t("verifyResend")}
              </button>
            </p>
          </form>
        ) : null}

        <p className="mt-6 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600 dark:border-zinc-800/90 dark:text-zinc-500">
          <Link
            href="/login"
            className="font-semibold text-accent transition hover:underline dark:text-white dark:hover:text-zinc-200"
          >
            {t("verifyBack")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
