"use client";

import { useMemo } from "react";
import { AccessGate } from "@/components/access-gate";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { useAuth } from "@/contexts/auth-context";
import { isDeveloper } from "@/lib/role-utils";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Users,
  CalendarDays,
  Ticket,
  ClipboardList,
  ListChecks,
  Shield,
  CalendarClock,
} from "lucide-react";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell");
  const nav = useMemo<NavItem[]>(() => {
    const base: NavItem[] = [
      { href: "/coach/home", label: t("home"), icon: LayoutGrid },
      { href: "/coach/students", label: t("students"), icon: Users },
      { href: "/coach/activities/categories", label: t("lessonActivities"), icon: ListChecks },
      { href: "/coach/availability", label: t("availability"), icon: CalendarClock },
      { href: "/coach/schedule", label: t("schedule"), icon: CalendarDays },
      { href: "/coach/classes", label: t("classes"), icon: ClipboardList },
      { href: "/coach/events", label: t("events"), icon: Ticket },
    ];
    if (user && isDeveloper(user.role)) {
      base.push({ href: "/admin/analytics", label: tShell("administration"), icon: Shield });
    }
    return base;
  }, [t, tShell, user]);

  return (
    <AccessGate role="coach">
      <DashboardShell title={tShell("coachArea")} subtitle={tShell("coachLabel")} navItems={nav}>
        {children}
      </DashboardShell>
    </AccessGate>
  );
}
