"use client";

import { useAuth } from "@/contexts/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { UserRole } from "@/lib/types";
import { hasCoachPrivileges, homePathForUserRole, isDeveloper } from "@/lib/role-utils";
import { pageTitleClass } from "@/lib/utils";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

function roleMatchesGate(userRole: UserRole, gate: UserRole | "any"): boolean {
  if (gate === "any") return true;
  if (gate === "superadmin") return isDeveloper(userRole);
  if (gate === "coach") return hasCoachPrivileges(userRole);
  return userRole === gate;
}

export function AccessGate({
  role,
  children,
}: {
  role: UserRole | "any";
  children: React.ReactNode;
}) {
  const { user, accessBlocked, logout, hydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      const next = pathname && !pathname.startsWith("/login") ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [user, router, hydrated, pathname]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (role !== "any" && !roleMatchesGate(user.role, role)) {
      router.replace(homePathForUserRole(user.role));
    }
  }, [user, role, router, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">…</p>
      </div>
    );
  }

  if (!user) return null;

  if (role !== "any" && !roleMatchesGate(user.role, role)) return null;

  if (accessBlocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
        <Card className="max-w-md rounded-3xl border-zinc-200/80 text-center shadow-xl dark:border-zinc-600/80">
          <h1 className={`${pageTitleClass} text-zinc-900 dark:text-zinc-50`}>Acesso encerrado</h1>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Seu período de acesso expirou ou a conta foi desativada. Solicite apoio à administração do
            Padel Lab.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Voltar ao login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
