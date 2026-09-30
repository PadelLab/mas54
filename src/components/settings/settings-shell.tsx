"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/contexts/auth-context";
import {
  SIDEBAR_COLLAPSED_WIDTH_CLASS,
  SIDEBAR_EXPANDED_WIDTH_CLASS,
  useSidebarRail,
} from "@/hooks/use-sidebar-rail";
import { cn, longestNavHrefMatch } from "@/lib/utils";
import { homePathForUserRole } from "@/lib/role-utils";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Bell, ChevronsLeft, CircleUser, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";

const SETTINGS_HREFS = [
  "/settings/account",
  "/settings/preferences",
  "/settings/notifications",
  "/settings/profile",
] as const;

const SECURITY_TOKEN_RESET_PREFIX = "/settings/security/reset";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const t = useTranslations("Settings");
  const tShell = useTranslations("Shell");
  const { sidebarCollapsed, railNarrow, railExpanded, setCollapsedPersist, asideRailProps } = useSidebarRail();

  const isSecurityTokenReset = pathname.startsWith(SECURITY_TOKEN_RESET_PREFIX);

  useEffect(() => {
    if (!hydrated || isSecurityTokenReset) return;
    if (!user) {
      const next = pathname.startsWith("/settings")
        ? `/login?next=${encodeURIComponent(pathname)}`
        : "/login";
      router.replace(next);
    }
  }, [user, hydrated, router, isSecurityTokenReset, pathname]);

  const backHref = user ? homePathForUserRole(user.role) : "/";
  const isSettingsHub = pathname === "/settings" || pathname === "/settings/";

  const activeHref = useMemo(
    () => longestNavHrefMatch(pathname, SETTINGS_HREFS) ?? "/settings/account",
    [pathname],
  );

  if (isSecurityTokenReset) {
    return <>{children}</>;
  }

  if (!user) return null;

  function NavItem({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) {
    const active = activeHref === href;
    const narrow = railNarrow;
    return (
      <Link
        href={href}
        title={narrow ? label : undefined}
        className={cn(
          "group flex min-w-0 items-center py-2.5 text-sm font-medium transition-colors duration-200",
          narrow ? "justify-center gap-0 px-0" : "gap-3 px-3",
          active
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors",
            active
              ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700/80 dark:text-zinc-100"
              : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/80 group-hover:text-zinc-700 dark:bg-white/10 dark:text-zinc-300 dark:group-hover:bg-white/15 dark:group-hover:text-white",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className={cn("min-w-0", narrow && "sr-only")}>{label}</span>
      </Link>
    );
  }

  return (
    <div className="signup-page relative flex h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside
        {...asideRailProps}
        className={cn(
          "relative z-10 hidden h-full min-h-0 shrink-0 flex-col border-r border-zinc-200 bg-white text-zinc-900 transition-[width] duration-200 ease-out dark:border-white/5 dark:bg-zinc-950 dark:text-white lg:flex",
          railExpanded
            ? `${SIDEBAR_EXPANDED_WIDTH_CLASS} shadow-lg shadow-zinc-900/5 dark:shadow-black/30`
            : SIDEBAR_COLLAPSED_WIDTH_CLASS,
        )}
      >
        <div
          className={cn(
            "shrink-0",
            railNarrow ? "flex flex-col items-center gap-2 px-2 pb-3 pt-4" : "p-6 pb-4",
          )}
        >
          {railNarrow ? (
            <BrandLogo compact href="/" className="rounded-xl" priority />
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <BrandLogo href="/" priority />
                <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("shellSubtitle")}</p>
              </div>
              {!sidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setCollapsedPersist(true)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                  aria-label={tShell("collapseSidebar")}
                  title={tShell("collapseSidebar")}
                >
                  <ChevronsLeft className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          )}
        </div>
        <nav
          className={cn(
            "scrollbar-themed flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain",
            railNarrow ? "items-center px-1.5" : "px-3",
          )}
        >
          <NavItem href="/settings/account" label={t("navAccount")} Icon={CircleUser} />
          <NavItem href="/settings/preferences" label={t("navPreferences")} Icon={SlidersHorizontal} />
          <NavItem href="/settings/notifications" label={t("navNotifications")} Icon={Bell} />
        </nav>
        <div className={cn("border-t border-zinc-200 dark:border-white/5", railNarrow ? "p-2" : "p-4")}>
          <Link
            href={backHref}
            title={railNarrow ? t("backLink") : undefined}
            className={cn(
              "group flex w-full items-center py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
              railNarrow ? "justify-center px-0" : "gap-3 px-3",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zinc-200/80 group-hover:text-zinc-700 dark:bg-white/10 dark:text-zinc-300 dark:group-hover:bg-white/15 dark:group-hover:text-white">
              <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className={cn(railNarrow && "sr-only")}>{t("backLink")}</span>
          </Link>
        </div>
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main className="relative min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-zinc-900 dark:text-zinc-100 sm:px-4 sm:py-8 md:px-8 lg:px-8 lg:py-10 xl:px-10">
          <Link
            href={isSettingsHub ? backHref : "/settings"}
            className="mb-4 -ml-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-zinc-100 lg:hidden"
            aria-label={isSettingsHub ? t("backLink") : t("title")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
