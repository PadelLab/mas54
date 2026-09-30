"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Shield,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Setup = { secretFormatted: string; otpauthUrl: string; qrDataUrl: string };
type WizardStep = "method" | "scan" | "verify";

const STEPS: WizardStep[] = ["method", "scan", "verify"];
const CTA = "h-11 min-h-[44px] rounded-xl px-5";

export function TwoFactorSettings() {
  const t = useTranslations("Settings");
  const { user, refresh } = useAuth();
  const enabled = Boolean(user?.twoFactorEnabled);
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [step, setStep] = useState<WizardStep>("method");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "codes" | null>(null);

  const mapErr = (message?: string) => {
    if (message === "PASSWORD_INCORRECT") return t("twoFactorPasswordIncorrect");
    if (message === "INVALID_CODE") return t("twoFactorInvalidCode");
    if (message === "NO_PENDING") return t("twoFactorNoPending");
    return t("twoFactorError");
  };

  const flashCopied = (kind: "key" | "codes") => {
    setCopied(kind);
    window.setTimeout(() => setCopied((cur) => (cur === kind ? null : cur)), 1600);
  };

  const copyText = async (value: string, kind: "key" | "codes") => {
    try {
      await navigator.clipboard.writeText(value);
      flashCopied(kind);
    } catch {
      /* ignore */
    }
  };

  const onStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setup) {
      setStep("scan");
      setErr(null);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/start", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as Setup & { ok?: boolean; message?: string };
      if (!res.ok || data.ok === false) {
        setErr(mapErr(data.message));
        return;
      }
      setSetup({
        secretFormatted: data.secretFormatted,
        otpauthUrl: data.otpauthUrl,
        qrDataUrl: data.qrDataUrl,
      });
      setStep("scan");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; backupCodes?: string[] };
      if (!res.ok || data.ok === false) {
        setErr(mapErr(data.message));
        return;
      }
      setBackupCodes(data.backupCodes ?? []);
      setSetup(null);
      setCode("");
      setStep("method");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onDisable = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || data.ok === false) {
        setErr(mapErr(data.message));
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const digits = code.replace(/\D/g, "").slice(0, 6);
  const inWizard = !enabled && !backupCodes;
  const showEnabled = enabled && !backupCodes;

  return (
    <section className="surface-card overflow-hidden p-5 sm:p-6 md:p-8">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            showEnabled
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
          )}
        >
          {showEnabled ? <ShieldCheck className="h-5 w-5" aria-hidden /> : <Shield className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t("twoFactorTitle")}
            </h2>
            {showEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {t("twoFactorEnabledBadge")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t("twoFactorSubtitle")}</p>
        </div>
      </div>

      {inWizard ? (
        <WizardStepper
          current={step}
          labels={[t("twoFactorStepMethod"), t("twoFactorStepScan"), t("twoFactorStepVerify")]}
          stepProgress={t("twoFactorStepProgress", {
            current: STEPS.indexOf(step) + 1,
            total: STEPS.length,
          })}
        />
      ) : null}

      {err ? (
        <p
          className="mt-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {err}
        </p>
      ) : null}

      {backupCodes ? (
        <SuccessPanel
          codes={backupCodes}
          copied={copied === "codes"}
          onCopy={() => copyText(backupCodes.join("\n"), "codes")}
          onDownload={() => downloadBackupCodes(backupCodes)}
          onDone={() => setBackupCodes(null)}
        />
      ) : enabled ? (
        <EnabledPanel busy={busy} onDisable={onDisable} />
      ) : step === "scan" && setup ? (
        <ScanStep
          setup={setup}
          copied={copied === "key"}
          busy={busy}
          onCopy={() => copyText(setup.secretFormatted.replace(/\s/g, ""), "key")}
          onBack={() => {
            setStep("method");
            setErr(null);
          }}
          onNext={() => {
            setStep("verify");
            setErr(null);
          }}
        />
      ) : step === "verify" && setup ? (
        <form onSubmit={onConfirm} className="mt-7 space-y-6">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
              <KeyRound className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">{t("twoFactorVerifyTitle")}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{t("twoFactorVerifyHint")}</p>
          </div>
          <OtpBoxes
            id="two-factor-confirm"
            label={t("twoFactorCodeLabel")}
            value={digits}
            invalid={Boolean(err)}
            onChange={(next) => {
              setCode(next);
              setErr(null);
            }}
          />
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">{t("twoFactorCodeRefresh")}</p>
          <ActionRow
            busy={busy}
            backLabel={t("twoFactorBack")}
            nextLabel={t("twoFactorVerifyEnable")}
            nextDisabled={digits.length < 6}
            nextType="submit"
            onBack={() => {
              setStep("scan");
              setErr(null);
            }}
          />
        </form>
      ) : (
        <form onSubmit={onStart} className="mt-7 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t("twoFactorChooseMethod")}</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("twoFactorChooseMethodHint")}</p>
          </div>
          <div className="relative rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 sm:p-5">
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-600">
              {t("twoFactorRecommended")}
            </span>
            <div className="flex items-start gap-3.5 pr-24">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-600">
                <Smartphone className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{t("twoFactorAppTitle")}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t("twoFactorAppDesc")}</p>
              </div>
            </div>
          </div>
          <ActionRow
            busy={busy}
            nextLabel={t("twoFactorContinue")}
            nextType="submit"
          />
        </form>
      )}
    </section>
  );
}

function WizardStepper({
  current,
  labels,
  stepProgress,
}: {
  current: WizardStep;
  labels: string[];
  stepProgress: string;
}) {
  const currentIdx = STEPS.indexOf(current);
  const progressPct = ((currentIdx + 1) / STEPS.length) * 100;
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{stepProgress}</p>
        <span className="text-xs tabular-nums text-zinc-400">{Math.round(progressPct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-court to-accent transition-[width] duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((id, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <span
              key={id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                active && "bg-white font-semibold text-zinc-900 ring-1 ring-accent dark:bg-zinc-950 dark:text-zinc-50",
                done && !active && "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
                !done && !active && "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done && "bg-emerald-500 text-white",
                  active && "bg-accent text-white",
                  !done && !active && "bg-zinc-300 text-white dark:bg-zinc-600",
                )}
                aria-hidden
              >
                {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : idx + 1}
              </span>
              {labels[idx]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function OtpBoxes({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const caret = Math.min(value.length, 5);

  return (
    <div className="relative mx-auto w-full max-w-[22rem]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={6}
        className="absolute inset-0 z-10 cursor-text opacity-0"
      />
      <div className="flex justify-center gap-1.5 sm:gap-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && i === caret && value.length < 6;
          return (
            <span
              key={i}
              className={cn(
                "flex h-12 w-10 items-center justify-center rounded-xl text-lg font-semibold tabular-nums transition-colors sm:h-14 sm:w-11",
                invalid
                  ? "bg-red-50 text-red-800 ring-1 ring-red-300 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                  : "bg-zinc-50 text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-600",
                active && !invalid && "ring-2 ring-zinc-900 dark:ring-zinc-100",
                value[i] && !invalid && "bg-white dark:bg-zinc-900",
              )}
            >
              {value[i] ?? ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ActionRow({
  busy,
  backLabel,
  nextLabel,
  nextDisabled,
  nextType = "button",
  onBack,
  onNext,
}: {
  busy: boolean;
  backLabel?: string;
  nextLabel: string;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
  onBack?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className={cn("grid gap-2", backLabel ? "grid-cols-2" : "grid-cols-1")}>
      {backLabel && onBack ? (
        <Button type="button" variant="outline" className={cn(CTA, "w-full")} disabled={busy} onClick={onBack}>
          {backLabel}
        </Button>
      ) : null}
      <Button
        type={nextType}
        className={cn(CTA, "w-full")}
        disabled={busy || nextDisabled}
        onClick={nextType === "button" ? onNext : undefined}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {nextLabel}
      </Button>
    </div>
  );
}

function ScanStep({
  setup,
  copied,
  busy,
  onCopy,
  onBack,
  onNext,
}: {
  setup: Setup;
  copied: boolean;
  busy: boolean;
  onCopy: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("Settings");
  return (
    <div className="mt-7 space-y-5">
      <div className="text-center">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t("twoFactorScanTitle")}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{t("twoFactorScanHint")}</p>
      </div>
      <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={setup.qrDataUrl}
          alt={t("twoFactorScanTitle")}
          width={196}
          height={196}
          className="h-[196px] w-[196px] rounded-lg bg-white"
        />
      </div>
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t("twoFactorManualKey")}</p>
        <div className="mt-2 flex items-center gap-1 rounded-xl bg-zinc-50 py-1 pl-3 pr-1 ring-1 ring-zinc-200 dark:bg-zinc-800/70 dark:ring-zinc-600">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] tracking-wider text-zinc-800 dark:text-zinc-100">
            {setup.secretFormatted}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
            aria-label={t("twoFactorCopy")}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("twoFactorCopied") : t("twoFactorCopy")}
          </button>
        </div>
      </div>
      <ActionRow busy={busy} backLabel={t("twoFactorBack")} nextLabel={t("twoFactorScanned")} onBack={onBack} onNext={onNext} />
    </div>
  );
}

function SuccessPanel({
  codes,
  copied,
  onCopy,
  onDownload,
  onDone,
}: {
  codes: string[];
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("Settings");
  return (
    <div className="mt-7 space-y-5">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("twoFactorEnabledTitle")}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{t("twoFactorEnabledBody")}</p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/40 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <KeyRound className="h-4 w-4 text-orange-500" aria-hidden />
          {t("twoFactorBackupTitle")}
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("twoFactorBackupIntro")}</p>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {codes.map((c) => (
            <li
              key={c}
              className="rounded-xl bg-white px-2 py-2.5 text-center font-mono text-[12px] font-semibold tracking-wide text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700"
            >
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className={CTA} onClick={onCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("twoFactorCopied") : t("twoFactorBackupCopy")}
          </Button>
          <Button type="button" variant="outline" className={CTA} onClick={onDownload}>
            <Download className="h-4 w-4" />
            {t("twoFactorBackupDownload")}
          </Button>
        </div>
      </div>
      <Button type="button" className={cn(CTA, "w-full")} onClick={onDone}>
        {t("twoFactorBackupDone")}
      </Button>
    </div>
  );
}

function EnabledPanel({ busy, onDisable }: { busy: boolean; onDisable: () => void }) {
  const t = useTranslations("Settings");
  return (
    <div className="mt-6 space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{t("twoFactorActiveMethod")}</p>
        <div className="mt-2 flex items-start gap-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/30">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-600">
            <Smartphone className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
              {t("twoFactorAppTitle")}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t("twoFactorActiveHint")}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/90 px-4 py-3.5 dark:border-orange-900/50 dark:bg-orange-950/25">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("twoFactorBackupReminder")}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("twoFactorBackupReminderBody")}</p>
        </div>
      </div>
      <Button type="button" variant="outline" className={cn(CTA, "w-full")} disabled={busy} onClick={onDisable}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {t("twoFactorDisable")}
      </Button>
    </div>
  );
}

function downloadBackupCodes(codes: string[]) {
  const blob = new Blob([`${codes.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "padel-lab-codigos-2fa.txt";
  a.click();
  URL.revokeObjectURL(url);
}
