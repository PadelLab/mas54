/**
 * Time zone used so event, lesson, and court date/times match on the server (Node)
 * and the client — avoids `new Date("YYYY-MM-DDTHH:mm")` depending on the host TZ.
 * Aligned with `IntlAppProvider` (next-intl `timeZone`).
 */
export const APP_SCHEDULE_TIMEZONE = "America/Panama";
