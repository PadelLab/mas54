"use client";

import { EventsAgendaList } from "@/components/events-agenda-list";

export default function AdminEventsAgendaPage() {
  return (
    <div>
      <EventsAgendaList variant="admin" createHref="/admin/events/new" />
    </div>
  );
}
