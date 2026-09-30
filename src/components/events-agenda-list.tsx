"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { EventScheduleCard } from "@/components/events/event-schedule-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScheduleDaySection, ScheduleEmpty, rowMatchesDateFilter } from "@/components/schedule/schedule-timeline";
import { AppDateRangePicker, EMPTY_DATE_FILTER, type ScheduleDateFilter } from "@/components/schedule/app-date-range-picker";
import { ListSearchField, ListToolbar, applyEventListSearch } from "@/components/list-search-field";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isSubstantialVenueText, pageTitleClass, tSafe } from "@/lib/utils";
import {
  EVENT_TYPE_I18N_KEY,
  eventPublicKey,
  foldEventSearch,
  formatEventDayHeading,
  groupEventsByDate,
  isClubEventClosed,
  sortEventsByDateTimeDesc,
} from "@/lib/events-shared";
import type { EventItem } from "@/lib/types";
import { useLocale, useTranslations } from "next-intl";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { hasAdminPrivileges } from "@/lib/role-utils";
import { MoreVertical } from "lucide-react";

type Variant = "admin" | "coach";

export function EventsAgendaList({
  variant = "admin",
  createHref,
}: {
  variant?: Variant;
  createHref?: string;
}) {
  const admin = variant === "admin";
  const t = useTranslations("ClubEvents");
  const tProg = useTranslations("StudentSchedule");
  const locale = useLocale();
  const intlLocale = appLocaleToIntlLocale(locale);
  const { events, eventSignups, removeEvent, user } = useAuth();
  const router = useRouter();
  const listRootRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<ScheduleDateFilter>(EMPTY_DATE_FILTER);
  const canManage = Boolean(user && hasAdminPrivileges(user.role));
  const participantsHref = (ev: EventItem) =>
    admin
      ? `/admin/events/${encodeURIComponent(eventPublicKey(ev))}/participants`
      : `/coach/events/${encodeURIComponent(eventPublicKey(ev))}/participants`;
  const editHref = (ev: EventItem) => `/admin/events/${encodeURIComponent(eventPublicKey(ev))}/edit`;
  const pageIntro = (admin ? t("agendaSubtitleAdmin") : t("agendaSubtitleCoach")).trim();

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const sortedEvents = useMemo(() => sortEventsByDateTimeDesc(events), [events]);
  const filteredEvents = useMemo(
    () => sortedEvents.filter((ev) => rowMatchesDateFilter(ev.date, dateFilter)),
    [sortedEvents, dateFilter],
  );
  const byDate = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  const signupCountByEvent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of eventSignups) {
      counts.set(s.eventId, (counts.get(s.eventId) ?? 0) + 1);
    }
    return counts;
  }, [eventSignups]);

  const venueLine = (ev: EventItem) => {
    if (ev.venue?.trim()) return ev.venue.trim();
    if (isSubstantialVenueText(ev.address)) return ev.address.trim();
    return "";
  };

  return (
    <>
      <ConfirmDialog
        open={pendingDeleteId != null}
        tone="danger"
        title={t("delete")}
        description={t("deleteConfirm")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) removeEvent(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />

      <div className="min-w-0 space-y-6 sm:space-y-8">
        <div className="min-w-0">
          <h1 className={`${pageTitleClass} text-zinc-900 dark:text-zinc-50`}>
            {t("agendaTitle")}
          </h1>
          {pageIntro ? <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{pageIntro}</p> : null}
        </div>

        <ListToolbar
          leading={
            <ListSearchField
              placeholder={t("searchPlaceholder")}
              onQueryChange={(next) => {
                const root = listRootRef.current;
                if (root) applyEventListSearch(root, next);
              }}
            />
          }
          trailing={
            <>
              <AppDateRangePicker
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                intlLocale={intlLocale}
                selectDateLabel={tProg("selectDate")}
                clearDateLabel={tProg("clearDate")}
                dateRangeHint={tProg("dateRangeHint")}
              />
              {createHref ? (
                <Button asChild className="h-10 min-h-10 shrink-0 rounded-lg px-4 shadow-md">
                  <Link href={createHref}>{t("createEvent")}</Link>
                </Button>
              ) : null}
            </>
          }
        />

        {sortedEvents.length === 0 ? (
          <ScheduleEmpty title={tSafe(t, "emptyTitle", "emptyList")} description={t("agendaEmptyHint")} />
        ) : filteredEvents.length === 0 ? (
          <ScheduleEmpty title={tSafe(tProg, "emptyFilteredTitle", "emptyFiltered")} description={tProg("emptyFiltered")} />
        ) : (
          <div ref={listRootRef}>
            <div data-event-search-empty="" hidden>
              <ScheduleEmpty title={tSafe(t, "emptySearchTitle", "emptySearch")} description={t("emptySearch")} />
            </div>
            <div data-event-search-list="" className="space-y-10">
              {byDate.map(({ date, items }) => (
                <div key={date} data-event-day="">
                  <ScheduleDaySection heading={formatEventDayHeading(date, locale)}>
                    {items.map((ev) => {
                      const closed = isClubEventClosed(ev, nowMs);
                      const venue = venueLine(ev);
                      const lines = [
                        venue,
                        t("joinedCount", { count: signupCountByEvent.get(ev.id) ?? 0 }),
                      ].filter(Boolean);
                      return (
                        <EventScheduleCard
                          key={ev.id}
                          event={ev}
                          searchHay={foldEventSearch(`${ev.title} ${ev.description} ${ev.venue} ${ev.address}`)}
                          kindLabel={tProg("kindEvent")}
                          typeLabel={t(EVENT_TYPE_I18N_KEY[ev.type])}
                          statusLabel={closed ? t("statusClosed") : t("statusOpen")}
                          statusClosed={closed}
                          lines={lines}
                          onOpen={() => router.push(participantsHref(ev))}
                          hideActionsOnMobile
                          actions={
                            <EventRowMenu
                              open={menuEventId === ev.id}
                              onOpenChange={(next) => setMenuEventId(next ? ev.id : null)}
                              actionsLabel={t("rowActionsAria")}
                              participantsLabel={t("viewEvent")}
                              participantsHref={participantsHref(ev)}
                              editLabel={canManage ? t("adjustTime") : undefined}
                              editHref={canManage ? editHref(ev) : undefined}
                              deleteLabel={canManage ? t("delete") : undefined}
                              onDelete={canManage ? () => setPendingDeleteId(ev.id) : undefined}
                            />
                          }
                        />
                      );
                    })}
                  </ScheduleDaySection>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function EventRowMenu({
  open,
  onOpenChange,
  actionsLabel,
  participantsLabel,
  participantsHref,
  editLabel,
  editHref,
  deleteLabel,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionsLabel: string;
  participantsLabel: string;
  participantsHref: string;
  editLabel?: string;
  editHref?: string;
  deleteLabel?: string;
  onDelete?: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const menuWidth = 176;

  const updatePos = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 6,
      left: Math.max(8, Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (btnRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, onOpenChange, updatePos]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const menu =
    open && portalTarget
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[9999] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: menuWidth,
              visibility: pos != null ? "visible" : "hidden",
            }}
          >
            <Link
              href={participantsHref}
              role="menuitem"
              className="block px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
            >
              {participantsLabel}
            </Link>
            {editLabel && editHref ? (
              <Link
                href={editHref}
                role="menuitem"
                className="block px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => onOpenChange(false)}
              >
                {editLabel}
              </Link>
            ) : null}
            {deleteLabel && onDelete ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                {deleteLabel}
              </button>
            ) : null}
          </div>,
          portalTarget,
        )
      : null;

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        type="button"
        aria-label={actionsLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        onClick={() => onOpenChange(!open)}
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>
      {menu}
    </div>
  );
}
