"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn, pageTitleClass } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  GraduationCap,
  LayoutGrid,
  List,
  Plus,
  Shield,
  User,
  Users,
} from "lucide-react";
import { MetricStatCard } from "@/components/metric-stat-card";

export default function AdminUsersHubPage() {
  const t = useTranslations("AdminUsersHub");
  const { users } = useAuth();
  const [view, setView] = useState<"grid" | "list">("grid");

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === "active").length;
    return {
      total: users.length,
      active,
      inactive: users.filter((u) => u.status === "deactivated").length,
    };
  }, [users]);

  const profiles = useMemo(
    () =>
      [
        {
          key: "students" as const,
          href: "/admin/users/students",
          title: t("students"),
          description: t("studentsDesc"),
          footer: t("footerStudents"),
          icon: User,
          iconWrap: "bg-[#e8f3fb] text-[#2b9adf]",
          footerWrap: "bg-[#e8f3fb] text-[#2b9adf]",
        },
        {
          key: "coaches" as const,
          href: "/admin/users/coaches",
          title: t("teachers"),
          description: t("teachersDesc"),
          footer: t("footerTeachers"),
          icon: GraduationCap,
          iconWrap: "bg-[#fff0e6] text-[#e85d04]",
          footerWrap: "bg-[#fff0e6] text-[#e85d04]",
        },
        {
          key: "administrators" as const,
          href: "/admin/users/administrators",
          title: t("administrators"),
          description: t("administratorsDesc"),
          footer: t("footerAdministrators"),
          icon: Shield,
          iconWrap: "bg-[#eee8fb] text-[#7c5cbf]",
          footerWrap: "bg-[#eee8fb] text-[#7c5cbf]",
        },
      ] as const,
    [t],
  );

  return (
    <div className="min-w-0 space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(pageTitleClass, "text-zinc-900 dark:text-zinc-50")}>
            {t("title")}
          </h1>
          <p className="mt-1 text-[15px] text-zinc-500 dark:text-zinc-400">{t("intro")}</p>
        </div>
        <Button
          asChild
          className="h-10 w-full shrink-0 rounded-lg bg-none bg-accent px-4 shadow-md shadow-accent/20 hover:bg-accent hover:brightness-105 sm:w-auto"
        >
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            {t("newAccount")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricStatCard
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#fff0e6] text-[#e85d04]"
          label={t("statTotalUsers")}
          value={stats.total}
        />
        <MetricStatCard
          icon={<Activity className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#e6f7ee] text-[#16a34a]"
          label={t("statActiveUsers")}
          value={stats.active}
        />
        <MetricStatCard
          icon={<User className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#fde8e8] text-[#e11d48]"
          label={t("statInactiveUsers")}
          value={stats.inactive}
        />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("listsTitle")}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t("viewGrid")}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border transition",
                view === "grid"
                  ? "border-accent text-accent"
                  : "border-transparent text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800",
              )}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t("viewList")}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border transition",
                view === "list"
                  ? "border-accent text-accent"
                  : "border-transparent text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800",
              )}
            >
              <List className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {view === "grid" ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.key}>
                  <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-1 flex-col p-5 pb-6">
                      <div
                        className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                          p.iconWrap,
                        )}
                      >
                        <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                      </div>
                      <div className="mt-5 min-w-0">
                        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{p.title}</h3>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {p.description}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={p.href}
                      className={cn(
                        "mt-auto flex items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold",
                        p.footerWrap,
                      )}
                    >
                      <span>{p.footer}</span>
                      <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </Link>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
            {profiles.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.key} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800">
                  <Link
                    href={p.href}
                    className="flex min-w-0 items-center gap-4 px-4 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60 sm:px-5"
                  >
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        p.iconWrap,
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                        {p.title}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {p.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
