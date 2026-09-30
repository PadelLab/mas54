"use client";

import { useEffect } from "react";

import { usePreferences } from "@/contexts/preferences-context";

const FAVICON_LIGHT = "/brand/favicon-light.png"; // black logo (light theme)
const FAVICON_DARK = "/brand/favicon-dark.png"; // white logo (dark theme)

function setFavicon(href: string) {
  if (typeof document === "undefined") return;
  const links = document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']");
  if (links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = href;
    document.head.appendChild(link);
    return;
  }
  links.forEach((link) => {
    link.type = "image/png";
    // cache-bust so the tab updates when theme flips
    link.href = `${href}?v=${encodeURIComponent(href)}`;
  });
}

function isDarkUi(theme: "light" | "dark" | "system") {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Favicon: light theme → black logo; dark theme → white logo. */
export function ThemeFavicon() {
  const { theme, hydrated } = usePreferences();

  useEffect(() => {
    if (!hydrated) return;

    const apply = () => {
      setFavicon(isDarkUi(theme) ? FAVICON_DARK : FAVICON_LIGHT);
    };

    apply();

    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, hydrated]);

  return null;
}
