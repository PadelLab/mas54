"use client";

import { useMemo } from "react";
import { AccessGate } from "@/components/access-gate";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { useTranslations } from "next-intl";
import {
  BarChart2,
  GraduationCap,
  LayoutGrid,
  Users,
  ContactRound,
  CalendarDays,
  CalendarClock,
  Ticket,
  ClipboardList,
  ListChecks,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell");
  const nav = useMemo<NavItem[]>(
    () => [
      {
        label: t("dashboard"),
        icon: LayoutGrid,
        children: [
          { href: "/admin/analytics", label: t("analytics"), icon: BarChart2 },
          { href: "/admin/analytics/categories", label: t("analyticsCategories"), icon: ListChecks },
        ],
      },
      {
        label: tShell("coachArea"),
        icon: GraduationCap,
        children: [
          { href: "/admin/students", label: t("students"), icon: Users },
          { href: "/admin/activities/categories", label: t("lessonActivities"), icon: ListChecks },
          { href: "/admin/availability", label: t("availability"), icon: CalendarClock },
          { href: "/admin/schedule", label: t("schedule"), icon: CalendarDays },
          { href: "/admin/classes", label: t("classes"), icon: ClipboardList },
          { href: "/admin/events", label: t("events"), icon: Ticket },
        ],
      },
      { href: "/admin/users", label: t("users"), icon: ContactRound },
    ],
    [t, tShell],
  );

  return (
    <AccessGate role="superadmin">
      <DashboardShell title={tShell("administration")} subtitle={tShell("admin")} navItems={nav}>
        {children}
      </DashboardShell>
    </AccessGate>
  );
}
