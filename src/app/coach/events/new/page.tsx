"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NewEventForm } from "@/components/new-event-form";
import { useAuth } from "@/contexts/auth-context";
import { hasAdminPrivileges } from "@/lib/role-utils";

const AGENDA = "/coach/events/agenda";

export default function CoachNewEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const canCreate = Boolean(user && hasAdminPrivileges(user.role));

  useEffect(() => {
    if (user && !hasAdminPrivileges(user.role)) {
      router.replace(AGENDA);
    }
  }, [user, router]);

  if (!user || !canCreate) return null;

  return (
    <div className="w-full animate-fade-slide">
      <NewEventForm variant="coach" listPath={AGENDA} />
    </div>
  );
}
