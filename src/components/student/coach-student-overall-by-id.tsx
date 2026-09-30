"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

import { StudentOverallDashboard } from "@/components/student/student-overall-dashboard";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useAuth } from "@/contexts/auth-context";
import { findStudentByUrlKey, studentOverallPath, studentPublicKey, userAccountPath } from "@/lib/student-url-key";

const ROSTER_HREF = {
  coach: "/coach/students",
  admin: "/admin/students",
} as const;

export type CoachStudentOverallRoster = keyof typeof ROSTER_HREF;

/**
 * A student's Overall as seen by a coach or admin: same UI as `StudentOverallDashboard`,
 * resolved from the URL slug (not the database id).
 */
export function CoachStudentOverallById({ roster }: { roster: CoachStudentOverallRoster }) {
  const params = useParams();
  const router = useRouter();
  const urlKey = typeof params.studentId === "string" ? params.studentId : "";
  const { user, users } = useAuth();
  const t = useTranslations("CoachStudents");
  const tOverall = useTranslations("StudentOverall");

  const subject = useMemo(() => findStudentByUrlKey(users, urlKey), [users, urlKey]);
  const rosterHref = ROSTER_HREF[roster];
  const rosterLabel = t("pageTitle");
  const publicPath = subject
    ? studentOverallPath(roster === "admin" ? "admin" : "coach", subject, users)
    : null;

  useEffect(() => {
    if (!subject || !publicPath) return;
    const expectedKey = studentPublicKey(subject, users);
    if (decodeURIComponent(urlKey) !== expectedKey) {
      router.replace(publicPath);
    }
  }, [subject, publicPath, urlKey, users, router]);

  if (!user) return null;

  const canOpenOverall = subject && subject.role === "student" && (roster === "admin" || subject.status === "active");
  if (!canOpenOverall) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {!subject ? t("viewOverallNotFound") : t("viewOverallNotStudent")}
        </p>
        <AppBreadcrumb
          items={[
            { href: rosterHref, label: rosterLabel },
            { label: !subject ? t("viewOverallNotFound") : t("viewOverallNotStudent") },
          ]}
        />
      </div>
    );
  }

  return (
    <StudentOverallDashboard
      subject={subject}
      variant="coach"
      backHref={rosterHref}
      backLabel={rosterLabel}
      crumbLabel={tOverall("eyebrow")}
      profileHref={userAccountPath(roster === "admin" ? "admin" : "coach", subject, users)}
    />
  );
}
