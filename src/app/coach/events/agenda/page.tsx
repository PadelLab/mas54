"use client";

import { useAuth } from "@/contexts/auth-context";
import { EventsAgendaList } from "@/components/events-agenda-list";
import { hasAdminPrivileges } from "@/lib/role-utils";

export default function CoachEventsAgendaPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="animate-fade-slide">
      <EventsAgendaList
        variant="coach"
        createHref={hasAdminPrivileges(user.role) ? "/coach/events/new" : undefined}
      />
    </div>
  );
}
