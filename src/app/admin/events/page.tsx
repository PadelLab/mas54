import { redirect } from "next/navigation";

/** Opens directly on the calendar (no intermediate hub), like Categories in activities. */
export default function AdminEventsIndexRedirectPage() {
  redirect("/admin/events/agenda");
}
