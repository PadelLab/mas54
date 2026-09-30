"use client";

import { ChevronDown, ChevronRight, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LIST_SEARCH_INPUT_CLASS, LIST_SEARCH_LABEL_CLASS, ListToolbar } from "@/components/list-search-field";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { foldEventSearch } from "@/lib/events-shared";
import type { AccountStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type RosterFilter = "all" | "active" | "deactivated";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

const AVATAR_TONES = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
];

function avatarTone(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % AVATAR_TONES.length;
  return AVATAR_TONES[n]!;
}

function StatusPill({ status, activeLabel, noAccessLabel }: { status: AccountStatus; activeLabel: string; noAccessLabel: string }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        active
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-red-500")} aria-hidden />
      {active ? activeLabel : noAccessLabel}
    </span>
  );
}

function StudentAvatar({ student }: { student: User }) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold",
        avatarTone(student.id),
      )}
    >
      {student.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={student.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(student.name)
      )}
    </span>
  );
}

export function StudentRosterCard({ hrefFor }: { hrefFor: (student: User) => string }) {
  const t = useTranslations("CoachStudents");
  const { users } = useAuth();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RosterFilter>("all");

  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);
  const filteredStudents = useMemo(() => {
    let list = students;
    if (statusFilter === "active") list = list.filter((u) => u.status === "active");
    if (statusFilter === "deactivated") list = list.filter((u) => u.status === "deactivated");
    const q = foldEventSearch(query);
    if (!q) return list;
    return list.filter((s) => foldEventSearch(`${s.name} ${s.email}`).includes(q));
  }, [students, query, statusFilter]);

  const emptyMsg = query.trim()
    ? t("emptySearch")
    : statusFilter === "active"
      ? t("emptyAdminRosterActive")
      : statusFilter === "deactivated"
        ? t("emptyAdminRosterDeactivated")
        : t("emptyAdminRoster");

  return (
    <Card className="w-full overflow-hidden p-0">
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <ListToolbar
          className="flex-row items-center gap-2"
          leading={
            <label className={cn(LIST_SEARCH_LABEL_CLASS, "max-w-none flex-1")}>
              <span className="sr-only">{t("searchPlaceholder")}</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                autoComplete="off"
                className={LIST_SEARCH_INPUT_CLASS}
              />
            </label>
          }
          trailing={
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RosterFilter)}
                className={cn(
                  "box-border h-10 min-h-10 w-auto appearance-none rounded-lg border py-0 pl-8 pr-8 text-sm font-medium outline-none transition",
                  "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900/10",
                  "dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500",
                )}
                aria-label={t("statusFilterLabelAdminRoster")}
              >
                <option value="all">{t("statusFilterAll")}</option>
                <option value="active">{t("statusFilterActive")}</option>
                <option value="deactivated">{t("statusFilterDeactivated")}</option>
              </select>
              <span className="pointer-events-none absolute left-1.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-zinc-400">
                <Filter className="h-2.5 w-2.5" />
              </span>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
            </div>
          }
        />
      </div>
      {filteredStudents.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-court/60 dark:text-emerald-200/60">{emptyMsg}</p>
      ) : (
        <ul>
          {filteredStudents.map((s) => (
            <li key={s.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
              <Link
                href={hrefFor(s)}
                className={cn(
                  "flex min-w-0 items-center gap-3 px-3 py-3.5 transition sm:px-4",
                  "hover:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-court/30",
                  "dark:hover:bg-zinc-800/40 dark:focus-visible:ring-emerald-500/40",
                )}
              >
                <StudentAvatar student={s} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{s.name}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{s.email}</p>
                  <StatusPill
                    status={s.status}
                    activeLabel={t("statusFilterActive")}
                    noAccessLabel={t("statusNoAccess")}
                  />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {t("overallLabel")}
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {s.overall}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300 dark:text-zinc-600" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
