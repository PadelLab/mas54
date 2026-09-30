"use client";

import { useParams } from "next/navigation";
import { ManagedUserAccount } from "@/components/admin/managed-user-account";

export default function CoachStudentAccountEditPage() {
  const params = useParams();
  const studentId = typeof params.studentId === "string" ? params.studentId : "";
  return <ManagedUserAccount urlKey={studentId} mode="edit" area="coach" />;
}
