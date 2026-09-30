import { redirect } from "next/navigation";

export default function AdminActivitiesSummaryRedirectPage() {
  redirect("/admin/activities/categories");
}
