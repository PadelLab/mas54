"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { usePreferences } from "@/contexts/preferences-context";
import { homePathForUserRole } from "@/lib/role-utils";
import { cn } from "@/lib/utils";

const LOGO_BY_VARIANT = {
  black: "/brand/logo-black.png",
  white: "/brand/logo-white.png",
  gray: "/brand/logo-gray.png",
} as const;

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** Compact version (collapsed sidebar / icon). */
  compact?: boolean;
  /** Force a color (e.g. dark hero → white). Without this, follows the theme. */
  variant?: keyof typeof LOGO_BY_VARIANT;
  width?: number;
  height?: number;
};

export function BrandLogo({
  href = "/",
  className,
  imgClassName,
  priority,
  compact = false,
  variant,
  width,
  height,
}: BrandLogoProps) {
  const { user } = useAuth();
  const { theme, hydrated } = usePreferences();
  const [src, setSrc] = useState(
    variant ? LOGO_BY_VARIANT[variant] : LOGO_BY_VARIANT.gray,
  );
  const to = href === "/" && user ? homePathForUserRole(user.role) : href;

  useEffect(() => {
    if (variant) {
      setSrc(LOGO_BY_VARIANT[variant]);
      return;
    }
    if (!hydrated) return;
    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      setSrc(dark ? LOGO_BY_VARIANT.white : LOGO_BY_VARIANT.black);
    };
    apply();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, hydrated, variant]);

  const image = (
    <Image
      src={src}
      alt="+54"
      width={width ?? (compact ? 44 : 220)}
      height={height ?? (compact ? 44 : 56)}
      priority={priority}
      className={cn(
        compact
          ? "h-10 w-10 object-contain object-left"
          : "h-9 w-auto max-w-[7.5rem] object-contain object-left sm:h-11 sm:max-w-[12rem]",
        imgClassName,
      )}
    />
  );

  if (to === null) {
    return <span className={cn("inline-flex items-center", className)}>{image}</span>;
  }

  return (
    <Link href={to} className={cn("inline-flex items-center", className)} aria-label="+54">
      {image}
    </Link>
  );
}
