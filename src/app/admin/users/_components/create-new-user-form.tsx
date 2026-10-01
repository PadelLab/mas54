"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordToggle } from "@/components/ui/password-toggle";
import { FORM_SUBMIT_BUTTON_CLASS, LIST_CONTROL_CLASS } from "@/components/list-search-field";
import type { CoachAccessRole } from "@/lib/types";
import { translatePasswordPolicyApiMessage } from "@/lib/password-policy";
import { generateTempAlphanumericPassword, isTempAlphanumericPassword } from "@/lib/temp-password";
import { useTranslations } from "next-intl";
import { isValidAppEmail, translateEmailApiMessage } from "@/lib/email-format";
import { Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { NewUserSource } from "./new-user-source";

async function fetchTempPasswordFromApi(): Promise<string> {
  try {
    const res = await fetch("/api/admin/temp-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; tempPassword?: string };
    if (data.ok && typeof data.tempPassword === "string" && isTempAlphanumericPassword(data.tempPassword)) {
      return data.tempPassword;
    }
  } catch {
    /* local fallback */
  }
  return generateTempAlphanumericPassword();
}

const ROLE_VALUES: CoachAccessRole[] = ["coach", "coach_admin", "superadmin"];

function defaultRoleForSource(source: NewUserSource | undefined): CoachAccessRole {
  if (source === "administrators") return "superadmin";
  return "coach";
}

function rolesForSource(source: NewUserSource | undefined): CoachAccessRole[] {
  if (source === "coaches") {
    return ROLE_VALUES.filter((r) => r === "coach" || r === "coach_admin");
  }
  if (source === "administrators") {
    return ROLE_VALUES.filter((r) => r === "superadmin" || r === "coach" || r === "coach_admin");
  }
  return ROLE_VALUES;
}

function listHref(source: NewUserSource | undefined): string {
  if (source === "administrators") return "/admin/users/administrators";
  if (source === "coaches") return "/admin/users/coaches";
  return "/admin/users";
}

const iconBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-0 bg-white/80 text-zinc-600 ring-1 ring-zinc-200/80 transition hover:bg-white hover:text-zinc-900 hover:ring-zinc-300 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white dark:hover:ring-zinc-500";

/** Stops the browser from filling login credentials (email is on the same form). */
export function CreateNewUserForm({
  source,
  onCreated,
}: {
  source?: NewUserSource;
  onCreated?: () => void;
}) {
  const t = useTranslations("AdminNewUserForm");
  const tLogin = useTranslations("Login");
  const tProfile = useTranslations("Profile");
  const { createCoachAccess } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [coachRole, setCoachRole] = useState<CoachAccessRole>(() => defaultRoleForSource(source));
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [emailAutofillGuard, setEmailAutofillGuard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(true);

  const visibleRoles = useMemo(() => rolesForSource(source), [source]);
  const allowedIds = useMemo(() => visibleRoles.map((r) => r), [visibleRoles]);

  useEffect(() => {
    if (!allowedIds.includes(coachRole)) {
      setCoachRole(defaultRoleForSource(source));
    }
  }, [source, coachRole, allowedIds]);

  const regenerate = useCallback(async () => {
    setGenerating(true);
    try {
      setTempPassword(await fetchTempPasswordFromApi());
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    void regenerate();
  }, [regenerate]);

  return (
    <Card>
      {createdMsg ? (
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Check className="h-5 w-5" />
            </span>
            <CardTitle className="mb-0">{t("successTitle")}</CardTitle>
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{createdMsg}</p>
          <Button asChild className={FORM_SUBMIT_BUTTON_CLASS}>
            <Link href={listHref(source)}>{t("successBack")}</Link>
          </Button>
        </div>
      ) : (
      <>
      <CardTitle className="mb-4">{t("cardTitle")}</CardTitle>
      <form
        autoComplete="off"
        onSubmit={async (e) => {
          e.preventDefault();
          setFormErr(null);
          if (!name || !email || !tempPassword) return;
          if (!isValidAppEmail(email)) {
            setFormErr(tProfile("emailInvalid"));
            return;
          }
          setBusy(true);
          const res = await createCoachAccess({ name, email, coachRole, tempPassword });
          setBusy(false);
          if (!res.ok) {
            const policyErr = translatePasswordPolicyApiMessage(res.message, tProfile);
            const emailErr = translateEmailApiMessage(res.message, tProfile);
            setFormErr(policyErr ?? emailErr ?? res.message ?? t("errorCreate"));
            return;
          }
          setCreatedMsg(res.emailSent === false ? t("msgCredentialsFailed") : t("successBody"));
          onCreated?.();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {formErr && <p className="text-sm text-red-600 sm:col-span-2">{formErr}</p>}
        <div>
          <Label htmlFor="padellab-staff-create-name">{t("name")}</Label>
          <Input
            id="padellab-staff-create-name"
            name="padellab-staff-create-name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="padellab-staff-create-email">{t("email")}</Label>
          <Input
            id="padellab-staff-create-email"
            name="padellab-staff-create-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            readOnly={emailAutofillGuard}
            onFocus={() => setEmailAutofillGuard(false)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label>{t("role")}</Label>
          <select
            className={LIST_CONTROL_CLASS}
            value={coachRole}
            onChange={(e) => setCoachRole(e.target.value as CoachAccessRole)}
          >
            {visibleRoles.map((r) => (
              <option key={r} value={r}>
                {r === "coach"
                  ? t("roleCoach")
                  : r === "coach_admin"
                    ? t("roleCoachAdmin")
                    : t("roleAdmin")}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="padellab-staff-create-temp-password">{t("tempPasswordShown")}</Label>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Input
                id="padellab-staff-create-temp-password"
                name="padellab-staff-create-temp-password"
                type={showTempPassword ? "text" : "password"}
                autoComplete="off"
                readOnly
                value={tempPassword}
                className="pr-12 font-mono text-base tracking-wider"
              />
              <PasswordToggle
                visible={showTempPassword}
                onToggle={() => setShowTempPassword((v) => !v)}
                hideLabel={tLogin("hidePassword")}
                showLabel={tLogin("showPassword")}
              />
            </div>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={generating}
              className={iconBtnClass}
              aria-label={t("regeneratePassword")}
              title={t("regeneratePassword")}
            >
              <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <Button type="submit" disabled={busy || generating || !tempPassword} className={`${FORM_SUBMIT_BUTTON_CLASS} sm:col-span-2`}>
          {t("submit")}
        </Button>
      </form>
      </>
      )}
    </Card>
  );
}
