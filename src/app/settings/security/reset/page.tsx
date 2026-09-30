"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordResetStandaloneLayout } from "@/components/auth/password-reset-standalone-layout";
import { PasswordResetTokenForm } from "@/components/auth/password-reset-token-form";
import { PasswordResetOtpForm } from "@/components/auth/password-reset-otp-form";

/** In-app password reset (logged-in flow). New password step: `/settings/security/reset/password`. */
export default function SettingsSecurityResetPage() {
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
  const next = searchParams.get("next")?.trim() ?? "/settings/account";
  const passwordHref = email
    ? `/settings/security/reset/password?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
    : "/settings/security/reset/password";

  if (email && !token) {
    return (
      <PasswordResetStandaloneLayout title={t("resetCodeTitle")}>
        <PasswordResetOtpForm
          email={email}
          backHref={next}
          backLabel={t("resetBackHome")}
          nextHref={passwordHref}
        />
      </PasswordResetStandaloneLayout>
    );
  }

  return (
    <PasswordResetStandaloneLayout>
      <PasswordResetTokenForm
        backHref="/"
        backLabel={t("resetBackHome")}
        successRedirectHref="/settings/account"
        showBackLinkOnlyAfterSuccess
      />
    </PasswordResetStandaloneLayout>
  );
}
