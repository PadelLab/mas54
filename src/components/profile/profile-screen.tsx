"use client";

import { useAuth } from "@/contexts/auth-context";
import { usePreferences } from "@/contexts/preferences-context";
import { countryLabelFromCode, isIsoCountryCode } from "@/lib/iso-regions";
import { ageFromBirthDate } from "@/lib/birth-date";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { formatDate } from "@/lib/utils";
import { processAvatarForStorage } from "@/lib/profile-image";
import { ProfileIdentityCard } from "@/components/profile/profile-identity-card";
import { KeyRound, Pencil } from "lucide-react";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { canManageOtherUserProfile } from "@/lib/role-utils";
import type { User } from "@/lib/types";

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold normal-case tracking-normal text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1.5 min-h-[1.25rem] text-sm font-medium text-zinc-950 dark:text-zinc-100">
        {(value ?? "").trim()}
      </p>
    </div>
  );
}

export function ProfileScreen({ subject }: { subject?: User } = {}) {
  const t = useTranslations("Profile");
  const { effectiveLocale } = usePreferences();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(effectiveLocale), [effectiveLocale]);
  const pathname = usePathname();
  const personalEditHref = subject ? `${pathname.replace(/\/$/, "")}/edit` : "/settings/account";
  const { user: sessionUser, updateProfile } = useAuth();
  const user = subject ?? sessionUser;
  const [msg, setMsg] = useState<string | null>(null);

  const nationalityLabel = useMemo(() => {
    if (!user) return null;
    const raw = (user.nationality ?? "").trim();
    if (!raw) return null;
    const loc = effectiveLocale;
    return isIsoCountryCode(raw) ? countryLabelFromCode(raw, loc) : raw;
  }, [user, effectiveLocale]);

  if (!user) return null;

  const canEdit =
    Boolean(sessionUser) &&
    (sessionUser!.id === user.id || canManageOtherUserProfile(sessionUser!.role, user.role));

  const roleLabel = t(`roles.${user.role}`);
  const avatarHint = canEdit ? t("avatarHint").trim() : "";
  const personalIntro = t("personalIntro").trim();
  const securityIntro = t("securityIntro").trim();
  const showAccountSecurity = canEdit && !subject;
  const genderDisplay =
    user.gender === "male"
      ? t("genderMale")
      : user.gender === "female"
        ? t("genderFemale")
        : user.gender === "other"
          ? t("genderOther")
          : "";
  const birthTrim = (user.birthDate ?? "").trim();
  const ageYears = birthTrim ? ageFromBirthDate(birthTrim) : null;

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await processAvatarForStorage(file);
      await updateProfile(user.id, { avatarUrl: url });
      setMsg(t("msgAvatar"));
      setTimeout(() => setMsg(null), 3200);
    } catch {
      setMsg(t("msgAvatarError"));
      setTimeout(() => setMsg(null), 4000);
    }
    e.target.value = "";
  };

  return (
    <div className="mx-auto flex w-full max-w-full min-w-0 animate-fade-slide flex-col gap-6 pb-8 md:gap-8">
      <ProfileIdentityCard
        user={user}
        onAvatar={onAvatar}
        canChangeAvatar={canEdit}
        roleLabel={roleLabel}
        accessUntil={
          user.role === "student" && user.accessExpiresAt
            ? t("accessUntil", { date: formatDate(user.accessExpiresAt, intlLocale) })
            : null
        }
        hint={avatarHint || null}
        message={msg}
      />

      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.12)] ring-1 ring-zinc-950/[0.03] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-black/35 dark:ring-zinc-800/30">
          <aside className="flex flex-col gap-4 border-b border-zinc-200 bg-white px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-6 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold leading-snug tracking-tight text-zinc-950 dark:text-zinc-50 md:text-xl">
                {t("personalTitle")}
              </h2>
              {personalIntro ? (
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-950/65 dark:text-zinc-400">{personalIntro}</p>
              ) : null}
            </div>
            {canEdit ? (
              <Link
                href={personalEditHref}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-court shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-600 dark:bg-zinc-800 dark:text-emerald-100 dark:hover:bg-zinc-700 sm:self-start"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                {t("editInfo")}
              </Link>
            ) : null}
          </aside>
          <div className="grid gap-5 border-t border-zinc-100 bg-white p-5 sm:grid-cols-2 sm:p-6 md:p-7 dark:border-zinc-800 dark:bg-zinc-900">
            <ProfileField label={t("fullName")} value={user.name} />
            <ProfileField label={t("email")} value={user.email} />
            <ProfileField label={t("phone")} value={user.phone} />
            <ProfileField label={t("nationality")} value={nationalityLabel} />
            <ProfileField
              label={t("birthDate")}
              value={birthTrim ? formatDate(`${birthTrim}T12:00:00`, intlLocale) : ""}
            />
            <ProfileField label={t("age")} value={ageYears != null ? String(ageYears) : ""} />
            <div className="sm:col-span-2">
              <ProfileField label={t("gender")} value={genderDisplay} />
            </div>
          </div>
        </div>

        {showAccountSecurity ? (
          <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.12)] ring-1 ring-zinc-950/[0.03] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-black/35 dark:ring-zinc-800/30">
            <aside className="flex flex-col gap-4 border-b border-zinc-200 bg-white px-5 py-5 sm:px-6 sm:py-6 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  <KeyRound className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold leading-snug tracking-tight text-zinc-950 dark:text-zinc-50 md:text-xl">
                    {t("securityTitle")}
                  </h2>
                  {securityIntro ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-950/65 dark:text-zinc-400">
                      {securityIntro}
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>
            <div className="border-t border-zinc-100 bg-white p-5 sm:p-6 md:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <PasswordChangeForm />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
