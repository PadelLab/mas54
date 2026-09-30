"use client";

import { AdminStudentInsights } from "@/components/admin/admin-student-insights";
import { useAuth } from "@/contexts/auth-context";

export default function AdminAnalyticsPage() {
  const { users } = useAuth();

  return (
    <div className="w-full space-y-6">
      <AdminStudentInsights users={users} />
    </div>
  );
}
