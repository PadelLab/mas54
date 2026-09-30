"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { ProfileEditScreen } from "@/components/profile/profile-edit-screen";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { useAuth } from "@/contexts/auth-context";
import { canManageOtherUserProfile } from "@/lib/role-utils";
import { findUserByUrlKey, userAccountPath } from "@/lib/student-url-key";
import type { UserRole } from "@/lib/types";

export type ManagedUserAccountArea = "admin" | "coach";

function listHrefForRole(area: ManagedUserAccountArea, role: UserRole) {
  if (area === "coach") return "/coach/students";
  if (role === "student") return "/admin/users/students";
  if (role === "coach" || role === "coach_admin") return "/admin/users/coaches";
  return "/admin/users/administrators";
}

export function ManagedUserAccount({
  urlKey,
  mode,
  area,
}: {
  urlKey: string;
  mode: "view" | "edit";
  area: ManagedUserAccountArea;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tPages = useTranslations("AdminUsersPages");
  const tHub = useTranslations("AdminUsersHub");
  const tCoach = useTranslations("CoachStudents");
  const { user: me, users } = useAuth();

  const subject = useMemo(() => {
    if (area === "coach") return findUserByUrlKey(users, urlKey, "student");
    return (
      findUserByUrlKey(users, urlKey, "all", true) ??
      findUserByUrlKey(users, urlKey, "student", true)
    );
  }, [users, urlKey, area]);

  const publicPath = subject ? userAccountPath(area, subject, users, mode) : null;
  const viewPath = subject ? userAccountPath(area, subject, users, "view") : null;
  const canEdit = Boolean(
    me && subject && (me.id === subject.id || canManageOtherUserProfile(me.role, subject.role)),
  );
  const canView = Boolean(
    me &&
      subject &&
      (me.id === subject.id ||
        (area === "coach" && subject.role === "student") ||
        canManageOtherUserProfile(me.role, subject.role)),
  );

  useEffect(() => {
    if (!publicPath) return;
    if (pathname !== publicPath) router.replace(publicPath);
  }, [publicPath, pathname, router]);

  useEffect(() => {
    if (!viewPath) return;
    if (mode === "edit" && !canEdit && canView) router.replace(viewPath);
  }, [mode, canEdit, canView, viewPath, router]);

  if (!me) return null;

  if (!subject) {
    const listHref = area === "coach" ? "/coach/students" : "/admin/users";
    const listLabel = area === "coach" ? tCoach("pageTitle") : tHub("title");
    return (
      <div className="space-y-4">
        <AppBreadcrumb items={[{ href: listHref, label: listLabel }, { label: tPages("userNotFound") }]} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{tPages("userNotFound")}</p>
      </div>
    );
  }

  if (!canView) {
    const listHref = area === "coach" ? "/coach/students" : "/admin/users";
    const listLabel = area === "coach" ? tCoach("pageTitle") : tHub("title");
    return (
      <div className="space-y-4">
        <AppBreadcrumb items={[{ href: listHref, label: listLabel }, { label: tPages("noPermission") }]} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{tPages("noPermission")}</p>
      </div>
    );
  }

  const listHref = listHrefForRole(area, subject.role);
  const listLabel =
    area === "coach"
      ? tCoach("pageTitle")
      : subject.role === "student"
        ? tPages("studentsTitle")
        : subject.role === "coach" || subject.role === "coach_admin"
          ? tPages("coachesTitle")
          : tPages("administratorsTitle");

  return (
    <div className="space-y-4">
      <AppBreadcrumb
        items={[
          ...(area === "admin" ? [{ href: "/admin/users", label: tHub("title") }] : []),
          { href: listHref, label: listLabel },
          { label: subject.name },
        ]}
      />
      {mode === "edit" && canEdit ? (
        <ProfileEditScreen subject={subject} />
      ) : (
        <ProfileScreen subject={subject} />
      )}
    </div>
  );
}
