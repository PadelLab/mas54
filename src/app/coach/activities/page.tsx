import { redirect } from "next/navigation";

/** Same as admin: the module opens on the category list. */
export default function CoachActivitiesIndexRedirectPage() {
  redirect("/coach/activities/categories");
}
