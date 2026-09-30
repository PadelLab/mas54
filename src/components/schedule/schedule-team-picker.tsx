"use client";

import type { User, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Users } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export type EquipoPickValue = "all" | "mine" | string;

type Props = {
  members: User[];
  value: EquipoPickValue;
  onSelect: (id: EquipoPickValue) => void;
  roleLabel: (role: UserRole) => string;
  allLabel: string;
  mineLabel?: string;
  showMine?: boolean;
  youId?: string;
  youBadge?: string;
  inactiveBadge: string;
};

export function ScheduleEquipoPicker({
  members,
  value,
  onSelect,
  roleLabel,
  allLabel,
  mineLabel,
  showMine,
  youId,
  youBadge,
  inactiveBadge,
}: Props) {
  return (
    <ul className="space-y-2.5">
      <li>
        <PickRow
          selected={value === "all"}
          onClick={() => onSelect("all")}
          title={allLabel}
          subtitle={null}
          icon={
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--court)] text-white">
              <Users className="h-5 w-5" />
            </span>
          }
        />
      </li>
      {showMine && mineLabel ? (
        <li>
          <PickRow
            selected={value === "mine"}
            onClick={() => onSelect("mine")}
            title={mineLabel}
            subtitle={null}
            icon={
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {youId ? initials(members.find((m) => m.id === youId)?.name ?? "?") : "Me"}
              </span>
            }
          />
        </li>
      ) : null}
      {members.map((m) => {
        const inactive = m.status !== "active";
        return (
          <li key={m.id}>
            <PickRow
              selected={value === m.id}
              onClick={() => onSelect(m.id)}
              title={m.name}
              subtitle={roleLabel(m.role)}
              inactive={inactive}
              badges={[
                youId && m.id === youId && youBadge ? youBadge : null,
                inactive ? inactiveBadge : null,
              ].filter(Boolean) as string[]}
              icon={
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-bold text-white"
                  style={{
                    background: m.avatarUrl
                      ? undefined
                      : "linear-gradient(135deg, var(--court), color-mix(in srgb, var(--accent) 55%, var(--court)))",
                  }}
                >
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(m.name)
                  )}
                </span>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

function PickRow({
  selected,
  onClick,
  title,
  subtitle,
  icon,
  badges,
  inactive,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string | null;
  icon: React.ReactNode;
  badges?: string[];
  inactive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition",
        selected
          ? "border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-900/15 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600",
        inactive && !selected && "opacity-70",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-display text-base font-semibold tracking-tight">{title}</span>
          {badges?.map((b) => (
            <span
              key={b}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                selected
                  ? "bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-800"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
              )}
            >
              {b}
            </span>
          ))}
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-0.5 block truncate text-sm",
              selected ? "text-white/70 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
      {selected ? (
        <Check className="h-5 w-5 shrink-0 opacity-90" />
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300 transition group-hover:text-zinc-500 dark:text-zinc-600" />
      )}
    </button>
  );
}
