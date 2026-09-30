import { redirect } from "next/navigation";

/** The module opens directly on the category list (no intermediate hub). */
export default function AdminActivitiesIndexRedirectPage() {
  redirect("/admin/activities/categories");
}
