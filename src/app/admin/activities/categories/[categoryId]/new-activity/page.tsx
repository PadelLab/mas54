"use client";

import { NewActivityForm } from "@/components/new-activity-form";
import { useParams } from "next/navigation";

const LIST = "/admin/activities/categories";

export default function AdminNewActivityPage() {
  const params = useParams();
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : "";

  return (
    <NewActivityForm
      categoryId={categoryId}
      listPath={LIST}
      categoryDetailHref={categoryId ? `${LIST}/${categoryId}` : LIST}
    />
  );
}
