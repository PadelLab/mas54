"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { ProfilePhoneField } from "@/components/profile/profile-phone-field";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { BirthDateInput } from "@/components/ui/birth-date-input";
import { Input, Label } from "@/components/ui/input";
import { FORM_SUBMIT_BUTTON_CLASS, LIST_CONTROL_CLASS } from "@/components/list-search-field";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isValidOptionalProfilePhone } from "@/lib/phone-profile";
import { translateEmailApiMessage } from "@/lib/email-format";
import { ageFromBirthDate, validateBirthDateForRegistration } from "@/lib/birth-date";
import { isIsoCountryCode, isLegacyNationalityFreeText } from "@/lib/iso-regions";
import { cn, pageTitleClass } from "@/lib/utils";
import type { User, UserGender } from "@/lib/types";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

const controlClass = LIST_CONTROL_CLASS;

function Field({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col justify-end gap-1.5">{children}</div>;
}

export function ProfileEditScreen({
  subject,
  embedded = false,
}: {
  subject?: User;
  embedded?: boolean;
} = {}) {
  const t = useTranslations("Profile");
  const pathname = usePathname();
  const router = useRouter();
  const { user: sessionUser, updateProfile } = useAuth();
  const user = subject ?? sessionUser;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<UserGender | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const profileHref = useMemo(() => pathname.replace(/\/edit\/?$/, "") || "/", [pathname]);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setNationality(user.nationality ?? "");
    setBirthDate(user.birthDate ?? "");
    setGender(user.gender ?? "");
  }, [user]);

  const birthCheck = useMemo(() => validateBirthDateForRegistration(birthDate.trim()), [birthDate]);
  const computedAge = useMemo(() => ageFromBirthDate(birthDate.trim()), [birthDate]);

  if (!user) return null;

  const personalIntro = t("personalIntro").trim();
  const phoneTrimmed = phone.trim();
  const phoneOk = isValidOptionalProfilePhone(phoneTrimmed);
  /** Phone filled but still invalid → blocks save and shows a warning. */
  const phoneBlocksSave = !phoneOk && phoneTrimmed.length > 0;
  const natTrim = nationality.trim();
  const demographicsOk =
    (isIsoCountryCode(natTrim) || isLegacyNationalityFreeText(natTrim)) &&
    birthCheck.ok &&
    (gender === "male" || gender === "female" || gender === "other");

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!phoneOk) return;
    const nextEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setFormError(t("emailInvalid"));
      return;
    }
    if (!demographicsOk) {
      setFormError(t("demographicsInvalid"));
      return;
    }
    const birth = validateBirthDateForRegistration(birthDate.trim());
    if (!birth.ok) {
      setFormError(birth.message);
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile(user.id, {
        name,
        email: nextEmail,
        phone: phoneTrimmed,
        nationality: isIsoCountryCode(natTrim) ? natTrim.toUpperCase() : natTrim,
        birthDate: birth.iso,
        gender,
      });
      if (result.ok === false) {
        const emailMsg = translateEmailApiMessage(result.message, t);
        const msg = emailMsg ?? result.message;
        setFormError(msg);
        return;
      }
      if (embedded) {
        setSavedMsg(t("msgProfile"));
        setTimeout(() => setSavedMsg(null), 3200);
        return;
      }
      router.push(profileHref);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn(!embedded && "mx-auto w-full max-w-full min-w-0 animate-fade-slide space-y-6 pb-8")}>
      {embedded ? null : (
      <div>
        <Link
          href={profileHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t("backToProfile")}
        </Link>
        <h1 className={cn("mt-5", pageTitleClass, "text-zinc-950 dark:text-zinc-50")}>{t("editInfo")}</h1>
        {personalIntro ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{personalIntro}</p>
        ) : null}
      </div>
      )}

      <div className={cn(!embedded && "overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.12)] ring-1 ring-zinc-950/[0.03] dark:border-zinc-700/90 dark:bg-zinc-900 dark:shadow-black/35 dark:ring-zinc-800/30")}>
        <form onSubmit={onSave} className={cn("space-y-4", !embedded && "p-5 sm:p-6 md:p-7")}>
          {savedMsg ? (
            <p className="rounded-xl border border-emerald-100/90 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-100">
              {savedMsg}
            </p>
          ) : null}
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 items-end gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field>
                <Label htmlFor="edit-profile-name" className="mb-0 !mb-0 min-h-4 leading-4">
                  {t("fullName")}
                </Label>
                <Input
                  id="edit-profile-name"
                  className={cn("rounded-xl border-zinc-200", controlClass)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="edit-profile-email" className="mb-0 !mb-0 min-h-4 leading-4">
                  {t("email")}
                </Label>
                <Input
                  id="edit-profile-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  title={t("emailHint")}
                  className={cn("rounded-xl border-zinc-200", controlClass)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 items-end gap-x-6 gap-y-5 sm:grid-cols-2">
              <NationalitySelect
                id="edit-profile-nationality"
                label={t("nationality")}
                value={nationality}
                onChange={setNationality}
                placeholder={t("nationalityPlaceholder")}
                required
                labelClassName="min-h-4 leading-4"
                selectClassName="mt-0 h-12 min-h-12 rounded-xl border-zinc-200 bg-white py-0 dark:border-zinc-600 dark:bg-zinc-900"
              />
              <Field>
                <Label htmlFor="edit-profile-phone" className="mb-0 !mb-0 min-h-4 leading-4">
                  {t("phone")}
                </Label>
                <div
                  className={cn(
                    "h-12 min-h-12",
                    phoneBlocksSave &&
                      "rounded-xl ring-2 ring-red-500/80 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900",
                  )}
                >
                  <ProfilePhoneField id="edit-profile-phone" value={phone} onChange={setPhone} />
                </div>
                {phoneBlocksSave ? (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{t("phoneInvalid")}</p>
                ) : null}
              </Field>
            </div>
            <div className="grid grid-cols-1 items-end gap-x-6 gap-y-5 sm:grid-cols-2">
              <BirthDateInput
                id="edit-profile-birthDate"
                label={t("birthDate")}
                labelClassName="min-h-4 leading-4"
                className="mt-0 box-border h-12 min-h-12 max-h-12 rounded-xl border-zinc-200 py-0"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
              <Field>
                <Label htmlFor="edit-profile-age-computed" className="mb-0 !mb-0 min-h-4 leading-4">
                  {t("age")}
                </Label>
                <Input
                  id="edit-profile-age-computed"
                  className={cn("rounded-xl border-zinc-200 opacity-80", controlClass)}
                  readOnly
                  disabled
                  value={computedAge != null ? String(computedAge) : ""}
                  placeholder="—"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 items-end gap-x-6 sm:grid-cols-2">
              <Field>
                <Label htmlFor="edit-profile-gender" className="mb-0 !mb-0 min-h-4 leading-4">
                  {t("gender")}
                </Label>
                <select
                  id="edit-profile-gender"
                  className={controlClass}
                  value={gender}
                  onChange={(e) => setGender(e.target.value as UserGender | "")}
                  required
                >
                  <option value="">{t("genderPlaceholder")}</option>
                  <option value="male">{t("genderMale")}</option>
                  <option value="female">{t("genderFemale")}</option>
                  <option value="other">{t("genderOther")}</option>
                </select>
              </Field>
            </div>
          </div>
          {formError ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Button type="submit" className={cn(FORM_SUBMIT_BUTTON_CLASS, "w-full sm:w-auto")} disabled={!phoneOk || !demographicsOk || saving}>
              {t("saveProfile")}
            </Button>
            {embedded ? null : (
            <Button type="button" variant="secondary" className="h-11 w-full rounded-xl sm:w-auto" asChild>
              <Link href={profileHref}>{t("cancelEdit")}</Link>
            </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
