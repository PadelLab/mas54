"use client";

import { useParams } from "next/navigation";
import { ManagedUserAccount } from "@/components/admin/managed-user-account";

export default function AdminUserAccountEditPage() {
  const params = useParams();
  const userId = typeof params.userId === "string" ? params.userId : "";
  return <ManagedUserAccount urlKey={userId} mode="edit" area="admin" />;
}
