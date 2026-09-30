import { redirect } from "next/navigation";

/** Compatibility: `/register/teacher` → `/register/coach`. */
export default function RegisterTeacherRedirect() {
  redirect("/register/coach");
}
