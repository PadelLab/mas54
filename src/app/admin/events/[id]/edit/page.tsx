"use client";

import { useParams } from "next/navigation";
import { NewEventForm } from "@/components/new-event-form";

const AGENDA = "/admin/events/agenda";

export default function AdminEventEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  return <NewEventForm variant="admin" listPath={AGENDA} eventId={id} />;
}
