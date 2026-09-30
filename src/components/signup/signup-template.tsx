"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChevronDown,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { BirthDateInput } from "@/components/ui/birth-date-input";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { Input, Label, AUTH_CONTROL_CLASS, AUTH_FIELD_LABEL_CLASS } from "@/components/ui/input";
import { PasswordToggle } from "@/components/ui/password-toggle";
import { APP_PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { cn } from "@/lib/utils";
import type { UserGender } from "@/lib/types";

/** Fields on a white card: visible border (the inner ring vanishes on white). */
const fieldControl = cn(AUTH_CONTROL_CLASS, "h-12 min-h-12 max-h-12");
const fieldSelect = cn(fieldControl, "cursor-pointer appearance-none pr-10");
/** Side-by-side labels: reserve two lines so a wrap (Fecha de nacimiento) does not drop only one input. */
const pairedFieldLabelClass = cn(
  AUTH_FIELD_LABEL_CLASS,
  "flex min-h-[2.5rem] items-end leading-tight",
);

const selectChevronClass =
  "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400";

const FEATURE_ICONS: Record<SignupMarketingFeature["icon"], LucideIcon> = {
  calendar: CalendarDays,
  users: Users,
  chart: TrendingUp,
  shield: Shield,
};

export type SignupMarketingFeature = {
  title: string;
  description: string;
  icon: "calendar" | "users" | "chart" | "shield";
};

export type SignupFormFieldLabels = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  passwordMismatch: string;
  nationality: string;
  nationalityPlaceholder: string;
  birthDate: string;
  gender: string;
  genderPlaceholder: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
};

export type SignupFormFieldsProps = {
  labels: SignupFormFieldLabels;
  passwordHint?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  nationality: string;
  birthDate: string;
  gender: UserGender | "";
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onGenderChange: (value: UserGender | "") => void;
  emailError?: string | null;
  passwordMismatch?: boolean;
};

/** Shared student / coach fields — light / dark colors via `html.dark`. */
export function SignupFormFields({
  labels,
  passwordHint,
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
  nationality,
  birthDate,
  gender,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onNationalityChange,
  onBirthDateChange,
  onGenderChange,
  emailError,
  passwordMismatch,
}: SignupFormFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const tAria = useTranslations("SignupTemplate");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="signup-first-name" className={AUTH_FIELD_LABEL_CLASS}>
            {labels.firstName}
          </Label>
          <Input
            id="signup-first-name"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            required
            className={fieldControl}
            autoComplete="given-name"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="signup-last-name" className={AUTH_FIELD_LABEL_CLASS}>
            {labels.lastName}
          </Label>
          <Input
            id="signup-last-name"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            required
            className={fieldControl}
            autoComplete="family-name"
          />
        </div>
      </div>

      <NationalitySelect
        id="signup-nationality"
        label={labels.nationality}
        value={nationality}
        onChange={onNationalityChange}
        placeholder={labels.nationalityPlaceholder}
        required
        labelClassName={AUTH_FIELD_LABEL_CLASS}
        selectClassName={cn(fieldSelect, "px-4")}
      />

      <div className="grid grid-cols-2 items-end gap-3">
        <BirthDateInput
          id="signup-birth"
          label={labels.birthDate}
          value={birthDate}
          onChange={(e) => onBirthDateChange(e.target.value)}
          required
          labelClassName={pairedFieldLabelClass}
          className={cn(fieldControl, "px-3")}
        />

        <div className="flex min-w-0 flex-col justify-end">
          <Label htmlFor="signup-gender" className={pairedFieldLabelClass}>
            {labels.gender}
          </Label>
          <div className="relative min-w-0">
            <select
              id="signup-gender"
              className={cn(fieldSelect, "px-3")}
              value={gender}
              onChange={(e) => onGenderChange(e.target.value as UserGender | "")}
              required
            >
              <option value="">{labels.genderPlaceholder}</option>
              <option value="male">{labels.genderMale}</option>
              <option value="female">{labels.genderFemale}</option>
              <option value="other">{labels.genderOther}</option>
            </select>
            <ChevronDown className={selectChevronClass} aria-hidden />
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800" />

      <div className="min-w-0">
        <Label htmlFor="signup-email" className={AUTH_FIELD_LABEL_CLASS}>
          {labels.email}
        </Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          aria-invalid={Boolean(emailError)}
          className={cn(
            fieldControl,
            emailError && "border-red-400 focus:border-red-500 focus:ring-red-500/30",
          )}
          autoComplete="email"
        />
        {emailError ? (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{emailError}</p>
        ) : null}
      </div>

      <div className="min-w-0">
        <Label htmlFor="signup-password" className={AUTH_FIELD_LABEL_CLASS}>
          {labels.password}
        </Label>
        <div className="relative min-w-0">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            minLength={APP_PASSWORD_MIN_LENGTH}
            className={cn(fieldControl, "pr-12")}
            autoComplete="new-password"
          />
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            hideLabel={tAria("hidePassword")}
            showLabel={tAria("showPassword")}
          />
        </div>
        {passwordHint ? (
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{passwordHint}</p>
        ) : null}
      </div>

      <div className="min-w-0">
        <Label htmlFor="signup-confirm-password" className={AUTH_FIELD_LABEL_CLASS}>
          {labels.confirmPassword}
        </Label>
        <div className="relative min-w-0">
          <Input
            id="signup-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            required
            aria-invalid={passwordMismatch}
            className={cn(
              fieldControl,
              "pr-12",
              passwordMismatch && "border-red-400 focus:border-red-500 focus:ring-red-500/30",
            )}
            autoComplete="new-password"
          />
          <PasswordToggle
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((v) => !v)}
            hideLabel={tAria("hidePassword")}
            showLabel={tAria("showPassword")}
          />
        </div>
        {passwordMismatch ? (
          <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">{labels.passwordMismatch}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SignupFormAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  if (tone === "error") {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-snug text-red-800 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-200"
      >
        {children}
      </p>
    );
  }
  return (
    <div
      role="status"
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-normal leading-relaxed text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-100"
    >
      {children}
    </div>
  );
}

function SignupMarketingColumn({
  headline,
  subline,
  features,
}: {
  headline: ReactNode;
  subline?: ReactNode;
  features: SignupMarketingFeature[];
}) {
  return (
    <aside
      className={cn(
        "relative flex w-full min-w-0 flex-col justify-start border-b border-zinc-200 bg-transparent px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-7 dark:border-zinc-800/50",
        "lg:w-[44%] lg:max-w-xl lg:shrink-0 lg:border-b-0 lg:px-10 lg:pb-12 lg:pt-10 xl:px-12",
      )}
    >
      <div className="relative z-10 mx-auto w-full max-w-lg lg:mx-0">
        <BrandLogo
          href="/"
          priority
          className="min-h-[44px] touch-manipulation"
          imgClassName="h-9 sm:h-10 lg:h-11"
        />
        <h2 className="mt-6 max-w-lg font-display text-[1.55rem] font-bold leading-snug tracking-tight text-zinc-900 sm:mt-7 sm:text-3xl lg:mt-7 lg:text-[2.35rem] lg:leading-tight dark:text-white">
          {headline}
        </h2>
        {subline ? (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-500 sm:mt-4">
            {subline}
          </p>
        ) : null}
        <ul className="mt-7 space-y-6 sm:mt-8 sm:space-y-7 lg:mt-10 lg:space-y-9">
          {features.map((f) => {
            const Icon = FEATURE_ICONS[f.icon];
            return (
              <li key={f.title} className="flex gap-3 sm:gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 sm:h-10 sm:w-10 dark:bg-accent/15 dark:text-orange-300 dark:ring-accent/25">
                  <Icon className="h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">{f.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

export type PublicSignupTemplateProps = {
  roleBadge?: ReactNode;
  headline: ReactNode;
  subline?: ReactNode;
  features: SignupMarketingFeature[];
  title: ReactNode;
  intro: ReactNode;
  backLabel?: ReactNode;
  backHref?: string;
  secondaryLabel?: ReactNode;
  secondaryHref?: string;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Public signup: two columns at `lg+`, stacked on mobile.
 * Light / dark colors follow `html.dark` (theme / system preference).
 */
export function PublicSignupTemplate({
  roleBadge,
  headline,
  subline,
  features,
  title,
  intro,
  backLabel,
  backHref = "/",
  secondaryLabel,
  secondaryHref = "/login",
  footer,
  children,
}: PublicSignupTemplateProps) {
  const showBack = backLabel != null;
  const showSecondary = secondaryLabel != null;
  const showTopBar = showBack || showSecondary;
  const showRoleBadge = roleBadge != null;
  return (
    <div className="signup-page relative min-h-dvh overflow-x-hidden overflow-y-auto bg-zinc-50 text-zinc-900 dark:bg-[#060606] dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-100/25 via-transparent to-zinc-50 dark:from-zinc-900/30 dark:via-transparent dark:to-[#060606]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-3 pb-1 sm:px-5 sm:pb-2 lg:flex-row lg:items-start lg:pl-6 lg:pr-0 xl:pl-8 xl:pr-0">
        <SignupMarketingColumn headline={headline} subline={subline} features={features} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col items-end justify-start px-0 pb-10 pt-4 pl-0 pr-[max(0px,env(safe-area-inset-right,0px))] sm:pb-12 sm:pt-5 lg:flex-row lg:items-start lg:justify-end lg:pb-14 lg:pl-8 lg:pt-8 xl:pl-10">
          <div className="min-w-0 w-[min(100%,42rem)] sm:w-[min(100%,48rem)] lg:w-[min(100%,56rem)] xl:w-[min(100%,64rem)]">
            {showTopBar ? (
              <div
                className={cn(
                  "mb-4 flex items-center gap-2 rounded-xl border p-1.5 sm:mb-5",
                  "border-zinc-200 bg-white/90 dark:border-zinc-800/90 dark:bg-zinc-900/40",
                  showBack && showSecondary ? "justify-between" : "justify-start",
                )}
              >
                {showBack ? (
                  <Link
                    href={backHref}
                    className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 touch-manipulation transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    {backLabel}
                  </Link>
                ) : null}
                {showSecondary ? (
                  <Link
                    href={secondaryHref}
                    className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold text-accent touch-manipulation transition hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
                  >
                    {secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                "rounded-2xl border border-court/10 p-4 shadow-lg sm:p-7 md:p-8",
                "bg-white/95 shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-800/90 dark:bg-zinc-900/75 dark:shadow-2xl dark:shadow-black/50 dark:backdrop-blur-xl",
              )}
            >
              {showRoleBadge ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
                  <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-400">
                    {roleBadge}
                  </span>
                </div>
              ) : null}
              <h1 className="font-display text-xl font-bold tracking-tight text-court sm:text-[1.65rem] dark:text-white">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">{intro}</p>
              <div className="mt-6 sm:mt-8">{children}</div>
            </div>

            {footer ? (
              <div className="mt-6 text-center text-sm text-zinc-600 sm:mt-8 dark:text-zinc-500">{footer}</div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
