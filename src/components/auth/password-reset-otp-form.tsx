"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import Link from "next/link";
import { storeResetPasswordOtp } from "@/lib/reset-password-otp";
import { Button } from "@/components/ui/button";
import { AUTH_CONTROL_CLASS, AUTH_FIELD_LABEL_CLASS, Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordResetOtpForm({
  email,
  backHref,
  backLabel,
  nextHref,
}: {
  email: string;
  backHref: string;
  backLabel: string;
  nextHref: string;
}) {
  const t = useTranslations("Login");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const digits = useMemo(() => code.replace(/\D/g, "").slice(0, 6), [code]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (digits.length < 4) return;
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/check-reset-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: digits }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || data.ok === false) {
        setErr(t("verifyError"));
        return;
      }
      storeResetPasswordOtp(email, digits);
      router.replace(nextHref);
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setErr(null);
    setResendBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || data.ok === false) {
        setErr(t("recoverError"));
        return;
      }
      setInfo(t("resetResent"));
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <>
      <p className="mb-6 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {t("resetCodeIntro", { email })}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="reset-otp" className={AUTH_FIELD_LABEL_CLASS}>{t("resetCodeLabel")}</Label>
          <Input
            id="reset-otp"
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
        {err ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{err}</p> : null}
        {info ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{info}</p> : null}
        <Button
          type="submit"
          disabled={busy || digits.length < 4}
          className={cn(
            "h-11 min-h-[44px] w-full touch-manipulation rounded-xl border border-orange-500/35 bg-gradient-to-br from-accent to-orange-600 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-45 dark:border-orange-500/40 dark:shadow-accent/25",
          )}
        >
          {t("resetCodeSubmit")}
        </Button>
        <p className="text-center text-sm">
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={resendBusy}
            className="font-semibold text-accent transition hover:underline disabled:opacity-50 dark:text-white dark:hover:text-zinc-200"
          >
            {t("resetResend")}
          </button>
        </p>
      </form>
      <Link href={backHref} className="mt-6 block text-center text-sm font-semibold text-accent hover:underline">
        {backLabel}
      </Link>
    </>
  );
}
