import type { NotificationPrefs } from "@/contexts/preferences-context";
import type { UserRole } from "@/lib/types";

export type NotificationPrefKey = keyof NotificationPrefs;

/** Copy group in `Settings.notifRoles.*` (i18n). Admin uses the same as coach. */
export type NotificationCopyGroup = "student" | "coach";

/** Preference keys shown per role. */
export function notificationPrefKeysForRole(role: UserRole): NotificationPrefKey[] {
  switch (role) {
    case "student":
      return ["lessonReminders", "evaluationAlerts"];
    case "coach":
    case "superadmin":
    case "coach_admin":
      return ["lessonReminders", "lessonRequestAlerts"];
    default:
      return ["lessonReminders"];
  }
}

export function notificationCopyGroup(role: UserRole): NotificationCopyGroup {
  if (role === "student") return "student";
  return "coach";
}
