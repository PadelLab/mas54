"use client";

import { useParams } from "next/navigation";
import { EventParticipantsView } from "@/components/event-participants-view";

const AGENDA = "/coach/events/agenda";

export default function CoachEventParticipantsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  return <EventParticipantsView variant="coach" eventId={id} agendaPath={AGENDA} />;
}
