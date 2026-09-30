"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { homePathForUserRole } from "@/lib/role-utils";

/** Universal shortcut: redirects to the authenticated user's dashboard. */
export default function HomeRedirectPage() {
  const { user, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(homePathForUserRole(user.role));
  }, [hydrated, user, router]);

  return null;
}
