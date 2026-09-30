"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordResetStandaloneLayout } from "@/components/auth/password-reset-standalone-layout";
import { PasswordResetNewPasswordForm } from "@/components/auth/password-reset-new-password-form";
import { safeNextPath } from "@/lib/safe-next-path";

export default function SettingsSecurityResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-500">…</p>}>
      <NewPasswordGate />
    </Suspense>
  );
}

function NewPasswordGate() {
  const t = useTranslations("Login");
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const next = safeNextPath(searchParams.get("next")) ?? "/settings/account";
  const codeHref = email
    ? `/settings/security/reset?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
    : "/login/recover";

  if (!email) {
    return (
      <PasswordResetStandaloneLayout>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">{t("verifyMissingEmail")}</p>
      </PasswordResetStandaloneLayout>
    );
  }

  return (
    <PasswordResetStandaloneLayout>
      <PasswordResetNewPasswordForm
        email={email}
        codeHref={codeHref}
        backHref={next}
        backLabel={t("resetBackHome")}
        successRedirectHref={next}
      />
    </PasswordResetStandaloneLayout>
  );
}
