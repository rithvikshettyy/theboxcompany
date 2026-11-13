import type { ReactNode } from "react";
import { HEATMAP_DAYS, HEATMAP_HOURS } from "@/lib/assumptions";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

/**
 * Loading shapes for every section (CLAUDE.md §4 rule 19). Each echoes its real chart so the
 * swap causes no layout shift. The arrays below are skeleton geometry, not plant data.
 */
export type SkeletonVariant =
  | "bars"
  | "hbars"
  | "rows"
  | "grid"
  | "table"
  | "flow"
  | "cards"
  | "tiles"
  | "sliders";

const BARS = ["h-full", "h-2/5", "h-1/4", "h-1/5", "h-1/6", "h-3/5"];
const HBARS = ["w-full", "w-4/5", "w-3/5", "w-2/5", "w-1/3", "w-1/4", "w-1/5"];
const RUN_ROWS = [
  ["w-2/5", "w-1/3", "w-1/6"],
  ["w-1/2", "w-1/4", "w-1/6"],
  ["w-1/3", "w-1/3", "w-1/4"],
  ["w-2/5", "w-2/5", "w-1/8"],
];
const FLOW_NODES = 8;
const TABLE_ROWS = 6;
const REC_CARDS = 3;
const KPI_TILES = 6;
const SLIDERS = 5;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

type Props = { variant: SkeletonVariant; className?: string };

export function ChartSkeleton({ variant, className }: Props) {
  return (
    <div aria-hidden="true" className={cn("w-full min-w-0", className)}>
      {SHAPES[variant]()}
    </div>
  );
}

const SHAPES: Record<SkeletonVariant, () => ReactNode> = {
  bars: () => (
    <div className="flex h-full items-end gap-3 border-b border-line2 pb-px">
      {BARS.map((h, i) => (
        <Skeleton key={i} className={cn("flex-1 rounded-b-none", h)} />
      ))}
    </div>
  ),
  hbars: () => (
    <div className="flex h-full flex-col justify-between gap-2">
      {HBARS.map((w, i) => (
        <div key={i} className="flex flex-1 items-center gap-3">
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className={cn("h-full max-h-6", w)} />
        </div>
      ))}
    </div>
  ),
  rows: () => (
    <div className="flex h-full flex-col justify-between gap-3">
      {RUN_ROWS.map((segs, i) => (
        <div key={i} className="flex flex-1 gap-1">
          {segs.map((w, j) => (
            <Skeleton key={j} className={cn("h-full", w)} />
          ))}
        </div>
      ))}
    </div>
  ),
  grid: () => (
    <div
      className="grid h-full gap-0.5"
      style={{ gridTemplateColumns: `repeat(${HEATMAP_HOURS}, minmax(0, 1fr))` }}
    >
      {range(HEATMAP_DAYS * HEATMAP_HOURS).map((i) => (
        <Skeleton key={i} className="rounded-[2px]" />
      ))}
    </div>
  ),
  table: () => (
    <div className="flex h-full flex-col">
      <Skeleton className="mb-3 h-3 w-full opacity-60" />
      {range(TABLE_ROWS).map((i) => (
        <div key={i} className="flex flex-1 items-center gap-4 border-b border-line">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/5" />
          <Skeleton className="ml-auto h-5 w-14" />
        </div>
      ))}
    </div>
  ),
  flow: () => (
    <div className="flex h-full items-center gap-1 md:gap-2">
      {range(FLOW_NODES).map((i) => (
        <Skeleton key={i} className="h-16 min-w-0 flex-1 rounded-panel" />
      ))}
    </div>
  ),
  cards: () => (
    <div className="grid gap-4 md:grid-cols-3">
      {range(REC_CARDS).map((i) => (
        <div key={i} className="space-y-3 rounded-panel border border-line bg-s2/40 p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-8 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  ),
  tiles: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {range(KPI_TILES).map((i) => (
        <div key={i} className="space-y-3 border-t border-line pt-4">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  ),
  sliders: () => (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-5">
        {range(SLIDERS).map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-panel border border-line bg-s2/40 p-4">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
        {range(SLIDERS).map((i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  ),
};
