"use client";

import { formatHm12 } from "@/lib/schedule-date";
import { cn } from "@/lib/utils";
import { LIST_CONTROL_CLASS } from "@/components/list-search-field";
import { ChevronDown, Clock } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const QUARTER_MINUTES = [0, 15, 30, 45] as const;

/** Narrow list (px), max height with scroll — replaces the huge native `<select>` dropdown. */
const PANEL_WIDTH_PX = 112;
const PANEL_WIDTH_12H_PX = 132;
const PANEL_MAX_HEIGHT_PX = 220;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function quarterSlots(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of QUARTER_MINUTES) {
      out.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return out;
}

const SLOTS = quarterSlots();

function isHmString(v: string) {
  return /^(\d{1,2}):(\d{2})$/.test(v.trim());
}

function parseTime(v: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return { h: 18, m: 0 };
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return { h: 18, m: 0 };
  }
  return { h, m: min };
}

const triggerClass = cn(LIST_CONTROL_CLASS, "rounded-2xl pl-3 pr-10 leading-normal");

type Option = { value: string; label: string };

function panelPosition(trigger: DOMRect, widthPx: number): { top: number; left: number } {
  const margin = 8;
  let left = trigger.left;
  if (left + widthPx > window.innerWidth - margin) {
    left = window.innerWidth - widthPx - margin;
  }
  if (left < margin) left = margin;

  let top = trigger.bottom + 4;
  const spaceBelow = window.innerHeight - top - margin;
  if (spaceBelow < 120 && trigger.top > PANEL_MAX_HEIGHT_PX + margin) {
    top = trigger.top - 4 - PANEL_MAX_HEIGHT_PX;
  }
  return { top, left };
}

/** Scroll only inside the panel — `scrollIntoView` walks the ancestor chain and “shakes” the page. */
function scrollSelectedIntoListPanel(container: HTMLElement) {
  const selected = container.querySelector("[data-selected='true']") as HTMLElement | null;
  if (!selected) return;
  const top = selected.offsetTop;
  const bottom = top + selected.offsetHeight;
  const viewTop = container.scrollTop;
  const viewBottom = viewTop + container.clientHeight;
  if (top < viewTop) container.scrollTop = top;
  else if (bottom > viewBottom) container.scrollTop = bottom - container.clientHeight;
}

/**
 * Time `HH:MM` — compact list (every 15 min), fixed narrow panel; no native `<select>`.
 */
export function TimeSelect({
  id,
  value,
  onChange,
  className,
  selectClassName,
  disabled,
  unavailableTimes,
  hour12 = false,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
  /** `HH:MM` times that cannot be chosen (unavailable). */
  unavailableTimes?: ReadonlySet<string> | readonly string[];
  /** Show 12h (AM/PM) labels; the value stays `HH:MM`. */
  hour12?: boolean;
}) {
  const unavailable = useMemo(() => {
    if (!unavailableTimes) return new Set<string>();
    return unavailableTimes instanceof Set ? unavailableTimes : new Set(unavailableTimes);
  }, [unavailableTimes]);
  const panelWidth = hour12 ? PANEL_WIDTH_12H_PX : PANEL_WIDTH_PX;
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const labelFor = useCallback((hm: string) => (hour12 ? formatHm12(hm) : hm), [hour12]);

  const options: Option[] = useMemo(() => {
    const v = value.trim();
    if (isHmString(v) && !SLOTS.includes(v)) {
      return [{ value: v, label: labelFor(v) }, ...SLOTS.map((s) => ({ value: s, label: labelFor(s) }))];
    }
    return SLOTS.map((s) => ({ value: s, label: labelFor(s) }));
  }, [value, labelFor]);

  const selectValue = useMemo(() => {
    const v = value.trim();
    if (options.some((o) => o.value === v)) return v;
    if (!v) return "18:00";
    if (isHmString(v)) {
      const { h, m } = parseTime(v);
      const q = Math.round((h * 60 + m) / 15) * 15;
      const clamped = Math.max(0, Math.min(23 * 60 + 45, q));
      const rh = Math.floor(clamped / 60);
      const rm = clamped % 60;
      return `${pad2(rh)}:${pad2(rm)}`;
    }
    return "18:00";
  }, [value, options]);

  const close = useCallback(() => {
    setOpen(false);
    setPanelPos(null);
  }, []);

  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const next = panelPosition(el.getBoundingClientRect(), panelWidth);
    setPanelPos((prev) =>
      prev != null && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5
        ? prev
        : next,
    );
  }, [panelWidth]);

  /** Synchronous layout measure; if the ref is not ready yet, try on the next frame (Strict Mode / paint). */
  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    const measure = () => {
      const el = triggerRef.current;
      if (!el) return false;
      setPanelPos(panelPosition(el.getBoundingClientRect(), panelWidth));
      return true;
    };
    if (measure()) return;
    const id = requestAnimationFrame(() => {
      measure();
    });
    return () => cancelAnimationFrame(id);
  }, [open, selectValue, panelWidth]);

  /** Scroll only after the panel exists in the DOM (avoids a null listRef on the same layout as the button). */
  useLayoutEffect(() => {
    if (!open || panelPos == null) return;
    const id = requestAnimationFrame(() => {
      const list = listRef.current;
      if (list) scrollSelectedIntoListPanel(list);
    });
    return () => cancelAnimationFrame(id);
  }, [open, panelPos, selectValue]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updatePanelPos());
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePanelPos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const listboxId = `${id}-listbox`;

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const listPanel =
    open && portalTarget ? (
      createPortal(
        <div
          id={listboxId}
          role="listbox"
          ref={listRef}
          className="scrollbar-themed fixed z-[9999] overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/50"
          style={{
            top: panelPos?.top ?? 0,
            left: panelPos?.left ?? 0,
            width: panelWidth,
            maxHeight: PANEL_MAX_HEIGHT_PX,
            visibility: panelPos != null ? "visible" : "hidden",
            pointerEvents: panelPos != null ? "auto" : "none",
          }}
        >
          {options.map((o) => {
            const selected = o.value === selectValue;
            const blocked = unavailable.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={blocked || undefined}
                data-selected={selected ? "true" : undefined}
                disabled={blocked}
                className={cn(
                  "flex w-full items-center justify-start px-2.5 py-1.5 font-mono text-sm tabular-nums transition-colors",
                  blocked
                    ? "cursor-not-allowed text-zinc-300 line-through dark:text-zinc-600"
                    : selected
                      ? "bg-zinc-100 font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800",
                )}
                onClick={() => {
                  if (blocked) return;
                  onChange(o.value);
                  close();
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>,
        portalTarget,
      )
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        className={cn(triggerClass, "flex w-full items-center gap-2 text-left", selectClassName)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;
          if (open) {
            close();
            return;
          }
          setOpen(true);
        }}
      >
        <Clock className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={2} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-mono text-sm tabular-nums">{labelFor(selectValue)}</span>
      </button>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
        <ChevronDown className={cn("h-4 w-4", open && "rotate-180")} aria-hidden />
      </span>
      {listPanel}
    </div>
  );
}
