"use client";

import { AppBreadcrumb } from "@/components/app-breadcrumb";

export function AdminUsersBackLink({
  href,
  parentLabel,
  currentLabel,
}: {
  href: string;
  parentLabel: string;
  currentLabel: string;
}) {
  return <AppBreadcrumb items={[{ href, label: parentLabel }, { label: currentLabel }]} />;
}
