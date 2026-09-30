import { LESSON_DURATION_MIN } from "@/lib/coach-availability";
import { eventScheduleStartUtcMs } from "@/lib/schedule-date";

/** Location shown in Google / Outlook / Apple Calendar. */
export const CALENDAR_EVENT_LOCATION = "+54 academia";

export type LessonCalendarPerson = {
  name: string;
  email: string;
};

export type LessonCalendarInput = {
  lessonId: string;
  date: string;
  time: string;
  title: string;
  description?: string;
  location?: string;
  organizer?: LessonCalendarPerson;
  attendee?: LessonCalendarPerson;
};

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

function icsMailto(email: string): string {
  return `mailto:${email.trim()}`;
}

function icsPersonLine(kind: "ORGANIZER" | "ATTENDEE", person: LessonCalendarPerson): string {
  if (kind === "ORGANIZER") {
    return `ORGANIZER;CN=${icsEscape(person.name)}:${icsMailto(person.email)}`;
  }
  return `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${icsEscape(person.name)}:${icsMailto(person.email)}`;
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function toIcsUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function lessonCalendarTimes(date: string, time: string): { startMs: number; endMs: number } | null {
  const startMs = eventScheduleStartUtcMs(date, time);
  if (startMs == null) return null;
  return { startMs, endMs: startMs + LESSON_DURATION_MIN * 60 * 1000 };
}

/** iCalendar invite (METHOD:REQUEST) — Gmail shows the Yes / Maybe / No card. */
export function buildLessonIcs(input: LessonCalendarInput): string | null {
  const times = lessonCalendarTimes(input.date, input.time);
  if (!times) return null;
  const uid = `lesson-${input.lessonId.replace(/[^a-zA-Z0-9_-]/g, "")}@padellab`;
  const stamp = toIcsUtc(Date.now());
  const method = input.attendee ? "REQUEST" : "PUBLISH";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//+54//Padel Lab//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(times.startMs)}`,
    `DTEND:${toIcsUtc(times.endMs)}`,
    `SUMMARY:${icsEscape(input.title)}`,
    `DESCRIPTION:${icsEscape(input.description ?? "")}`,
    `LOCATION:${icsEscape(input.location ?? "")}`,
    ...(input.organizer ? [icsPersonLine("ORGANIZER", input.organizer)] : []),
    ...(input.attendee ? [icsPersonLine("ATTENDEE", input.attendee)] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "X-MICROSOFT-CDO-BUSYSTATUS:BUSY",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT60M",
    `DESCRIPTION:${icsEscape(input.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildLessonEventBlock(input: LessonCalendarInput): string[] | null {
  const times = lessonCalendarTimes(input.date, input.time);
  if (!times) return null;
  const uid = `lesson-${input.lessonId.replace(/[^a-zA-Z0-9_-]/g, "")}@padellab`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(Date.now())}`,
    `DTSTART:${toIcsUtc(times.startMs)}`,
    `DTEND:${toIcsUtc(times.endMs)}`,
    `SUMMARY:${icsEscape(input.title)}`,
    `DESCRIPTION:${icsEscape(input.description ?? "")}`,
    `LOCATION:${icsEscape(input.location ?? "")}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "X-MICROSOFT-CDO-BUSYSTATUS:BUSY",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT60M",
    `DESCRIPTION:${icsEscape(input.title)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

/** Subscribable feed (Apple / Google / Outlook update themselves). */
export function buildCalendarFeedIcs(events: LessonCalendarInput[]): string {
  const blocks = events.flatMap((event) => buildLessonEventBlock(event) ?? []);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//+54//Padel Lab//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:+54",
    "X-PUBLISHED-TTL:PT1H",
    ...blocks,
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadLessonIcs(ics: string, filename = "+54-lesson.ics") {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open Google Calendar with the lesson prefilled (no Google API). */
export function buildGoogleCalendarTemplateUrl(input: LessonCalendarInput): string | null {
  const times = lessonCalendarTimes(input.date, input.time);
  if (!times) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toIcsUtc(times.startMs)}/${toIcsUtc(times.endMs)}`,
    details: input.description ?? "",
    location: input.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
