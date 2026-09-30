"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeSelect } from "@/components/ui/time-select";
import { FORM_SUBMIT_BUTTON_CLASS, LIST_CONTROL_CLASS } from "@/components/list-search-field";
import { EVENT_TYPE_I18N_KEY, findEventByPublicKey } from "@/lib/events-shared";
import { appLocaleToIntlLocale, localeDateInputPlaceholder, parseScheduleDate, toYmdLocal } from "@/lib/schedule-date";
import { cn, formatDate, pageTitleClass, tSafe } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { ScheduleEmpty } from "@/components/schedule/schedule-timeline";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EVENT_TYPES, type EventItem } from "@/lib/types";import { hasAdminPrivileges } from "@/lib/role-utils";

type Variant = "admin" | "coach";

const FIELD_LABEL = "mb-1.5 block text-xs font-semibold normal-case tracking-normal";

function Field({
  id,
  label,
  labelClass,
  children,
  className,
}: {
  id: string;
  label: string;
  labelClass: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function NewEventForm({
  variant,
  listPath,
  eventId,
}: {
  variant: Variant;
  listPath: string;
  /** When set, edit form (`updateEvent`). Admin-only on the server. */
  eventId?: string;
}) {
  const admin = variant === "admin";
  const editMode = Boolean(eventId);
  const t = useTranslations("ClubEvents");
  const locale = useLocale();
  const intlLocale = appLocaleToIntlLocale(locale);
  const { user, addEvent, updateEvent, events, eventSignups, users } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(admin ? "14:00" : "10:00");
  const [address, setAddress] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventItem["type"]>(admin ? "tournament" : "clinic");
  const [dateOpen, setDateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const existing = useMemo(
    () => (editMode && eventId ? findEventByPublicKey(events, eventId) : undefined),
    [editMode, eventId, events],
  );

  const editParticipantRows = useMemo(() => {
    if (!editMode || !existing) return [];
    return eventSignups
      .filter((s) => s.eventId === existing.id)
      .map((s) => {
        const u = users.find((x) => x.id === s.userId);
        const label = (u?.name?.trim() || u?.email || s.userId).trim() || s.userId;
        return { userId: s.userId, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [editMode, existing, eventSignups, users]);

  useEffect(() => {
    if (!editMode || !existing) return;
    setTitle(existing.title);
    setDate(existing.date);
    setTime(existing.time);
    setAddress(existing.address ?? "");
    setVenue(existing.venue ?? "");
    setDescription(existing.description ?? "");
    setType(existing.type);
  }, [editMode, existing]);

  const selectedDate = useMemo(() => parseScheduleDate(date) ?? undefined, [date]);
  const datePlaceholder = useMemo(() => localeDateInputPlaceholder(intlLocale), [intlLocale]);

  const h1Class = admin
    ? `${pageTitleClass} text-court dark:text-emerald-100`
    : `${pageTitleClass} text-zinc-900 dark:text-zinc-50`;
  const subClass = admin ? "text-sm text-court/60 dark:text-emerald-200/60" : "text-sm text-zinc-500 dark:text-zinc-400";
  const sectionTitleClass = admin
    ? "text-sm font-semibold text-court dark:text-emerald-200"
    : "text-sm font-semibold text-zinc-800 dark:text-zinc-200";
  const fieldLabelClass = cn(FIELD_LABEL, admin ? "text-court dark:text-zinc-300" : "text-zinc-800 dark:text-zinc-300");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !date || busy) return;
    if (editMode && !existing) return;
    if (!editMode && !hasAdminPrivileges(user.role)) return;
    setBusy(true);
    try {
      if (editMode) {
        await updateEvent(existing!.id, {
          title: title.trim(),
          date,
          time,
          address: address.trim(),
          venue: venue.trim(),
          description: description.trim(),
          type,
        });
      } else {
        await addEvent({
          title: title.trim(),
          date,
          time,
          address: address.trim(),
          venue: venue.trim(),
          description: description.trim(),
          createdBy: user.id,
          type,
        });
      }
      router.push(listPath);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  if (editMode && eventId && !existing) {
    return (
      <div className="w-full space-y-8">
        <AppBreadcrumb
          items={[
            { href: listPath, label: t("agendaTitle") },
            { label: events.length === 0 ? t("loadingEvent") : t("eventNotFound") },
          ]}
        />
        <p className={cn("text-sm", subClass)}>{events.length === 0 ? t("loadingEvent") : t("eventNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <AppBreadcrumb
          items={[
            { href: listPath, label: t("agendaTitle") },
            { label: editMode ? t("pageEditTitle") : t("pageNewTitle") },
          ]}
        />
        <h1 className={h1Class}>{editMode ? t("pageEditTitle") : t("pageNewTitle")}</h1>
        <p className={cn("mt-1 max-w-2xl", subClass)}>
          {editMode ? t("pageEditSubtitle") : admin ? t("pageNewSubtitleAdmin") : t("pageNewSubtitleCoach")}
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <p className={sectionTitleClass}>{t("formSectionTitle")}</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field id="ev-title" label={t("titleLabel")} labelClass={fieldLabelClass}>
                <Input
                  id="ev-title"
                  className={LIST_CONTROL_CLASS}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field id="ev-type" label={t("typeLabel")} labelClass={fieldLabelClass}>
                <Select value={type} onValueChange={(value) => setType(value as EventItem["type"])}>
                  <SelectTrigger id="ev-type" className={cn(LIST_CONTROL_CLASS, "flex items-center justify-between text-left shadow-none")}>
                    <SelectValue placeholder={t("typeLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(EVENT_TYPE_I18N_KEY[value])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field id="ev-venue" label={t("venueLabel")} labelClass={fieldLabelClass}>
              <Input
                id="ev-venue"
                type="text"
                className={LIST_CONTROL_CLASS}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={t("venuePlaceholder")}
                autoComplete="off"
              />
            </Field>

            <Field id="ev-address" label={t("addressLabel")} labelClass={fieldLabelClass}>
              <Input
                id="ev-address"
                type="text"
                className={LIST_CONTROL_CLASS}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                autoComplete="street-address"
              />
            </Field>

            <Field id="ev-description" label={t("descriptionLabel")} labelClass={fieldLabelClass}>
              <Textarea
                id="ev-description"
                className={cn(LIST_CONTROL_CLASS, "h-auto min-h-[120px] py-2.5 leading-normal")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                autoComplete="off"
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field id="ev-date" label={t("dateLabel")} labelClass={fieldLabelClass}>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      id="ev-date"
                      type="button"
                      className={cn(
                        LIST_CONTROL_CLASS,
                        "flex items-center gap-2 text-left",
                        !date && "text-zinc-400",
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {date ? formatDate(date, intlLocale) : datePlaceholder}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(next) => {
                        if (!next) return;
                        setDate(toYmdLocal(next));
                        setDateOpen(false);
                      }}
                      defaultMonth={selectedDate}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field id="ev-time" label={t("timeLabel")} labelClass={fieldLabelClass}>
                <TimeSelect
                  id="ev-time"
                  value={time}
                  onChange={setTime}
                  selectClassName={cn(LIST_CONTROL_CLASS, "flex items-center gap-2 pr-10 shadow-none")}
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 pt-5">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-h-10 rounded-lg px-4 py-0"
              onClick={() => router.push(listPath)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className={FORM_SUBMIT_BUTTON_CLASS}
              disabled={busy || !title.trim() || !date}
            >
              {editMode ? t("saveEvent") : admin ? t("createEvent") : t("publishEvent")}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {editMode && eventId ? (
        <section className="space-y-3">
          <div>
            <p className={sectionTitleClass}>{t("participantsSectionTitle")}</p>
            <p className={cn("mt-1 text-xs", subClass)}>{t("participantsSectionHint")}</p>
          </div>
          {editParticipantRows.length ? (
            <Card>
              <CardContent className="pt-4">
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg ring-1 ring-zinc-200/80 dark:divide-zinc-800 dark:ring-zinc-700">
                  {editParticipantRows.map((p) => (
                    <li
                      key={p.userId}
                      className={cn(
                        "px-3 py-2.5 text-sm font-medium",
                        admin ? "text-court dark:text-emerald-100" : "text-zinc-800 dark:text-zinc-100",
                      )}
                    >
                      {p.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <ScheduleEmpty
              title={tSafe(t, "pageParticipantsEmptyTitle", "pageParticipantsEmpty")}
              description={t("pageParticipantsEmpty")}
              className="bg-white backdrop-blur-none dark:bg-zinc-900"
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
