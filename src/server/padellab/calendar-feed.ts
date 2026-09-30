import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { CALENDAR_EVENT_LOCATION, buildCalendarFeedIcs, type LessonCalendarInput } from "@/lib/lesson-calendar";
import { getPublicAppUrl } from "@/server/padellab/public-app-url";
import type { Sql } from "./neon-client";
import { normalizeDbEventDateString, normalizeDbEventTimeString, todayYmdInAppTz } from "@/lib/schedule-date";

function calendarFeedSecret(): string {
  return (
    process.env.CALENDAR_FEED_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "padellab-calendar-feed"
  );
}

export function createCalendarFeedToken(userId: string): string {
  const payload = Buffer.from(userId, "utf8").toString("base64url");
  const sig = createHmac("sha256", calendarFeedSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyCalendarFeedToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", calendarFeedSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8") || null;
  } catch {
    return null;
  }
}

export function calendarSubscribeUrls(userId: string) {
  const httpsUrl = `${getPublicAppUrl()}/api/calendar/${createCalendarFeedToken(userId)}`;
  const webcalUrl = httpsUrl.replace(/^https:/, "webcal:").replace(/^http:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(httpsUrl)}`;
  return { httpsUrl, webcalUrl, googleUrl };
}

export async function buildUserCalendarFeed(sql: Sql, userId: string): Promise<string> {
  const flagRows = (await sql`
    SELECT COALESCE(calendar_feed_enabled, false) AS calendar_feed_enabled
    FROM users WHERE id = ${userId} LIMIT 1
  `) as { calendar_feed_enabled: boolean }[];
  if (!flagRows[0]?.calendar_feed_enabled) {
    return buildCalendarFeedIcs([]);
  }

  const fromDate = todayYmdInAppTz();
  const rows = (await sql`
    SELECT
      l.id,
      l.date,
      l.time,
      l.student_id,
      p.name AS coach_name,
      s.name AS student_name,
      c.name AS court_name,
      c.address AS court_address
    FROM lessons l
    JOIN users p ON p.id = l.coach_id
    JOIN users s ON s.id = l.student_id
    JOIN courts c ON c.id = l.court_id
    WHERE l.status = ${"confirmed"}
      AND (l.student_id = ${userId} OR l.coach_id = ${userId})
      AND l.date >= ${fromDate}
    ORDER BY l.date, l.time
  `) as {
    id: string;
    date: unknown;
    time: unknown;
    student_id: string;
    coach_name: string;
    student_name: string;
    court_name: string;
    court_address: string | null;
  }[];

  const events: LessonCalendarInput[] = [];
  for (const row of rows) {
    const date = normalizeDbEventDateString(row.date);
    const time = normalizeDbEventTimeString(row.time);
    if (!date) continue;
    const withStudent = row.student_id !== userId;
    events.push({
      lessonId: row.id,
      date,
      time,
      title: withStudent ? `+54 · ${row.student_name}` : `+54 · ${row.coach_name}`,
      description: withStudent
        ? `Padel lesson with ${row.student_name}.`
        : `Padel lesson with ${row.coach_name}.`,
      location: CALENDAR_EVENT_LOCATION,
    });
  }
  return buildCalendarFeedIcs(events);
}
