"use client";

import { useParams } from "next/navigation";
import { ManagedUserAccount } from "@/components/admin/managed-user-account";

export default function AdminUserAccountPage() {
  const params = useParams();
  const userId = typeof params.userId === "string" ? params.userId : "";
  return <ManagedUserAccount urlKey={userId} mode="view" area="admin" />;
}
