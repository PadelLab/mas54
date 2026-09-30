"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { appLocaleToIntlLocale } from "@/lib/schedule-date";
import { cn, formatDate, pageTitleClass } from "@/lib/utils";
import type { AccountStatus, User, UserRole } from "@/lib/types";
import {
  ADMIN_ALUNOS_CREATED_FROM_PARAM,
  ADMIN_ALUNOS_CREATED_TO_PARAM,
  filterStudentsByCreatedAtRange,
  parseYmdLocalDate,
} from "@/lib/admin-student-analytics";
import { MetricStatCard } from "@/components/metric-stat-card";
import { LIST_CONTROL_CLASS, LIST_SEARCH_INPUT_CLASS, LIST_SEARCH_LABEL_CLASS, ListToolbar } from "@/components/list-search-field";
import { ALL_USER_ROLES, appearsInAdministratorsUserList, appearsInCoachesUserList, hasAdminPrivileges } from "@/lib/role-utils";
import { foldEventSearch } from "@/lib/events-shared";
import { userAccountPath } from "@/lib/student-url-key";
import {
  Calendar,
  CalendarClock,
  MoreVertical,
  Plus,
  Search,
  UserMinus,
  UserRound,
  Users,
} from "lucide-react";

function accountStatusTranslationKey(status: AccountStatus): `accountStatus.${AccountStatus}` {
  return `accountStatus.${status}`;
}

function sortByName(a: User, b: User) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

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

function isUpcomingAccess(u: User, nowMs = Date.now()) {
  if (!u.accessExpiresAt || u.role !== "student") return false;
  const t = new Date(u.accessExpiresAt).getTime();
  if (Number.isNaN(t) || t < nowMs) return false;
  return t <= nowMs + 30 * 24 * 60 * 60 * 1000;
}

export type AdminUsersSectionMode = "students" | "coaches" | "administrators";

function AdminUsersSectionBody({ mode }: { mode: AdminUsersSectionMode }) {
  const t = useTranslations("AdminUsersList");
  const tPages = useTranslations("AdminUsersPages");
  const tHub = useTranslations("AdminUsersHub");
  const tProfile = useTranslations("Profile");
  const tConfirm = useTranslations("ConfirmDialog");
  const locale = useLocale();
  const intlLocale = useMemo(() => appLocaleToIntlLocale(locale), [locale]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { users, user: me, reactivateStudent, setAccountStatus, setUserRole, deleteUser, refresh } = useAuth();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [roleErr, setRoleErr] = useState<string | null>(null);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const roleLabel = (role: UserRole) => tProfile(`roles.${role}`);

  const registrationRange = useMemo(() => {
    if (mode !== "students") return null;
    let from = parseYmdLocalDate(searchParams.get(ADMIN_ALUNOS_CREATED_FROM_PARAM));
    let to = parseYmdLocalDate(searchParams.get(ADMIN_ALUNOS_CREATED_TO_PARAM));
    if (!from || !to) return null;
    if (from > to) {
      const s = from;
      from = to;
      to = s;
    }
    return { from, to };
  }, [mode, searchParams]);

  const baseRows = useMemo(() => {
    let list: User[];
    if (mode === "students") list = users.filter((u) => u.role === "student");
    else if (mode === "coaches") list = users.filter((u) => appearsInCoachesUserList(u.role));
    else list = users.filter((u) => appearsInAdministratorsUserList(u.role));
    if (mode === "students" && registrationRange) {
      list = filterStudentsByCreatedAtRange(list, registrationRange.from, registrationRange.to);
    }
    return [...list].sort(sortByName);
  }, [users, mode, registrationRange]);

  const stats = useMemo(() => {
    const total = baseRows.length;
    const active = baseRows.filter((u) => u.status === "active").length;
    const deactivated = baseRows.filter((u) => u.status === "deactivated" || u.status === "expired").length;
    const upcoming = baseRows.filter((u) => isUpcomingAccess(u)).length;
    return { total, active, deactivated, upcoming };
  }, [baseRows]);

  const rows = useMemo(() => {
    const q = foldEventSearch(query);
    return baseRows.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return foldEventSearch(`${u.name} ${u.email}`).includes(q);
    });
  }, [baseRows, query, statusFilter]);

  const onRoleChange = async (userId: string, next: UserRole) => {
    setRoleErr(null);
    setRoleBusyId(userId);
    const r = await setUserRole(userId, next);
    if (r.ok) await refresh();
    setRoleBusyId(null);
    if (!r.ok) {
      setRoleErr(r.message ?? t("roleChangeFailed"));
      return;
    }
    const staysHere =
      (mode === "students" && next === "student") ||
      (mode === "coaches" && appearsInCoachesUserList(next)) ||
      (mode === "administrators" && appearsInAdministratorsUserList(next));
    if (!staysHere) {
      if (next === "student") router.push("/admin/users/students");
      else if (appearsInCoachesUserList(next)) router.push("/admin/users/coaches");
      else router.push("/admin/users/administrators");
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setRoleErr(null);
    const r = await deleteUser(deleteTarget.id);
    setDeleteBusy(false);
    if (!r.ok) {
      const code = r.message;
      setRoleErr(
        code === "LAST_ADMIN"
          ? t("deleteUserLastAdmin")
          : code === "DELETE_SELF"
            ? t("deleteUserSelf")
            : code === "ACCOUNT_ACTIVE"
              ? t("deleteUserMustDeactivate")
              : t("deleteUserFailed"),
      );
      return;
    }
    setDeleteTarget(null);
  };

  const pageTitle =
    mode === "students" ? tPages("studentsTitle") : mode === "coaches" ? tPages("coachesTitle") : tPages("administratorsTitle");
  const pageIntro =
    mode === "students"
      ? tPages("studentsIntro")
      : mode === "coaches"
        ? tPages("coachesIntro")
        : tPages("administratorsIntro");
  const addHref =
    mode === "coaches"
      ? "/admin/users/new?source=coaches"
      : mode === "administrators"
        ? "/admin/users/new?source=administrators"
        : null;
  const addLabel = mode === "coaches" ? tPages("addCoach") : mode === "administrators" ? tPages("addAdmin") : null;
  const searchPlaceholder =
    mode === "students"
      ? t("searchPlaceholderStudents")
      : mode === "coaches"
        ? t("searchPlaceholderTeachers")
        : t("searchPlaceholderAdmins");
  const statTotalTitle =
    mode === "students" ? t("statTotalStudents") : mode === "coaches" ? t("statTotalTeachers") : t("statTotalAdmins");
  const statActiveTitle =
    mode === "students" ? t("statActiveStudents") : mode === "coaches" ? t("statActiveTeachers") : t("statActiveAdmins");
  const colPerson =
    mode === "students" ? t("colPersonStudents") : mode === "coaches" ? t("colPersonTeachers") : t("colPersonAdmins");
  const showUntil = mode === "students";
  const emptyMsg =
    query.trim() || statusFilter !== "all"
      ? t("emptySearch")
      : mode === "students"
        ? registrationRange
          ? t("emptyStudentsInRange")
          : t("emptyStudents")
        : mode === "coaches"
          ? t("emptyTeachers")
          : t("emptyAdmins");

  const dateFmtOpts: Intl.DateTimeFormatOptions = { dateStyle: "medium" };
  const filterFromLabel = registrationRange?.from.toLocaleDateString(locale, dateFmtOpts) ?? "";
  const filterToLabel = registrationRange?.to.toLocaleDateString(locale, dateFmtOpts) ?? "";

  const accessUntil = (u: User) => {
    if (!u.accessExpiresAt || u.role !== "student") return null;
    return formatDate(u.accessExpiresAt, intlLocale);
  };

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <nav className="mb-3 text-sm text-zinc-400 dark:text-zinc-500">
          <Link href="/admin/users" className="font-medium transition hover:text-court">
            {tHub("title")}
          </Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-600 dark:text-zinc-300">{pageTitle}</span>
        </nav>
        <div>
          <h1 className={cn(pageTitleClass, "text-court")}>{pageTitle}</h1>
          {pageIntro.trim() ? <p className="mt-1 max-w-2xl text-sm text-court/60">{pageIntro}</p> : null}
        </div>
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2", mode === "students" ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        <MetricStatCard
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#fff0e6] text-[#e85d04]"
          label={statTotalTitle}
          value={stats.total}
        />
        <MetricStatCard
          icon={<UserRound className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#e6f7ee] text-[#16a34a]"
          label={statActiveTitle}
          value={stats.active}
        />
        <MetricStatCard
          icon={<UserMinus className="h-[18px] w-[18px]" strokeWidth={2} />}
          iconClass="bg-[#fde8e8] text-[#e11d48]"
          label={t("statDeactivated")}
          value={stats.deactivated}
        />
        {mode === "students" ? (
          <MetricStatCard
            icon={<CalendarClock className="h-[18px] w-[18px]" strokeWidth={2} />}
            iconClass="bg-[#eee8fb] text-[#7c5cbf]"
            label={t("statUpcoming")}
            value={stats.upcoming}
          />
        ) : null}
      </div>

      {mode === "students" && registrationRange ? (
        <div className="flex flex-col gap-2 rounded-xl border border-court/15 bg-court/5 px-4 py-3 text-sm text-court dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-100/90 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("registrationFilterBanner", { from: filterFromLabel, to: filterToLabel })}</p>
          <Link href="/admin/users/students" className="shrink-0 font-semibold text-accent underline-offset-2 hover:underline">
            {t("registrationFilterClear")}
          </Link>
        </div>
      ) : null}

      {roleErr ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{roleErr}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex w-full flex-col gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
          <ListToolbar
            leading={
              <label className={cn(LIST_SEARCH_LABEL_CLASS, "sm:max-w-lg")}>
                <span className="sr-only">{searchPlaceholder}</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className={LIST_SEARCH_INPUT_CLASS}
                />
              </label>
            }
            trailing={
              <>
                <select
                  aria-label={t("filterAllStatus")}
                  className="box-border h-10 min-h-10 min-w-0 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-0 text-sm font-medium text-zinc-700 outline-none transition-colors focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-500 sm:w-auto sm:max-w-[9.5rem]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | AccountStatus)}
                >
                  <option value="all">{t("filterAllStatus")}</option>
                  <option value="active">{t("accountStatus.active")}</option>
                  <option value="pending">{t("accountStatus.pending")}</option>
                  <option value="expired">{t("accountStatus.expired")}</option>
                  <option value="deactivated">{t("accountStatus.deactivated")}</option>
                </select>
                {addHref && addLabel ? (
                  <Button asChild className="h-10 min-h-10 shrink-0 rounded-lg px-4 py-0 shadow-md">
                    <Link href={addHref}>
                      <Plus className="h-4 w-4" aria-hidden />
                      {addLabel}
                    </Link>
                  </Button>
                ) : null}
              </>
            }
          />
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">{emptyMsg}</p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 md:hidden">
              {rows.map((u) => {
                const until = accessUntil(u);
                return (
                  <li
                    key={u.id}
                    className="flex cursor-pointer flex-col gap-3 px-4 py-4"
                    onClick={(e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest("a, button, select, input, [role='menu']")) return;
                      router.push(userAccountPath("admin", u, users));
                    }}
                  >
                    <Link href={userAccountPath("admin", u, users)} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-court/30">
                      <AccountPerson user={u} />
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <RoleSelect
                        user={u}
                        disabled={me?.id === u.id || roleBusyId === u.id}
                        selfNote={t("selfNote")}
                        roleLabel={roleLabel}
                        onRoleChange={(next) => void onRoleChange(u.id, next)}
                      />
                      <StatusPill label={t(accountStatusTranslationKey(u.status))} status={u.status} />
                      {showUntil && until ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                          {until}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-stretch gap-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {t("colActions")}
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <RowActions
                          user={u}
                          meId={me?.id}
                          actorRole={me?.role}
                          menuOpen={menuUserId === u.id}
                          onMenuOpenChange={(open) => setMenuUserId(open ? u.id : null)}
                          onReactivateStudent={() => reactivateStudent(u.id)}
                          onReactivateStaff={() => setAccountStatus(u.id, "active")}
                          onDeactivate={() => setAccountStatus(u.id, "deactivated")}
                          onDelete={() => setDeleteTarget(u)}
                          reactivateLabel={t("reactivate")}
                          deactivateLabel={t("deactivate")}
                          deleteLabel={t("deleteUser")}
                          actionsLabel={t("moreActions")}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
            <table className={cn("w-full text-left text-sm", showUntil ? "min-w-[820px]" : "min-w-[700px]")}>
              <thead>
                <tr className="border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                  <th className="px-5 py-3">{colPerson}</th>
                  <th className="px-3 py-3">{t("colRole")}</th>
                  <th className="px-3 py-3">{t("colStatus")}</th>
                  {showUntil ? <th className="px-3 py-3">{t("colUntil")}</th> : null}
                  <th className="px-5 py-3">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const until = accessUntil(u);
                  return (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                      onClick={(e) => {
                        const el = e.target as HTMLElement;
                        if (el.closest("a, button, select, input, [role='menu']")) return;
                        router.push(userAccountPath("admin", u, users));
                      }}
                    >
                      <td className="px-5 py-4">
                        <Link href={userAccountPath("admin", u, users)} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-court/30">
                          <AccountPerson user={u} />
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        <RoleSelect
                          user={u}
                          disabled={me?.id === u.id || roleBusyId === u.id}
                          selfNote={t("selfNote")}
                          roleLabel={roleLabel}
                          onRoleChange={(next) => void onRoleChange(u.id, next)}
                        />
                      </td>
                      <td className="px-3 py-4">
                        <StatusPill label={t(accountStatusTranslationKey(u.status))} status={u.status} />
                      </td>
                      {showUntil ? (
                      <td className="px-3 py-4 text-zinc-600 dark:text-zinc-300">
                        {until ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                            {until}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      ) : null}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <RowActions
                            user={u}
                            meId={me?.id}
                            actorRole={me?.role}
                            menuOpen={menuUserId === u.id}
                            onMenuOpenChange={(open) => setMenuUserId(open ? u.id : null)}
                            onReactivateStudent={() => reactivateStudent(u.id)}
                            onReactivateStaff={() => setAccountStatus(u.id, "active")}
                            onDeactivate={() => setAccountStatus(u.id, "deactivated")}
                            onDelete={() => setDeleteTarget(u)}
                            reactivateLabel={t("reactivate")}
                            deactivateLabel={t("deactivate")}
                            deleteLabel={t("deleteUser")}
                            actionsLabel={t("moreActions")}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        title={t("deleteUserConfirmTitle")}
        description={
          deleteTarget
            ? t("deleteUserConfirm", { name: deleteTarget.name })
            : t("deleteUserConfirm", { name: "" })
        }
        confirmLabel={deleteBusy ? t("deleteUserBusy") : t("deleteUser")}
        cancelLabel={tConfirm("cancel")}
        confirmDisabled={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={() => {
          void onConfirmDelete();
        }}
      />
    </div>
  );
}

function AccountPerson({ user: u }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold",
          avatarTone(u.id),
        )}
      >
        {u.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(u.name)
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{u.name}</p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
      </div>
    </div>
  );
}

function StatusPill({ label, status }: { label: string; status: AccountStatus }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
      : status === "deactivated" || status === "expired"
        ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200";
  const dot =
    status === "active" ? "bg-emerald-500" : status === "deactivated" || status === "expired" ? "bg-red-500" : "bg-amber-500";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}

function RowActions({
  user: u,
  meId,
  actorRole,
  menuOpen,
  onMenuOpenChange,
  onReactivateStudent,
  onReactivateStaff,
  onDeactivate,
  onDelete,
  reactivateLabel,
  deactivateLabel,
  deleteLabel,
  actionsLabel,
}: {
  user: User;
  meId?: string;
  actorRole?: UserRole;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onReactivateStudent: () => void;
  onReactivateStaff: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  reactivateLabel: string;
  deactivateLabel: string;
  deleteLabel: string;
  actionsLabel: string;
}) {
  const isSelf = meId === u.id;
  if (isSelf) return null;

  const canDelete = hasAdminPrivileges(actorRole ?? "student") && u.status !== "active";
  const inactive = u.status === "expired" || u.status === "deactivated" || u.status === "pending";

  return (
    <AccountActionsMenu
      open={menuOpen}
      onOpenChange={onMenuOpenChange}
      actionsLabel={actionsLabel}
      reactivateLabel={reactivateLabel}
      deactivateLabel={deactivateLabel}
      deleteLabel={deleteLabel}
      canDelete={canDelete}
      inactive={inactive}
      onReactivate={u.role === "student" ? onReactivateStudent : onReactivateStaff}
      onDeactivate={onDeactivate}
      onDelete={onDelete}
    />
  );
}

function AccountActionsMenu({
  open,
  onOpenChange,
  actionsLabel,
  reactivateLabel,
  deactivateLabel,
  deleteLabel,
  canDelete,
  inactive,
  onReactivate,
  onDeactivate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionsLabel: string;
  reactivateLabel: string;
  deactivateLabel: string;
  deleteLabel: string;
  canDelete: boolean;
  inactive: boolean;
  onReactivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const menuWidth = 180;

  const updatePos = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) {
      setPos(null);
      return;
    }
    setPos({
      top: r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = btnRef.current?.getBoundingClientRect();
    if (!trigger || trigger.width < 1 || trigger.height < 1) return;
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (btnRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, onOpenChange, updatePos]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const menu =
    open && pos && portalTarget
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[9999] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              top: pos.top,
              left: pos.left,
              width: menuWidth,
            }}
          >
            {inactive ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => {
                  onOpenChange(false);
                  onReactivate();
                }}
              >
                {reactivateLabel}
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => {
                  onOpenChange(false);
                  onDeactivate();
                }}
              >
                {deactivateLabel}
              </button>
            )}
            {canDelete ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
              >
                {deleteLabel}
              </button>
            ) : null}
          </div>,
          portalTarget,
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={actionsLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        onClick={() => onOpenChange(!open)}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {menu}
    </>
  );
}

function RoleSelect({
  user,
  disabled,
  selfNote,
  roleLabel,
  onRoleChange,
}: {
  user: User;
  disabled: boolean;
  selfNote: string;
  roleLabel: (role: UserRole) => string;
  onRoleChange: (next: UserRole) => void;
}) {
  return (
    <select
      aria-label={roleLabel(user.role)}
      title={disabled ? selfNote : undefined}
      disabled={disabled}
      className={cn(
        LIST_CONTROL_CLASS,
        "h-9 min-h-9 w-[min(100%,13.5rem)] py-0 text-sm disabled:cursor-not-allowed disabled:opacity-70",
      )}
      value={user.role}
      onChange={(e) => {
        const next = e.target.value as UserRole;
        if (disabled || next === user.role) return;
        onRoleChange(next);
      }}
    >
      {ALL_USER_ROLES.map((r) => (
        <option key={r} value={r}>
          {roleLabel(r)}
        </option>
      ))}
    </select>
  );
}

export function AdminUsersSection(props: { mode: AdminUsersSectionMode }) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-court/10 dark:bg-emerald-950/40" aria-hidden />}>
      <AdminUsersSectionBody {...props} />
    </Suspense>
  );
}
