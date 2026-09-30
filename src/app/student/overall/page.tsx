"use client";

import { StudentOverallDashboard } from "@/components/student/student-overall-dashboard";
import { useAuth } from "@/contexts/auth-context";

export default function StudentOverallPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <StudentOverallDashboard subject={user} variant="self" />;
}
