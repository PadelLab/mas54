import { redirect } from "next/navigation";

/** Password lives under My account; old links land there. */
export default function SettingsSecurityPage() {
  redirect("/settings/account");
}
