import { redirect } from "next/navigation";

/** Compatibility: `/admin/users/teachers` → `/admin/users/coaches`. */
export default function AdminUsersTeachersRedirect() {
  redirect("/admin/users/coaches");
}
