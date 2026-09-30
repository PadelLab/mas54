"use client";

import { NewEventForm } from "@/components/new-event-form";

const AGENDA = "/admin/events/agenda";

export default function AdminNewEventPage() {
  return <NewEventForm variant="admin" listPath={AGENDA} />;
}
