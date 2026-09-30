import { redirect } from "next/navigation";

/** Legacy route: the form moved to “Create new user”. */
export default function AdminUsersAccessLegacyRedirect() {
  redirect("/admin/users/new");
}
