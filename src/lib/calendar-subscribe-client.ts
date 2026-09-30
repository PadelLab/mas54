const PROMPTED_KEY = "padellab_calendar_os_prompted";
const OPEN_NEXT_KEY = "padellab_open_calendar";

export function markCalendarSubscribeForNextPage() {
  try {
    sessionStorage.setItem(OPEN_NEXT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldOpenCalendarSubscribe(): boolean {
  try {
    return sessionStorage.getItem(OPEN_NEXT_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeCalendarSubscribeFlag() {
  try {
    sessionStorage.removeItem(OPEN_NEXT_KEY);
    localStorage.setItem(PROMPTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasCalendarSubscribeBeenPrompted(): boolean {
  try {
    return localStorage.getItem(PROMPTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCalendarSubscribePrompted() {
  try {
    localStorage.setItem(PROMPTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export type CalendarSubscribeResult =
  | { ok: false }
  | { ok: true; mode: "app" | "file" | "empty" | "share" | "google-local" };

function isLocalCalendarHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function downloadIcsFile(ics: string, filename = "plus54.ics") {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareOrDownloadIcs(ics: string): Promise<"share" | "file"> {
  const file = new File([ics], "plus54.ics", { type: "text/calendar" });
  const payload = { files: [file], title: "+54", text: "+54" };
  try {
    if (typeof navigator.canShare === "function" && navigator.canShare(payload)) {
      await navigator.share(payload);
      return "share";
    }
  } catch {
    /* user cancelled or share unsupported */
  }
  downloadIcsFile(ics);
  return "file";
}

type SubscribeUrls = {
  httpsUrl: string;
  webcalUrl: string;
  googleUrl?: string;
};

async function fetchSubscribeUrls(): Promise<SubscribeUrls | null> {
  const res = await fetch("/api/calendar/subscribe");
  const data = (await res.json()) as SubscribeUrls & { ok?: boolean };
  if (!res.ok || !data.httpsUrl || !data.webcalUrl) return null;
  return data;
}

/**
 * Google Calendar (public HTTPS URL), iPhone Calendar, or a .ics file.
 * Google cannot subscribe to localhost — in that case returns `google-local`.
 */
export async function openPhoneCalendarSubscription(
  target: "auto" | "google" = "auto",
): Promise<CalendarSubscribeResult> {
  const data = await fetchSubscribeUrls();
  if (!data) return { ok: false };

  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  const appleMobile = /iPhone|iPad|iPod/i.test(ua);
  const mac = /Macintosh/i.test(ua);
  const local = isLocalCalendarHost(data.httpsUrl);

  if (target === "google") {
    if (local || !data.googleUrl) return { ok: true, mode: "google-local" };
    window.location.assign(data.googleUrl);
    return { ok: true, mode: "app" };
  }

  if (android && data.googleUrl && !local) {
    window.location.assign(data.googleUrl);
    return { ok: true, mode: "app" };
  }
  if (appleMobile || (mac && !local)) {
    window.location.assign(data.webcalUrl);
    return { ok: true, mode: "app" };
  }

  const icsRes = await fetch(data.httpsUrl, { cache: "no-store" });
  if (!icsRes.ok) return { ok: false };
  const ics = await icsRes.text();
  if (!/BEGIN:VEVENT/.test(ics)) return { ok: true, mode: "empty" };
  const mode = await shareOrDownloadIcs(ics);
  return { ok: true, mode };
}
