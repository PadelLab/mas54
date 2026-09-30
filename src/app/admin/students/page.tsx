"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { StudentRosterCard } from "@/components/students/student-roster-card";
import { studentOverallPath } from "@/lib/student-url-key";
import { pageTitleClass } from "@/lib/utils";

/** Coach-style list: view only + Overall; accounts live at /admin/users/students */
export default function AdminStudentsRosterPage() {
  const t = useTranslations("CoachStudents");
  const { user, users } = useAuth();

  if (!user) return null;

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className={`${pageTitleClass} text-court dark:text-emerald-100`}>{t("pageTitle")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-court/60 dark:text-emerald-200/60">{t("pageSubtitleAdminRoster")}</p>
      </div>
      <StudentRosterCard hrefFor={(s) => studentOverallPath("admin", s, users)} />
    </div>
  );
}
