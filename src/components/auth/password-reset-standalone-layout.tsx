"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand-logo";
import { Card, CardTitle } from "@/components/ui/card";

/** Same visual frame as `/login/reset` (background + card + logo). */
export function PasswordResetStandaloneLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const t = useTranslations("Login");

  return (
    <div className="signup-page relative flex min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-zinc-50 p-4 pt-[max(1rem,env(safe-area-inset-top))] text-zinc-900 dark:bg-[#060606] dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-100/25 via-transparent to-zinc-50 dark:from-zinc-900/30 dark:via-transparent dark:to-[#060606]"
        aria-hidden
      />
      <Card className="relative z-10 w-full max-w-md bg-white/95 p-6 shadow-lg backdrop-blur-sm dark:bg-zinc-900/75 dark:text-zinc-100 dark:shadow-2xl dark:shadow-black/50 dark:backdrop-blur-xl sm:p-7">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/" priority imgClassName="h-11 sm:h-12" />
        </div>
        <CardTitle className="mb-4 text-center text-court dark:text-white">{title ?? t("resetTitle")}</CardTitle>
        {children}
      </Card>
    </div>
  );
}
