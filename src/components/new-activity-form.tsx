"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FORM_SUBMIT_BUTTON_CLASS, LIST_CONTROL_CLASS } from "@/components/list-search-field";
import { pageTitleClass } from "@/lib/utils";

export function NewActivityForm({
  categoryId,
  listPath,
  categoryDetailHref,
}: {
  categoryId: string;
  listPath: string;
  categoryDetailHref: string;
}) {
  const t = useTranslations("LessonActivityCatalog");
  const { lessonActivityCatalog, addLessonActivity } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [hasSides, setHasSides] = useState(false);
  const [busy, setBusy] = useState(false);

  const cat = useMemo(
    () => lessonActivityCatalog.categories.find((c) => c.id === categoryId),
    [lessonActivityCatalog.categories, categoryId],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy || !cat) return;
    setBusy(true);
    try {
      await addLessonActivity({ categoryId, name: trimmed, hasSides });
      router.push(categoryDetailHref);
    } finally {
      setBusy(false);
    }
  };

  if (!cat) {
    return (
      <div className="space-y-4">
        <AppBreadcrumb items={[{ href: listPath, label: t("pageCategoriesTitle") }, { label: t("categoryNotFound") }]} />
        <p className="text-sm text-zinc-500">{t("categoryNotFound")}</p>
        <Link href={listPath} className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
          {t("backToCategories")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <AppBreadcrumb
        items={[
          { href: listPath, label: t("pageCategoriesTitle") },
          { href: categoryDetailHref, label: cat.name },
          { label: t("pageNewActivityTitle") },
        ]}
      />
      <div>
        <h1 className={`${pageTitleClass} text-zinc-900 dark:text-zinc-50`}>{t("pageNewActivityTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("pageNewActivitySubtitle", { category: cat.name })}</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-court/12 bg-white/90 p-6 shadow-sm ring-1 ring-black/[0.02] dark:border-emerald-800/50 dark:bg-zinc-900/90 dark:ring-white/5"
      >
        <div className="space-y-2">
          <Label htmlFor="nova-act-name" className="text-xs font-semibold normal-case tracking-normal text-zinc-800 dark:text-zinc-300">
            {t("addActivityTitle")}
          </Label>
          <Input
            id="nova-act-name"
            className={LIST_CONTROL_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("activityNamePlaceholder")}
            autoComplete="off"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-court/65 dark:text-emerald-200/70">
          <input type="checkbox" className="rounded border-court/30" checked={hasSides} onChange={(e) => setHasSides(e.target.checked)} />
          {t("hasSidesHint")}
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className={FORM_SUBMIT_BUTTON_CLASS} disabled={busy || !name.trim()}>
            {t("addActivity")}
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={() => router.push(categoryDetailHref)}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
