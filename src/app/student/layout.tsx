"use client";

import { useMemo } from "react";
import { AccessGate } from "@/components/access-gate";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { useTranslations } from "next-intl";
import { LayoutGrid, CalendarDays, CalendarPlus, Ticket, TrendingUp } from "lucide-react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell");
  const nav = useMemo<NavItem[]>(
    () => [
      { href: "/student/home", label: t("home"), icon: LayoutGrid },
      { href: "/student/schedule", label: t("schedule"), icon: CalendarDays },
      { href: "/student/events", label: t("studentEvents"), icon: Ticket },
      { href: "/student/book", label: t("book"), icon: CalendarPlus },
      { href: "/student/overall", label: t("overall"), icon: TrendingUp },
    ],
    [t]
  );

  return (
    <AccessGate role="student">
      <DashboardShell title={tShell("studentArea")} subtitle={tShell("student")} navItems={nav}>
        {children}
      </DashboardShell>
    </AccessGate>
  );
}
