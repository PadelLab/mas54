"use client";

import { useParams } from "next/navigation";
import { EventParticipantsView } from "@/components/event-participants-view";

const AGENDA = "/admin/events/agenda";

export default function AdminEventParticipantsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  return <EventParticipantsView variant="admin" eventId={id} agendaPath={AGENDA} />;
}
