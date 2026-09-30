import { redirect } from "next/navigation";

/** Legacy URL: redirects to the admin-aligned route. */
export default function CoachNewCategoryLegacyRedirectPage() {
  redirect("/coach/activities/categories/new");
}
