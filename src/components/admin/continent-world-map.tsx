"use client";

import { CONTINENT_IDS, type ContinentId } from "@/lib/continents";
import type { ContinentNationalitySlice } from "@/lib/admin-student-analytics";
import { cn } from "@/lib/utils";
import {
  Annotation,
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  createCoordinates,
  type GeographiesProps,
} from "@vnedyalk0v/react19-simple-maps";
import { useEffect, useRef, useState } from "react";
import worldCountries from "world-atlas/countries-110m.json";

const WORLD_GEOGRAPHY = worldCountries as GeographiesProps["geography"];

const HIDDEN_GEO_IDS = new Set(["010", "10", 10, "260", 260]);

const CONTINENT_MARKERS: Record<
  ContinentId,
  { coordinates: ReturnType<typeof createCoordinates>; dx: number; dy: number }
> = {
  northAmerica: { coordinates: createCoordinates(-102, 52), dx: -8, dy: -24 },
  southAmerica: { coordinates: createCoordinates(-58, -14), dx: -64, dy: 8 },
  europe: { coordinates: createCoordinates(12, 52), dx: 4, dy: -28 },
  africa: { coordinates: createCoordinates(22, 4), dx: 42, dy: 16 },
  asia: { coordinates: createCoordinates(88, 48), dx: 36, dy: -22 },
  oceania: { coordinates: createCoordinates(134, -25), dx: 16, dy: 30 },
};

function formatPct(count: number, total: number) {
  const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

export function ContinentWorldMap({
  counts,
  labels,
  breakdown,
  total,
}: {
  counts: Record<ContinentId, number>;
  labels: Record<ContinentId, string>;
  breakdown: Record<ContinentId, ContinentNationalitySlice[]>;
  total: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{
    id: ContinentId;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  const openMarker = (id: ContinentId, event: React.MouseEvent | React.KeyboardEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const point =
      "clientX" in event
        ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
        : { x: rect.width * 0.5, y: rect.height * 0.4 };
    setSelected((prev) =>
      prev?.id === id
        ? null
        : {
            id,
            x: Math.min(Math.max(point.x, 96), rect.width - 96),
            y: Math.min(Math.max(point.y, 16), rect.height - 16),
          },
    );
  };

  const selectedCount = selected ? (counts[selected.id] ?? 0) : 0;
  const selectedSlices = selected ? (breakdown[selected.id] ?? []) : [];

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full max-w-[32rem] sm:w-[86%] [--land:#d7efe3] [--land-stroke:#b5d6c4] [--label:#71717a] dark:[--land:#134e4a] dark:[--land-stroke:#115e59] dark:[--label:#a1a1aa]"
      onClick={() => setSelected(null)}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{
          scale: 142,
          center: createCoordinates(10, 6),
        }}
        width={800}
        height={330}
        className="h-auto w-full"
      >
        <Geographies
          geography={WORLD_GEOGRAPHY}
          parseGeographies={(geos) =>
            geos.filter((geo) => !HIDDEN_GEO_IDS.has(geo.id as string | number))
          }
        >
          {({ geographies }) =>
            geographies.map((geo, index) => (
              <Geography
                key={String(geo.id ?? geo.properties?.name ?? index)}
                geography={geo}
                tabIndex={-1}
                style={{
                  default: {
                    fill: "var(--land)",
                    stroke: "var(--land-stroke)",
                    strokeWidth: 0.55,
                    outline: "none",
                    pointerEvents: "none",
                  },
                  hover: {
                    fill: "var(--land)",
                    stroke: "var(--land-stroke)",
                    outline: "none",
                    pointerEvents: "none",
                  },
                  pressed: {
                    fill: "var(--land)",
                    stroke: "var(--land-stroke)",
                    outline: "none",
                    pointerEvents: "none",
                  },
                }}
              />
            ))
          }
        </Geographies>

        {CONTINENT_IDS.map((id) => {
          const count = counts[id] ?? 0;
          const active = count > 0;
          const isOpen = selected?.id === id;
          const marker = CONTINENT_MARKERS[id];
          const pct = formatPct(count, total);
          const label = `${labels[id]}: ${count} (${pct}%)`;
          return (
            <g key={id}>
              <Marker
                coordinates={marker.coordinates}
                onClick={(event) => {
                  event.stopPropagation();
                  openMarker(id, event);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  openMarker(id, event);
                }}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-expanded={isOpen}
                aria-pressed={isOpen}
                style={{
                  default: { cursor: "pointer", outline: "none" },
                  hover: { cursor: "pointer", outline: "none" },
                  pressed: { cursor: "pointer", outline: "none" },
                  focused: { cursor: "pointer", outline: "none" },
                }}
              >
                <circle r={14} fill="transparent" />
                <circle
                  r={isOpen ? 5.6 : 4.4}
                  className={cn(
                    active
                      ? "fill-emerald-700 dark:fill-emerald-400"
                      : "fill-zinc-300 dark:fill-zinc-600",
                  )}
                  stroke={isOpen ? "#059669" : active ? "#ecfdf5" : "#f4f4f5"}
                  strokeWidth={isOpen ? 2.2 : 1.4}
                />
              </Marker>
              <Annotation
                subject={marker.coordinates}
                dx={marker.dx}
                dy={marker.dy}
                connectorProps={{ stroke: "transparent" }}
              >
                <text
                  className="pointer-events-none"
                  fill="var(--label)"
                  fontSize={10}
                  fontWeight={500}
                  stroke="none"
                >
                  {label}
                </text>
              </Annotation>
            </g>
          );
        })}
      </ComposableMap>

      {selected ? (
        <div
          role="dialog"
          aria-label={labels[selected.id]}
          className="absolute z-10 w-[min(13.5rem,calc(100%-1rem))] max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-zinc-200/90 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{ left: selected.x, top: selected.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="font-display text-sm font-semibold text-court dark:text-zinc-100">{labels[selected.id]}</p>
          <p className="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {selectedCount} ({formatPct(selectedCount, total)}%)
          </p>
          {selectedSlices.length > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-300">
              {selectedSlices.map((slice) => (
                <li key={slice.key} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{slice.label}</span>
                  <span className="shrink-0 tabular-nums text-zinc-400">{slice.count}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
