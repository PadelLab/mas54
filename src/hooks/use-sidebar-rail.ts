"use client";

import { useCallback, useEffect, useState } from "react";

/** Same key for every signed-in area — shared browser preference. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "padellab_sidebar_collapsed";
export const SIDEBAR_EXPANDED_WIDTH_CLASS = "w-[260px]";
export const SIDEBAR_COLLAPSED_WIDTH_CLASS = "w-[4.5rem]";

export function useSidebarRail() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
        if (stored === "0") setSidebarCollapsed(false);
        else setSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setCollapsedPersist = useCallback((next: boolean) => {
    setSidebarCollapsed(next);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const railNarrow = sidebarCollapsed && !sidebarHover;
  const railExpanded = !sidebarCollapsed || sidebarHover;

  const asideRailProps = {
    onMouseEnter: () => {
      if (sidebarCollapsed) setSidebarHover(true);
    },
    onMouseLeave: () => setSidebarHover(false),
  };

  return {
    sidebarCollapsed,
    railNarrow,
    railExpanded,
    setCollapsedPersist,
    asideRailProps,
  };
}
