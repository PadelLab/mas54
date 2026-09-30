"use client";

import Link from "next/link";

export function AppBreadcrumb({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav className="mb-4 text-sm text-zinc-400 dark:text-zinc-500">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          {i > 0 ? <span className="mx-1.5">›</span> : null}
          {item.href ? (
            <Link href={item.href} className="transition hover:text-zinc-600 dark:hover:text-zinc-300">
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-600 dark:text-zinc-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
