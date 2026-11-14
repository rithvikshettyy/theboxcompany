"use client";

import { useMemo, useState, type DragEvent } from "react";
import { fmtDay, fmtH, HOUR_MS, plantMidnight } from "@/lib/planner/calendar";
import { idleSegments } from "@/lib/planner/metrics";
import { compatible } from "@/lib/planner/rules";
import type { Inputs, Placement, Schedule, Segment } from "@/lib/planner/types";
import { cn } from "@/lib/utils";

const LANE_H = 60;
const LABEL_W = 120;
const ZOOMS = [
  { px: 6, label: "Week" },
  { px: 12, label: "Days" },
  { px: 24, label: "Hours" },
] as const;
const MIN_IDLE_LABEL_H = 2;
const STRIPES = "bg-[repeating-linear-gradient(135deg,var(--line2)_0_3px,transparent_3px_7px)]";

const STATUS_STYLE = {
  "on-time": "border-line2 bg-s2 text-tx",
  "at-risk": "border-amber bg-amber/15 text-tx",
  late: "border-red bg-red/15 text-tx",
} as const;
const STATUS_LABEL = { "on-time": "On time", "at-risk": "At risk", late: "Late" } as const;

function complement(segs: Segment[], span: number): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const s of [...segs].sort((a, b) => a.from - b.from)) {
    if (s.from > at) out.push({ from: at, to: Math.min(s.from, span) });
    at = Math.max(at, s.to);
  }
  if (at < span) out.push({ from: at, to: span });
  return out;
}

type Props = {
  inputs: Inputs;
  schedule: Schedule;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called when a block is dropped on a lane. Absent when the view is read-only. */
  onMove?: (orderId: string, machineId: string, atH: number) => void;
};

/** Gantt-style schedule: a lane per machine, hatched where it is closed, with changeovers, maintenance and idle time drawn in. */
export function Timeline({ inputs, schedule, selectedId, onSelect, onMove }: Props) {
  const [zoom, setZoom] = useState<number>(ZOOMS[1].px);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const px = zoom;
  const order = useMemo(() => new Map(inputs.orders.map((o) => [o.id, o])), [inputs.orders]);
  const lastEnd = schedule.placements.reduce((m, p) => Math.max(m, p.endH), 0);
  const spanH = Math.ceil(Math.max(schedule.windowH, lastEnd) + 6);
  const width = spanH * px;

  const days = useMemo(() => {
    const out: { h: number; label: string }[] = [];
    for (let t = plantMidnight(inputs.planStart); t < inputs.planStart + spanH * HOUR_MS; t += 24 * HOUR_MS) {
      const h = (t - inputs.planStart) / HOUR_MS;
      if (h >= 0) out.push({ h, label: fmtDay(inputs.planStart, h) });
    }
    if (out.length === 0 || out[0].h > 0) out.unshift({ h: 0, label: fmtDay(inputs.planStart, 0) });
    return out;
  }, [inputs.planStart, spanH]);

  const dragged = dragId ? order.get(dragId) : undefined;
  const drop = (e: DragEvent, machineId: string) => {
    e.preventDefault();
    setHover(null);
    const id = e.dataTransfer.getData("text/plain");
    const rect = e.currentTarget.getBoundingClientRect();
    if (id && onMove) onMove(id, machineId, (e.clientX - rect.left) / px);
    setDragId(null);
  };

  const block = (p: Placement, seg: Segment, i: number) => {
    const o = order.get(p.orderId);
    const w = (seg.to - seg.from) * px;
    const label = `${p.orderId} on ${inputs.machines.find((m) => m.id === p.machineId)?.name ?? p.machineId}, ${fmtH(inputs.planStart, p.startH)} to ${fmtH(inputs.planStart, p.endH)}, ${STATUS_LABEL[p.status]}`;
    return (
      <button
        key={`${p.orderId}-${i}`}
        type="button"
        draggable={!!onMove}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", p.orderId);
          e.dataTransfer.effectAllowed = "move";
          setDragId(p.orderId);
        }}
        onDragEnd={() => {
          setDragId(null);
          setHover(null);
        }}
        onClick={() => onSelect(selectedId === p.orderId ? null : p.orderId)}
        aria-label={label}
        aria-pressed={selectedId === p.orderId}
        title={`${label}${o ? ` · ${o.customer}` : ""}`}
        className={cn(
          "absolute top-2 flex h-11 min-w-1 flex-col justify-center overflow-hidden rounded-md border px-1.5 text-left text-2xs leading-tight transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-card focus-visible:outline-2 focus-visible:outline-brand2",
          STATUS_STYLE[p.status],
          onMove && "cursor-grab active:cursor-grabbing",
          selectedId === p.orderId && "ring-2 ring-brand2",
          dragId === p.orderId && "opacity-40",
        )}
        style={{ left: seg.from * px, width: Math.max(w, 3) }}
      >
        {w > 44 ? (
          <>
            <span className="truncate font-medium">{p.orderId}</span>
            {w > 84 ? <span className="truncate text-mu">{p.status === "on-time" ? o?.customer : STATUS_LABEL[p.status]}</span> : null}
          </>
        ) : null}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mu">
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-line2 bg-s2" />On time</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-amber bg-amber/15" />At risk</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-red bg-red/15" />Late</li>
          <li className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm border border-line2", STRIPES)} />Changeover</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-amber bg-amber/30" />Maintenance or breakdown</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-dashed border-mu2" />Idle</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-s2/80" />Closed</li>
        </ul>
        <div role="group" aria-label="Timeline zoom" className="flex gap-1">
          {ZOOMS.map((z) => (
            <button
              key={z.px}
              type="button"
              aria-pressed={zoom === z.px}
              onClick={() => setZoom(z.px)}
              className={cn("h-9 rounded-full px-4 text-xs", zoom === z.px ? "bg-brand text-bg" : "bg-s2 text-mu hover:text-tx")}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line" tabIndex={0} aria-label="Production timeline, scrolls sideways">
        <div style={{ width: width + LABEL_W }} className="relative">
          <div className="sticky top-0 z-10 flex h-9 border-b border-line bg-s1">
            <div style={{ width: LABEL_W }} className="sticky left-0 z-20 shrink-0 border-r border-line bg-s1" />
            <div className="relative" style={{ width }}>
              {days.map((d) => (
                <span key={d.h} className="absolute top-0 flex h-full items-center border-l border-line pl-2 text-xs whitespace-nowrap text-mu" style={{ left: d.h * px }}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>

          {inputs.machines.map((m) => {
            const mine = schedule.placements.filter((p) => p.machineId === m.id);
            const allowed = !dragged || compatible(dragged, m);
            const closed = complement(schedule.availability[m.id] ?? [], spanH);
            return (
              <div key={m.id} className="flex border-b border-line last:border-b-0" style={{ height: LANE_H }}>
                <div style={{ width: LABEL_W }} className="sticky left-0 z-20 shrink-0 border-r border-line bg-s1 px-3 py-2">
                  <p className="text-sm text-tx">{m.name}</p>
                  <p className="truncate text-2xs text-mu">{m.kind}</p>
                </div>
                <div
                  role="group"
                  aria-label={`${m.name} lane`}
                  className={cn("relative transition-colors duration-150", hover === m.id && (allowed ? "bg-green/10" : "bg-red/10"))}
                  style={{ width }}
                  onDragOver={(e) => {
                    if (!onMove || !dragId) return;
                    if (allowed) e.preventDefault();
                    setHover(m.id);
                  }}
                  onDragLeave={() => setHover((h) => (h === m.id ? null : h))}
                  onDrop={(e) => drop(e, m.id)}
                >
                  {days.map((d) => <span key={d.h} aria-hidden="true" className="absolute inset-y-0 border-l border-line/60" style={{ left: d.h * px }} />)}
                  {closed.map((c, i) => <span key={`c${i}`} aria-hidden="true" className="absolute inset-y-0 bg-s2/80" style={{ left: c.from * px, width: (c.to - c.from) * px }} />)}
                  {schedule.downtime.filter((d) => d.machineId === m.id).map((d, i) => (
                    <span
                      key={`d${i}`}
                      title={`${d.reason === "breakdown" ? "Breakdown" : "Maintenance"}: ${d.note}`}
                      className="absolute inset-y-1 flex items-center overflow-hidden rounded-md border border-amber bg-amber/30 px-1.5 text-2xs text-tx"
                      style={{ left: d.fromH * px, width: (d.toH - d.fromH) * px }}
                    >
                      {(d.toH - d.fromH) * px > 60 ? d.note : null}
                    </span>
                  ))}
                  {idleSegments(schedule, m.id).filter((s) => s.to - s.from >= MIN_IDLE_LABEL_H).map((s, i) => (
                    <span key={`i${i}`} aria-hidden="true" className="absolute top-2 flex h-11 items-center justify-center rounded-md border border-dashed border-mu2/60 text-2xs text-mu" style={{ left: s.from * px, width: (s.to - s.from) * px }}>
                      {(s.to - s.from) * px > 70 ? `Idle ${(s.to - s.from).toFixed(1)} h` : null}
                    </span>
                  ))}
                  {mine.flatMap((p) => p.changeover.map((c, i) => (
                    <span
                      key={`co-${p.orderId}-${i}`}
                      title={`Changeover before ${p.orderId}: ${p.changeoverWhy.join(", ")} (${Math.round(p.changeoverMin)} min)`}
                      className={cn("absolute top-2 h-11 rounded-sm border border-line2", STRIPES)}
                      style={{ left: c.from * px, width: Math.max((c.to - c.from) * px, 2) }}
                    />
                  )))}
                  {mine.flatMap((p) => p.run.map((seg, i) => block(p, seg, i)))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-mu">
        {onMove ? "Drag a block to another lane to reassign it, or sideways to change its place in the queue. " : "Showing a what-if plan, which is read-only. "}
        You can also select a block and use the buttons below. Grey shading is time the machine is closed (shifts off, Sundays).
      </p>
    </div>
  );
}
