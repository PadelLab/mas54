"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleUser, KeyRound, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProfileEditScreen } from "@/components/profile/profile-edit-screen";
import { ProfileIdentityCard } from "@/components/profile/profile-identity-card";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";
import { processAvatarForStorage } from "@/lib/profile-image";

export function MyAccountScreen() {
  const t = useTranslations("Settings");
  const tProfile = useTranslations("Profile");
  const tDialog = useTranslations("ConfirmDialog");
  const { user, deleteOwnAccount, updateProfile } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  if (!user) return null;

  const mapDeleteError = (message?: string) => {
    if (message === "LAST_ADMIN") return t("accountDeleteLastAdmin");
    return message ?? t("accountDeleteFailed");
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await processAvatarForStorage(file);
      await updateProfile(user.id, { avatarUrl: url });
      setAvatarMsg(tProfile("msgAvatar"));
      setTimeout(() => setAvatarMsg(null), 3200);
    } catch {
      setAvatarMsg(tProfile("msgAvatarError"));
      setTimeout(() => setAvatarMsg(null), 4000);
    }
    e.target.value = "";
  };

  const onDelete = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await deleteOwnAccount();
      if (!res.ok) {
        setErr(mapDeleteError(res.message));
        setConfirmOpen(false);
        return;
      }
      router.replace("/");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-full min-w-0 animate-fade-slide flex-col gap-6 pb-8 md:gap-8">
      <ProfileIdentityCard
        user={user}
        onAvatar={onAvatar}
        roleLabel={tProfile(`roles.${user.role}`)}
        showEmail
        message={avatarMsg}
      />

      <section className="surface-card overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CircleUser className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t("accountPersonalTitle")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("accountPersonalSubtitle")}</p>
          </div>
        </div>
        <ProfileEditScreen embedded />
      </section>

      <section className="surface-card overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t("accountPasswordTitle")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("accountPasswordSubtitle")}</p>
          </div>
        </div>
        <PasswordChangeForm />
      </section>

      <TwoFactorSettings />

      <section className="overflow-hidden rounded-3xl border border-red-200/80 bg-white p-5 shadow-lg shadow-zinc-900/[0.03] sm:p-6 md:p-8 dark:border-red-900/40 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
            <Trash2 className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t("accountDangerTitle")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t("accountDangerSubtitle")}
            </p>
          </div>
        </div>
        {err ? (
          <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-5 h-11 rounded-xl bg-red-600 bg-none font-semibold shadow-red-600/25 hover:bg-red-700 hover:brightness-110"
          disabled={busy}
          onClick={() => {
            setErr(null);
            setConfirmOpen(true);
          }}
        >
          {t("accountDelete")}
        </Button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        title={t("accountDeleteConfirmTitle")}
        description={t("accountDeleteConfirm")}
        confirmLabel={busy ? t("accountDeleteBusy") : t("accountDelete")}
        cancelLabel={tDialog("cancel")}
        confirmDisabled={busy}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={() => {
          void onDelete();
        }}
      />
    </div>
  );
}
