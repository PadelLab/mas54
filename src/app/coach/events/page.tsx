import { redirect } from "next/navigation";

/** Opens directly on the calendar, aligned with the admin events area. */
export default function CoachEventsIndexRedirectPage() {
  redirect("/coach/events/agenda");
}
