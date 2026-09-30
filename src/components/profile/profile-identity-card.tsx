"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import type { User } from "@/lib/types";
import { ProfileCoverBanner } from "@/components/profile/profile-cover-banner";

export function ProfileIdentityCard({
  user,
  onAvatar,
  roleLabel,
  accessUntil,
  showEmail = false,
  hint,
  message,
  canChangeAvatar = true,
}: {
  user: User;
  onAvatar: (e: React.ChangeEvent<HTMLInputElement>) => void;
  roleLabel: string;
  accessUntil?: string | null;
  showEmail?: boolean;
  hint?: string | null;
  message?: string | null;
  canChangeAvatar?: boolean;
}) {
  const t = useTranslations("Profile");

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.15)] ring-1 ring-zinc-950/[0.04] dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-zinc-800/30">
      <div className="relative h-36 overflow-hidden sm:h-44 md:h-48">
        <ProfileCoverBanner className="absolute inset-0" />
      </div>

      <div className="relative bg-white px-4 pb-8 pt-0 sm:px-8 md:px-10 md:pb-10 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6 md:gap-8">
          <label
            className={`relative -mt-16 block h-[7.5rem] w-[7.5rem] shrink-0 sm:-mt-[4.5rem] sm:h-32 sm:w-32 md:-mt-20 md:h-36 md:w-36 ${canChangeAvatar ? "cursor-pointer" : ""}`}
            title={canChangeAvatar ? t("avatarChange") : undefined}
            aria-label={canChangeAvatar ? t("avatarChange") : undefined}
          >
            {canChangeAvatar ? (
              <input type="file" accept="image/*" className="sr-only" onChange={onAvatar} />
            ) : null}
            <span className="absolute inset-0 overflow-hidden rounded-2xl border-[4px] border-white bg-zinc-100 shadow-xl shadow-zinc-900/15 transition hover:brightness-[1.03] dark:border-zinc-800 dark:bg-zinc-800 md:rounded-[1.15rem]">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="pointer-events-none h-full w-full object-cover"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <span className="pointer-events-none flex h-full w-full items-center justify-center font-display text-4xl font-bold text-zinc-400 dark:text-zinc-500 sm:text-5xl">
                  {user.name.charAt(0)}
                </span>
              )}
            </span>
            {canChangeAvatar ? (
              <span className="pointer-events-none absolute -bottom-1 -right-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#e85d04] text-white shadow-md ring-2 ring-white dark:ring-zinc-900">
                <Camera className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
          </label>

          <div className="mt-1 flex min-w-0 flex-1 flex-col items-center text-center sm:mt-0 sm:mb-1 sm:items-start sm:text-left">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-[2rem]">
              {user.name}
            </h1>
            {showEmail ? (
              <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100">
                {roleLabel}
              </span>
              {accessUntil ? (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200">
                  {accessUntil}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {hint ? (
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-sm">{hint}</p>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
