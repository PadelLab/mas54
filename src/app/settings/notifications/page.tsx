"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { usePreferences, type NotificationPrefs } from "@/contexts/preferences-context";
import { Switch } from "@/components/ui/switch";
import {
  notificationCopyGroup,
  notificationPrefKeysForRole,
  type NotificationPrefKey,
} from "@/lib/notification-settings";
import { pageTitleClass } from "@/lib/utils";
import { useEffect, useState } from "react";

function NotifRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </li>
  );
}

export default function SettingsNotificationsPage() {
  const { user, setLessonRemindersEnabled, setLessonRequestAlertsEnabled, setEvaluationAlertsEnabled } = useAuth();
  const { notifications, setNotificationPrefs } = usePreferences();
  const t = useTranslations("Settings");
  const notificationsPageSubtitle = t("notificationsPageSubtitle").trim();
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [remindersOptimistic, setRemindersOptimistic] = useState<boolean | null>(null);
  const [requestAlertsBusy, setRequestAlertsBusy] = useState(false);
  const [requestAlertsOptimistic, setRequestAlertsOptimistic] = useState<boolean | null>(null);
  const [evalAlertsBusy, setEvalAlertsBusy] = useState(false);
  const [evalAlertsOptimistic, setEvalAlertsOptimistic] = useState<boolean | null>(null);

  useEffect(() => {
    setRemindersOptimistic(null);
  }, [user?.lessonRemindersEnabled]);

  useEffect(() => {
    setRequestAlertsOptimistic(null);
  }, [user?.lessonRequestAlertsEnabled]);

  useEffect(() => {
    setEvalAlertsOptimistic(null);
  }, [user?.evaluationAlertsEnabled]);

  if (!user) return null;

  const copyGroup = notificationCopyGroup(user.role);
  const prefKeys = notificationPrefKeysForRole(user.role);
  const roleIntro = t(`notifRoles.${copyGroup}.intro`).trim();
  const fallbackIntro = t("notificationsIntro").trim();
  const notificationsIntro = roleIntro || fallbackIntro;

  const tRole = t as unknown as (key: string) => string;
  const rowTitle = (key: NotificationPrefKey) => tRole(`notifRoles.${copyGroup}.${key}.title`);
  const rowDesc = (key: NotificationPrefKey) => tRole(`notifRoles.${copyGroup}.${key}.desc`);

  const patchSetter = (key: NotificationPrefKey) => (v: boolean) =>
    setNotificationPrefs({ [key]: v } as Partial<NotificationPrefs>);

  const remindersOn = remindersOptimistic ?? user.lessonRemindersEnabled !== false;
  const requestAlertsOn = requestAlertsOptimistic ?? user.lessonRequestAlertsEnabled !== false;
  const evalAlertsOn = evalAlertsOptimistic ?? user.evaluationAlertsEnabled !== false;

  const onLessonReminders = async (on: boolean) => {
    setRemindersOptimistic(on);
    setRemindersBusy(true);
    try {
      const saved = await setLessonRemindersEnabled(on);
      if (!saved.ok) setRemindersOptimistic(!on);
      else setNotificationPrefs({ lessonReminders: on });
    } catch {
      setRemindersOptimistic(!on);
    } finally {
      setRemindersBusy(false);
    }
  };

  const onLessonRequestAlerts = async (on: boolean) => {
    setRequestAlertsOptimistic(on);
    setRequestAlertsBusy(true);
    try {
      const saved = await setLessonRequestAlertsEnabled(on);
      if (!saved.ok) setRequestAlertsOptimistic(!on);
      else setNotificationPrefs({ lessonRequestAlerts: on });
    } catch {
      setRequestAlertsOptimistic(!on);
    } finally {
      setRequestAlertsBusy(false);
    }
  };

  const onEvaluationAlerts = async (on: boolean) => {
    setEvalAlertsOptimistic(on);
    setEvalAlertsBusy(true);
    try {
      const saved = await setEvaluationAlertsEnabled(on);
      if (!saved.ok) setEvalAlertsOptimistic(!on);
      else setNotificationPrefs({ evaluationAlerts: on });
    } catch {
      setEvalAlertsOptimistic(!on);
    } finally {
      setEvalAlertsBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-full min-w-0 animate-fade-slide flex-col gap-6 pb-8 md:gap-8">
      <header>
        <h1 className={`${pageTitleClass} text-zinc-900 dark:text-zinc-50`}>{t("notificationsPageTitle")}</h1>
        {notificationsPageSubtitle || notificationsIntro ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {notificationsPageSubtitle || notificationsIntro}
          </p>
        ) : null}
      </header>

      <section className="surface-card p-4 sm:p-6 md:p-8">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {prefKeys.map((key) =>
            key === "lessonReminders" ? (
              <NotifRow
                key={key}
                title={rowTitle(key)}
                description={rowDesc(key)}
                checked={remindersOn}
                disabled={remindersBusy}
                onChange={(v) => void onLessonReminders(v)}
              />
            ) : key === "lessonRequestAlerts" ? (
              <NotifRow
                key={key}
                title={rowTitle(key)}
                description={rowDesc(key)}
                checked={requestAlertsOn}
                disabled={requestAlertsBusy}
                onChange={(v) => void onLessonRequestAlerts(v)}
              />
            ) : key === "evaluationAlerts" ? (
              <NotifRow
                key={key}
                title={rowTitle(key)}
                description={rowDesc(key)}
                checked={evalAlertsOn}
                disabled={evalAlertsBusy}
                onChange={(v) => void onEvaluationAlerts(v)}
              />
            ) : (
              <NotifRow
                key={key}
                title={rowTitle(key)}
                description={rowDesc(key)}
                checked={notifications[key]}
                onChange={patchSetter(key)}
              />
            ),
          )}
        </ul>
      </section>
    </div>
  );
}
