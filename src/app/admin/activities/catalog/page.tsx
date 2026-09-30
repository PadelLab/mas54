import { redirect } from "next/navigation";

/** The catalog is now managed by category (list + detail). */
export default function AdminActivitiesCatalogRedirectPage() {
  redirect("/admin/activities/categories");
}
