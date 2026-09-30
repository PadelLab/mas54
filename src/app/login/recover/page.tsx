"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AUTH_CONTROL_CLASS, AUTH_FIELD_LABEL_CLASS, Input, Label } from "@/components/ui/input";

export default function LoginRecoverPage() {
  const t = useTranslations("Login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (res.status === 503 && data.message === "EMAIL_NOT_CONFIGURED") {
        setErr(t("recoverEmailNotConfigured"));
        return;
      }
      if (!res.ok || data.ok === false) {
        setErr(t("recoverError"));
        return;
      }
      router.replace(`/login/reset?email=${encodeURIComponent(trimmed)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signup-page relative flex min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-zinc-50 p-4 text-zinc-900 dark:bg-[#060606] dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-100/25 via-transparent to-zinc-50 dark:from-zinc-900/30 dark:via-transparent dark:to-[#060606]"
        aria-hidden
      />
      <Card className="relative z-10 w-full max-w-md bg-white/95 p-6 shadow-lg backdrop-blur-sm dark:bg-zinc-900/75 dark:text-zinc-100 dark:shadow-2xl dark:shadow-black/50 dark:backdrop-blur-xl sm:p-7">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/" priority imgClassName="h-11 sm:h-12" />
        </div>
        <CardTitle className="mb-2 text-center text-court dark:text-white">{t("recoverTitle")}</CardTitle>
        <p className="mb-6 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {t("recoverIntro")}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="recover-email" className={AUTH_FIELD_LABEL_CLASS}>{t("recoverEmailLabel")}</Label>
              <Input
                id="recover-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={AUTH_CONTROL_CLASS}
              />
            </div>
            {err ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{err}</p> : null}
            <Button type="submit" className="w-full py-3" disabled={busy}>
              {t("recoverSubmit")}
            </Button>
          </form>

        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-semibold text-accent hover:underline"
        >
          {t("recoverBack")}
        </Link>
      </Card>
    </div>
  );
}
