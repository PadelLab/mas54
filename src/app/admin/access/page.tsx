import { redirect } from "next/navigation";

/** Legacy route: redirects to Create new user (/admin/users/new). */
export default function AdminAccessLegacyRedirect() {
  redirect("/admin/users/new");
}
