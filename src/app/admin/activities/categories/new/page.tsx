"use client";

import { NewCategoryForm } from "@/components/new-category-form";

export default function AdminNewCategoryPage() {
  return <NewCategoryForm listPath="/admin/activities/categories" />;
}
