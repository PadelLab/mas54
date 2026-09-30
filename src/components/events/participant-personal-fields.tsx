"use client";

import { countryLabelFromCode, isIsoCountryCode } from "@/lib/iso-regions";
import { ageFromBirthDate } from "@/lib/birth-date";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { formatDate } from "@/lib/utils";
import type { User } from "@/lib/types";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold normal-case tracking-normal text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1.5 min-h-[1.25rem] text-sm font-medium text-zinc-950 dark:text-zinc-100">
        {(value ?? "").trim()}
      </p>
    </div>
  );
}

export function ParticipantPersonalFields({ person }: { person: User }) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);

  const nationalityRaw = (person.nationality ?? "").trim();
  const nationalityLabel = nationalityRaw
    ? isIsoCountryCode(nationalityRaw)
      ? countryLabelFromCode(nationalityRaw, locale)
      : nationalityRaw
    : "";

  const genderDisplay =
    person.gender === "male"
      ? t("genderMale")
      : person.gender === "female"
        ? t("genderFemale")
        : person.gender === "other"
          ? t("genderOther")
          : "";

  const birthTrim = (person.birthDate ?? "").trim();
  const ageYears = birthTrim ? ageFromBirthDate(birthTrim) : null;

  return (
    <div className="space-y-5">
      <Field label={t("fullName")} value={person.name} />
      <Field label={t("email")} value={person.email} />
      <Field label={t("phone")} value={person.phone} />
      <Field label={t("nationality")} value={nationalityLabel} />
      <Field label={t("birthDate")} value={birthTrim ? formatDate(`${birthTrim}T12:00:00`, intlLocale) : ""} />
      <Field label={t("age")} value={ageYears != null ? String(ageYears) : ""} />
      <Field label={t("gender")} value={genderDisplay} />
    </div>
  );
}
