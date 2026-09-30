/** Safe internal path for `?next=` (avoids open redirect). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("://") || v.includes("\\")) {
    return null;
  }
  const path = v.split("?")[0]?.split("#")[0] ?? "";
  if (path === "/settings" || path.startsWith("/settings/")) return path;
  return null;
}

export const NOTIFICATIONS_SETTINGS_PATH = "/settings/notifications";
