"use client";

import { AdminClassOverview } from "@/components/admin/admin-class-overview";
import { useAuth } from "@/contexts/auth-context";

export default function AdminAnalyticsCategoriesPage() {
  const { lessons, lessonActivityCatalog } = useAuth();

  return (
    <div className="w-full space-y-6">
      <AdminClassOverview lessons={lessons} lessonActivityCatalog={lessonActivityCatalog} />
    </div>
  );
}
