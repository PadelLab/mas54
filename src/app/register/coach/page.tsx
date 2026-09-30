import { redirect } from "next/navigation";

/** Coaches are created by the superadmin in /admin/users — no public self-signup. */
export default function RegisterCoachPage() {
  redirect("/login");
}
