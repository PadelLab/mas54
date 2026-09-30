"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordResetStandaloneLayout } from "@/components/auth/password-reset-standalone-layout";
import { PasswordResetTokenForm } from "@/components/auth/password-reset-token-form";
import { PasswordResetOtpForm } from "@/components/auth/password-reset-otp-form";

export default function LoginResetPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-500">…</p>}>
      <ResetGate />
    </Suspense>
  );
}

function ResetGate() {
  const t = useTranslations("Login");
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const next = searchParams.get("next")?.trim() ?? "";
  const passwordHref = email
    ? `/login/reset/password?email=${encodeURIComponent(email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`
    : "/login/reset/password";

  if (email && !token) {
    return (
      <PasswordResetStandaloneLayout title={t("resetCodeTitle")}>
        <PasswordResetOtpForm
          email={email}
          backHref="/login"
          backLabel={t("resetBackLogin")}
          nextHref={passwordHref}
        />
      </PasswordResetStandaloneLayout>
    );
  }

  return (
    <PasswordResetStandaloneLayout>
      <PasswordResetTokenForm
        backHref="/login"
        backLabel={t("resetBackLogin")}
        successRedirectHref="/login"
        showBackLinkOnlyAfterSuccess
      />
    </PasswordResetStandaloneLayout>
  );
}
