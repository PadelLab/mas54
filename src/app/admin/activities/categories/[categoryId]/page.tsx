"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { CategoryEditor } from "@/components/category-editor";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMemo } from "react";

const LIST = "/admin/activities/categories";

export default function AdminCategoryDetailPage() {
  const t = useTranslations("LessonActivityCatalog");
  const params = useParams();
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : "";
  const { lessonActivityCatalog } = useAuth();

  const cat = useMemo(
    () => lessonActivityCatalog.categories.find((c) => c.id === categoryId),
    [lessonActivityCatalog.categories, categoryId],
  );

  if (!categoryId || !cat) {
    return (
      <div className="space-y-4">
        <AppBreadcrumb items={[{ href: LIST, label: t("pageCategoriesTitle") }, { label: t("categoryNotFound") }]} />
        <p className="text-sm text-zinc-500">{t("categoryNotFound")}</p>
        <Link href={LIST} className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
          {t("backToCategories")}
        </Link>
      </div>
    );
  }

  return <CategoryEditor categoryId={categoryId} listPath={LIST} />;
}
