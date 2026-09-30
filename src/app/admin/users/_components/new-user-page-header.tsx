"use client";

import { useTranslations } from "next-intl";
import { AdminUsersBackLink } from "./admin-users-back-link";
import { pageTitleClass } from "@/lib/utils";
import type { NewUserSource } from "./new-user-source";

function resolved(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return !value || value === key || value.startsWith("AdminNewUser.") ? fallback : value;
}

export function NewUserPageHeader({
  source,
  hideHeading = false,
}: {
  source?: NewUserSource;
  hideHeading?: boolean;
}) {
  const t = useTranslations("AdminNewUser");
  const tHub = useTranslations("AdminUsersHub");

  const backHref =
    source === "coaches"
      ? "/admin/users/coaches"
      : source === "administrators"
        ? "/admin/users/administrators"
        : "/admin/users";
  const backLabel =
    source === "coaches"
      ? resolved(t, "backCoaches", tHub("teachers"))
      : source === "administrators"
        ? resolved(t, "backAdministrators", tHub("administrators"))
        : t("backHub");

  const subtitle =
    source === "coaches"
      ? resolved(t, "subtitleCoaches", t("subtitleDefault"))
      : source === "administrators"
        ? resolved(t, "subtitleAdministrators", t("subtitleDefault"))
        : t("subtitleDefault");

  return (
    <div>
      <AdminUsersBackLink href={backHref} parentLabel={backLabel} currentLabel={t("title")} />
      {hideHeading ? null : (
        <>
          <h1 className={`${pageTitleClass} text-court`}>{t("title")}</h1>
          <p className="mt-1 text-sm text-court/60">{subtitle}</p>
        </>
      )}
    </div>
  );
}
