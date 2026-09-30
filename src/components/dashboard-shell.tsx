"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/contexts/auth-context";
import { useTranslations } from "next-intl";
import { cn, longestNavHrefMatch } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  SIDEBAR_COLLAPSED_WIDTH_CLASS,
  SIDEBAR_EXPANDED_WIDTH_CLASS,
  useSidebarRail,
} from "@/hooks/use-sidebar-rail";
import { ChevronDown, ChevronsLeft, Ellipsis, LogOut, Settings, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** On mobile, at most 5 tabs; the rest go under “More”. */
const MOBILE_TAB_CAP = 5;

export type NavLeafItem = { href: string; label: string; icon: LucideIcon };
export type NavGroupItem = { label: string; icon: LucideIcon; children: NavLeafItem[] };
export type NavItem = NavLeafItem | NavGroupItem;

export function isNavGroup(item: NavItem): item is NavGroupItem {
  return "children" in item && Array.isArray((item as NavGroupItem).children);
}

function flattenNavLeaves(items: NavItem[]): NavLeafItem[] {
  const out: NavLeafItem[] = [];
  for (const i of items) {
    if (isNavGroup(i)) out.push(...i.children);
    else out.push(i);
  }
  return out;
}

function collectNavHrefs(items: NavItem[]): string[] {
  return flattenNavLeaves(items).map((x) => x.href);
}

export function DashboardShell({
  title,
  subtitle,
  navItems,
  children,
}: {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const t = useTranslations("Shell");
  const tNav = useTranslations("Nav");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const moreSheetRef = useRef<HTMLDivElement>(null);
  const { sidebarCollapsed, railNarrow, railExpanded, setCollapsedPersist, asideRailProps } = useSidebarRail();

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (accountMenuRef.current?.contains(t)) return;
      setAccountMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!moreSheetRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  const navHrefs = useMemo(() => collectNavHrefs(navItems), [navItems]);
  const flatNavLeaves = useMemo(() => flattenNavLeaves(navItems), [navItems]);
  const activeNavHref = useMemo(() => {
    if (/\/profile(\/|$)/.test(pathname)) return undefined;
    return longestNavHrefMatch(pathname, navHrefs);
  }, [pathname, navHrefs]);
  const { mobilePrimaryTabs, mobileMoreTabs } = useMemo(() => {
    const primaryCap = MOBILE_TAB_CAP - 1;
    if (flatNavLeaves.length <= primaryCap) {
      return { mobilePrimaryTabs: flatNavLeaves, mobileMoreTabs: [] as NavLeafItem[] };
    }
    return {
      mobilePrimaryTabs: flatNavLeaves.slice(0, primaryCap),
      mobileMoreTabs: flatNavLeaves.slice(primaryCap),
    };
  }, [flatNavLeaves]);
  const moreTabActive =
    mobileMoreTabs.some((item) => activeNavHref === item.href) ||
    pathname.startsWith("/settings") ||
    /\/profile(\/|$)/.test(pathname);
  /** When the shell has a session, profile follows the role — not the pathname (avoids losing the block on Home, Accounts, etc.). */
  const profileHref = useMemo(() => {
    if (!user) return null;
    if (user.role === "student") return "/student/profile";
    if (user.role === "superadmin") return "/admin/profile";
    if (user.role === "coach" || user.role === "coach_admin") return "/coach/profile";
    return null;
  }, [user, pathname]);

  const onLogout = async () => {
    await logout();
    router.push("/");
  };

  const NavLink = ({ item, nested }: { item: NavLeafItem; nested?: boolean }) => {
    const active = activeNavHref === item.href;
    const Icon = item.icon;
    const narrow = railNarrow;
    return (
      <Link
        href={item.href}
        title={narrow ? item.label : undefined}
        className={cn(
          "group flex min-w-0 items-center text-sm font-medium transition-colors duration-200",
          nested ? "py-2" : "py-2.5",
          narrow ? "justify-center gap-0 px-0" : "gap-3 px-3",
          active
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl transition-colors",
            nested ? "h-8 w-8 rounded-xl" : "h-10 w-10",
            active
              ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700/80 dark:text-zinc-100"
              : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/80 group-hover:text-zinc-700 dark:bg-white/10 dark:text-zinc-300 dark:group-hover:bg-white/15 dark:group-hover:text-white",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className={cn("min-w-0 truncate", narrow && "sr-only")}>{item.label}</span>
      </Link>
    );
  };

  const NavGroupBlock = ({ group }: { group: NavGroupItem }) => {
    const childPathActive = group.children.some(
      (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
    );
    const [expanded, setExpanded] = useState(childPathActive);
    useEffect(() => {
      if (childPathActive) setExpanded(true);
    }, [childPathActive]);
    const GroupIcon = group.icon;
    const narrow = railNarrow;

    if (narrow) {
      const firstChild = group.children[0];
      if (!firstChild) return null;
      return (
        <NavLink
          item={{
            href: firstChild.href,
            label: group.label,
            icon: group.icon,
          }}
        />
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="group flex min-w-0 items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zinc-200/80 group-hover:text-zinc-700 dark:bg-white/10 dark:text-zinc-300 dark:group-hover:bg-white/15 dark:group-hover:text-white">
            <GroupIcon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>
        {expanded ? (
          <div className="ml-2 flex flex-col gap-0.5 border-l border-zinc-200/90 pl-3 dark:border-white/10">
            {group.children.map((child) => (
              <NavLink key={child.href} item={child} nested />
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden",
      "bg-zinc-50 dark:bg-zinc-950",
    )}>
      {/*
        Sticky + self-start: with only h-dvh, the right column could grow taller than the sidebar
        and leave a dark “hole” below the profile block when scrolling the page.
      */}
      <aside
        {...asideRailProps}
        className={cn(
          "sticky top-0 z-20 hidden h-dvh shrink-0 flex-col self-start border-r border-zinc-200 bg-white text-zinc-900 transition-[width] duration-200 ease-out dark:border-white/5 dark:bg-zinc-950 dark:text-white lg:flex",
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
                <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
              </div>
              {!sidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setCollapsedPersist(true)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                  aria-label={t("collapseSidebar")}
                  title={t("collapseSidebar")}
                >
                  <ChevronsLeft className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          )}
        </div>
        <nav
          className={cn(
            "scrollbar-themed flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain py-0.5",
            railNarrow ? "items-center px-1.5" : "px-3",
          )}
        >
          {navItems.map((item, idx) =>
            isNavGroup(item) ? (
              <NavGroupBlock key={`g-${item.label}-${idx}`} group={item} />
            ) : (
              <NavLink key={item.href} item={item} />
            ),
          )}
        </nav>
        <div className={cn("shrink-0 border-t border-zinc-200 dark:border-white/5", railNarrow ? "p-2" : "p-3")}>
          {profileHref && user ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                title={user.name}
                onClick={() => setAccountMenuOpen((o) => !o)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-zinc-100 dark:hover:bg-white/5",
                  railNarrow && "justify-center",
                )}
              >
                <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-zinc-200 ring-1 ring-zinc-300/80 dark:bg-zinc-800 dark:ring-white/10">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      decoding="async"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      {(user.name || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className={cn("min-w-0 flex-1 self-center", railNarrow && "sr-only")}>
                  <div className="truncate text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{user.name}</div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-500 transition-transform dark:text-zinc-500",
                    accountMenuOpen && "rotate-180",
                    railNarrow && "sr-only",
                  )}
                  aria-hidden
                />
              </button>
              {accountMenuOpen ? (
                <div
                  role="menu"
                  className={cn(
                    "absolute bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl shadow-zinc-900/15 ring-1 ring-zinc-950/5 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/50 dark:ring-white/5",
                    railNarrow
                      ? "left-0 w-56 min-w-[12rem] origin-bottom-left"
                      : "left-0 right-0",
                  )}
                >
                  <Link
                    href={profileHref}
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/10"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <User className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    {tNav("profile")}
                  </Link>
                  <div className="mx-2 h-px bg-zinc-200 dark:bg-white/10" />
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/10"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    {t("settings")}
                  </Link>
                  <div className="mx-2 h-px bg-zinc-200 dark:bg-white/10" />
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 dark:text-red-300/95 dark:hover:bg-red-950/35"
                    onClick={async () => {
                      setAccountMenuOpen(false);
                      await onLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                    {t("logout")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={cn("flex min-w-0 items-center gap-2 px-1.5 py-1.5", railNarrow && "justify-center px-0")}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 font-display text-xs font-bold text-zinc-500 ring-1 ring-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-white/10">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className={cn("min-w-0 flex-1 self-center", railNarrow && "sr-only")}>
                <div className="truncate text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{user?.name}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <main className={cn(
          "relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-zinc-900 dark:text-zinc-100 sm:px-5 sm:py-6 lg:px-8 lg:py-8 lg:pb-10",
          "bg-zinc-50 dark:bg-zinc-950",
        )}>
          <div className="mx-auto w-full min-w-0">{children}</div>
        </main>

        {moreOpen ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-[2px] lg:hidden" aria-hidden />
        ) : null}

        <div ref={moreSheetRef} className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
          {moreOpen ? (
            <div className="mx-3 mb-2 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xl shadow-zinc-900/20 dark:border-white/10 dark:bg-zinc-950">
              <div className="border-b border-zinc-100 px-4 py-3 dark:border-white/10">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("moreNav")}</p>
              </div>
              <nav className="flex max-h-[min(50dvh,20rem)] flex-col gap-0.5 overflow-y-auto p-2">
                {mobileMoreTabs.map((item) => {
                  const active = activeNavHref === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex min-w-0 items-center gap-3 px-3 py-2.5 text-sm font-medium",
                        active
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                          active ? "bg-zinc-200 dark:bg-zinc-700/80" : "bg-zinc-100 dark:bg-white/10",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  );
                })}
                {user ? (
                  <>
                    {mobileMoreTabs.length > 0 ? (
                      <div className="mx-2 my-1 h-px bg-zinc-200 dark:bg-white/10" />
                    ) : null}
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex min-w-0 items-center gap-3 px-3 py-2.5 text-sm font-medium",
                          pathname.includes("/profile")
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-white/10">
                          <User className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 truncate">{tNav("profile")}</span>
                      </Link>
                    ) : null}
                    <Link
                      href="/settings"
                      onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex min-w-0 items-center gap-3 px-3 py-2.5 text-sm font-medium",
                          pathname.startsWith("/settings")
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-white/10">
                        <Settings className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 truncate">{t("settings")}</span>
                    </Link>
                    <button
                      type="button"
                      className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:text-red-800 dark:text-red-300/95 dark:hover:text-red-200"
                      onClick={async () => {
                        setMoreOpen(false);
                        await onLogout();
                      }}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
                        <LogOut className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 truncate">{t("logout")}</span>
                    </button>
                  </>
                ) : null}
              </nav>
            </div>
          ) : null}

          <nav className="px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-1">
            <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5 rounded-2xl border border-zinc-200/90 bg-white/95 px-1 py-1.5 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-black/40">
              {mobilePrimaryTabs.map((item) => {
                const active = activeNavHref === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold tracking-tight transition-colors",
                      active ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                        active
                          ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700/80 dark:text-zinc-100"
                          : "bg-zinc-100 text-zinc-400 dark:bg-white/10 dark:text-zinc-500",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="max-w-full truncate text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  setMoreOpen((o) => !o);
                }}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold tracking-tight transition-colors",
                  moreOpen || moreTabActive
                    ? "text-zinc-800 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                    moreOpen || moreTabActive
                      ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700/80 dark:text-zinc-100"
                      : "bg-zinc-100 text-zinc-400 dark:bg-white/10 dark:text-zinc-500",
                  )}
                >
                  <Ellipsis className="h-4 w-4" />
                </span>
                <span className="max-w-full truncate text-center leading-tight">{t("moreNav")}</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
