"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { validateBirthDateForRegistration } from "@/lib/birth-date";
import { isIsoCountryCode } from "@/lib/iso-regions";
import {
  passwordPolicyApiMessage,
  translatePasswordPolicyApiMessage,
  validateAppPassword,
} from "@/lib/password-policy";
import { markCalendarSubscribeForNextPage } from "@/lib/calendar-subscribe-client";
import { isValidAppEmail, translateEmailApiMessage } from "@/lib/email-format";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  PublicSignupTemplate,
  SignupFormAlert,
  SignupFormFields,
  type SignupFormFieldLabels,
  type SignupMarketingFeature,
} from "@/components/signup/signup-template";
import type { UserGender } from "@/lib/types";

export default function RegisterStudentPage() {
  const { registerStudent } = useAuth();
  const router = useRouter();
  const t = useTranslations("RegisterStudent");
  const tTpl = useTranslations("SignupTemplate");
  const tProfile = useTranslations("Profile");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nationality, setNationality] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<UserGender | "">("");
  const [error, setError] = useState<string | null>(null);

  const labels: SignupFormFieldLabels = useMemo(
    () => ({
      firstName: t("firstName"),
      lastName: t("lastName"),
      email: t("email"),
      password: t("password"),
      confirmPassword: t("confirmPassword"),
      passwordMismatch: t("passwordMismatch"),
      nationality: t("nationality"),
      nationalityPlaceholder: t("nationalityPlaceholder"),
      birthDate: t("birthDate"),
      gender: t("gender"),
      genderPlaceholder: t("genderPlaceholder"),
      genderMale: t("genderMale"),
      genderFemale: t("genderFemale"),
      genderOther: t("genderOther"),
    }),
    [t],
  );

  const marketingFeatures: SignupMarketingFeature[] = useMemo(
    () => [
      { icon: "calendar", title: tTpl("featStudent1Title"), description: tTpl("featStudent1Desc") },
      { icon: "users", title: tTpl("featStudent2Title"), description: tTpl("featStudent2Desc") },
      { icon: "chart", title: tTpl("featStudent3Title"), description: tTpl("featStudent3Desc") },
    ],
    [tTpl],
  );

  const birthCheck = useMemo(() => validateBirthDateForRegistration(birthDate.trim()), [birthDate]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const demographicsOk =
    isIsoCountryCode(nationality.trim()) &&
    birthCheck.ok &&
    (gender === "male" || gender === "female" || gender === "other");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
    if (!name) {
      setError(t("demographicsInvalid"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!demographicsOk) {
      setError(t("demographicsInvalid"));
      return;
    }
    const birth = validateBirthDateForRegistration(birthDate.trim());
    if (!birth.ok) {
      setError(birth.message);
      return;
    }
    const pwPolicy = validateAppPassword(password);
    if (!pwPolicy.ok) {
      setError(
        translatePasswordPolicyApiMessage(passwordPolicyApiMessage(pwPolicy.code), tProfile) ??
          t("registerError"),
      );
      return;
    }
    if (!isValidAppEmail(email)) {
      setError(tProfile("emailInvalid"));
      return;
    }
    const res = await registerStudent({
      name,
      email,
      password,
      nationality: nationality.trim().toUpperCase(),
      birthDate: birth.iso,
      gender,
    });
    if (!res.ok) {
      const policyErr = translatePasswordPolicyApiMessage(res.message, tProfile);
      const emailErr = translateEmailApiMessage(res.message, tProfile);
      setError(policyErr ?? emailErr ?? res.message ?? t("registerError"));
      return;
    }
    const emailNorm = email.trim().toLowerCase();
    if (res.needsEmailVerification) {
      router.replace(`/register/verify?email=${encodeURIComponent(emailNorm)}`);
      return;
    }
    markCalendarSubscribeForNextPage();
    router.replace("/student/home");
  };

  return (
    <PublicSignupTemplate
      headline={tTpl("headlineStudent")}
      features={marketingFeatures}
      title={t("title")}
      intro={t("intro")}
      footer={
        <p className="text-zinc-500 dark:text-zinc-400">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-accent underline-offset-4 hover:underline dark:text-white dark:hover:text-zinc-200"
          >
            {t("login")}
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <SignupFormFields
          labels={labels}
          passwordHint={tProfile("passwordRequirementsHint")}
          firstName={firstName}
          lastName={lastName}
          email={email}
          password={password}
          confirmPassword={confirmPassword}
          nationality={nationality}
          birthDate={birthDate}
          gender={gender}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onEmailChange={(value) => {
            setEmail(value);
            if (error === tProfile("emailInvalid") || error === tProfile("emailInUse")) setError(null);
          }}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onNationalityChange={setNationality}
          onBirthDateChange={setBirthDate}
          onGenderChange={setGender}
          emailError={
            error === tProfile("emailInvalid") || error === tProfile("emailInUse") ? error : null
          }
          passwordMismatch={passwordMismatch}
        />
        {error &&
        error !== tProfile("emailInvalid") &&
        error !== tProfile("emailInUse") &&
        error !== t("passwordMismatch") ? (
          <SignupFormAlert tone="error">{error}</SignupFormAlert>
        ) : null}
        <Button
          type="submit"
          className="h-11 min-h-[44px] w-full touch-manipulation rounded-xl border border-orange-500/35 bg-gradient-to-br from-accent to-orange-600 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-45 dark:border-orange-500/40 dark:shadow-accent/25"
          disabled={!demographicsOk || passwordMismatch}
        >
          {t("submit")}
        </Button>
      </form>
    </PublicSignupTemplate>
  );
}
