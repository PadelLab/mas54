"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useAuth } from "@/contexts/auth-context";
import { ParticipantPersonalFields } from "@/components/events/participant-personal-fields";
import { ScheduleEmpty } from "@/components/schedule/schedule-timeline";
import { EVENT_TYPE_I18N_KEY, findEventByPublicKey, isClubEventClosed } from "@/lib/events-shared";
import { appLocaleToIntlLocale, formatDaySectionTitle, formatHm24 } from "@/lib/schedule-date";
import { pageTitleClass, tSafe } from "@/lib/utils";
import type { User } from "@/lib/types";
import { useLocale, useTranslations } from "next-intl";

type Variant = "admin" | "coach";

const PAGE_WRAP = "w-full space-y-8 animate-fade-slide";

export function EventParticipantsView({
  variant: _variant,
  eventId,
  agendaPath,
}: {
  variant: Variant;
  eventId: string;
  agendaPath: string;
}) {
  const t = useTranslations("ClubEvents");
  const tProg = useTranslations("StudentSchedule");
  const tProfile = useTranslations("Profile");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const { user, hydrated, events, eventSignups, users } = useAuth();
  const [selected, setSelected] = useState<User | null>(null);

  const existing = useMemo(() => findEventByPublicKey(events, eventId), [events, eventId]);

  const participants = useMemo(() => {
    if (!existing) return [];
    return eventSignups
      .filter((s) => s.eventId === existing.id)
      .map((s) => users.find((x) => x.id === s.userId))
      .filter((u): u is User => Boolean(u))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [existing, eventSignups, users]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  if (!user) return null;

  if (!hydrated) {
    return (
      <div className={PAGE_WRAP}>
        <p className="text-sm text-court/60">{t("loadingEvent")}</p>
      </div>
    );
  }

  if (!eventId || !existing) {
    return (
      <div className={PAGE_WRAP}>
        <AppBreadcrumb items={[{ href: agendaPath, label: t("agendaTitle") }, { label: t("eventNotFound") }]} />
        <p className="text-sm text-court/60">{t("eventNotFound")}</p>
      </div>
    );
  }

  const closed = isClubEventClosed(existing);
  const createdBy = users.find((u) => u.id === existing.createdBy)?.name?.trim() ?? "";

  return (
    <div className={PAGE_WRAP}>
      <div>
        <AppBreadcrumb items={[{ href: agendaPath, label: t("agendaTitle") }, { label: t("formSectionTitle") }]} />
        <h1 className={`${pageTitleClass} text-court`}>{existing.title}</h1>
      </div>

      <section className="surface-card space-y-5 bg-white p-5 shadow-sm backdrop-blur-none dark:bg-zinc-900 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {t("formSectionTitle")}
        </h2>
        <EventDetailField label={t("typeLabel")} value={t(EVENT_TYPE_I18N_KEY[existing.type])} />
        <EventDetailField label={t("descriptionLabel")} value={existing.description?.trim() ?? ""} multiline />
        <EventDetailField label={t("timeLabel")} value={formatHm24(existing.time)} />
        <EventDetailField label={t("dateLabel")} value={formatDaySectionTitle(existing.date, intlLocale)} />
        <EventDetailField label={t("venueLabel")} value={existing.venue?.trim() ?? ""} />
        <EventDetailField label={t("addressLabel")} value={existing.address?.trim() ?? ""} />
        <EventDetailField label={t("statusLabel")} value={closed ? t("statusClosed") : t("statusOpen")} />
        <EventDetailField label={tProg("detail.eventCreatedBy")} value={createdBy} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200 sm:text-base">
            {t("participantsSectionTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t("participantsSectionHint")}</p>
        </div>

        {participants.length === 0 ? (
          <ScheduleEmpty
            title={tSafe(t, "pageParticipantsEmptyTitle", "pageParticipantsEmpty")}
            description={t("pageParticipantsEmpty")}
            className="bg-white backdrop-blur-none dark:bg-zinc-900"
          />
        ) : (
          <ul className="space-y-3">
            {participants.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  className="surface-card flex w-full items-center gap-3 p-3 text-left shadow-sm outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-orange-500/40 sm:gap-4 sm:p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-sm font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (p.name || "?").charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-zinc-500 dark:text-zinc-400">{p.email}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                aria-label={tProg("detail.closeOverlay")}
                onClick={() => setSelected(null)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-participant-title"
                className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-xl flex-col rounded-t-2xl border border-zinc-200/90 bg-white shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 sm:rounded-2xl"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-700 sm:px-6">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold normal-case tracking-normal text-zinc-400 dark:text-zinc-500">
                      {tProfile("personalTitle")}
                    </p>
                    <h2
                      id="event-participant-title"
                      className="font-display text-lg font-bold leading-snug text-zinc-900 dark:text-zinc-50"
                    >
                      {selected.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    onClick={() => setSelected(null)}
                    aria-label={tProg("detail.closeOverlay")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  <ParticipantPersonalFields person={selected} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function EventDetailField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold normal-case tracking-normal text-zinc-400 dark:text-zinc-500">{label}</p>
      <p
        className={
          multiline
            ? "mt-1.5 whitespace-pre-wrap text-sm font-medium leading-relaxed text-zinc-950 dark:text-zinc-100"
            : "mt-1.5 text-sm font-medium text-zinc-950 dark:text-zinc-100"
        }
      >
        {value}
      </p>
    </div>
  );
}
