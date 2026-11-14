import { PLANNER, SHIFT_START_HOUR } from "../assumptions";
import type { Downtime, Machine, Segment } from "./types";

export const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const IST_MS = PLANNER.istOffsetH * HOUR_MS;
const SHIFT_H = 8;

/** Day of week on the plant clock for an instant: 0 = Sunday. */
export function dayOfWeek(ms: number): number {
  return (Math.floor((ms + IST_MS) / DAY_MS) + 4) % 7;
}

/** Midnight on the plant clock at or before an instant. */
export function plantMidnight(ms: number): number {
  return Math.floor((ms + IST_MS) / DAY_MS) * DAY_MS - IST_MS;
}

/** The next 06:00 plant time strictly after `now` that is not a Sunday: the default start of a plan. */
export function nextPlanStart(now: number): number {
  let start = plantMidnight(now) + SHIFT_START_HOUR.A * HOUR_MS;
  if (start <= now) start += DAY_MS;
  while (dayOfWeek(start + 12 * HOUR_MS) === 0) start += DAY_MS;
  return start;
}

const merge = (list: Segment[]): Segment[] => {
  const out: Segment[] = [];
  for (const s of [...list].sort((a, b) => a.from - b.from)) {
    const last = out[out.length - 1];
    if (last && s.from <= last.to + 1e-9) last.to = Math.max(last.to, s.to);
    else out.push({ ...s });
  }
  return out;
};

/** Hours a machine is open, from its shifts and weekly off day, clipped to [0, horizonH]. */
export function operatingSegments(machine: Machine, planStart: number, horizonH: number): Segment[] {
  const out: Segment[] = [];
  const end = planStart + horizonH * HOUR_MS;
  for (let day = plantMidnight(planStart) - DAY_MS; day < end; day += DAY_MS) {
    if (dayOfWeek(day + 12 * HOUR_MS) === 0 && !machine.sundayWork) continue;
    for (const shift of machine.shifts) {
      const from = (day + SHIFT_START_HOUR[shift] * HOUR_MS - planStart) / HOUR_MS;
      const clipped = { from: Math.max(0, from), to: Math.min(horizonH, from + SHIFT_H) };
      if (clipped.to - clipped.from > 1e-9) out.push(clipped);
    }
  }
  return merge(out);
}

/** Open time minus downtime windows. */
export function minus(open: Segment[], cuts: readonly { fromH: number; toH: number }[]): Segment[] {
  let out = open;
  for (const cut of cuts) {
    out = out.flatMap((s) => {
      if (cut.toH <= s.from || cut.fromH >= s.to) return [s];
      const parts: Segment[] = [];
      if (cut.fromH > s.from) parts.push({ from: s.from, to: cut.fromH });
      if (cut.toH < s.to) parts.push({ from: cut.toH, to: s.to });
      return parts;
    });
  }
  return out;
}

export function openTime(machine: Machine, planStart: number, horizonH: number, downtime: readonly Downtime[]): Segment[] {
  return minus(
    operatingSegments(machine, planStart, horizonH),
    downtime.filter((d) => d.machineId === machine.id),
  );
}

/**
 * Spend `work` hours of open time starting at `from`. Returns the pieces used and when the work
 * ends, or null if the open time runs out first.
 */
export function consume(open: readonly Segment[], from: number, work: number): { segments: Segment[]; end: number } | null {
  if (work <= 1e-9) return { segments: [], end: from };
  const segments: Segment[] = [];
  let left = work;
  for (const iv of open) {
    if (iv.to <= from) continue;
    const start = Math.max(iv.from, from);
    const take = Math.min(iv.to - start, left);
    if (take <= 1e-9) continue;
    segments.push({ from: start, to: start + take });
    left -= take;
    if (left <= 1e-9) return { segments, end: start + take };
  }
  return null;
}

/** Hours of `segs` that fall inside [0, limit]. */
export const hoursWithin = (segs: readonly Segment[], limit: number): number =>
  segs.reduce((s, x) => s + Math.max(0, Math.min(x.to, limit) - Math.min(x.from, limit)), 0);

const clock = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
});
const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** "Mon 14:30" for hour `h` after plan start. */
export const fmtH = (planStart: number, h: number): string => clock.format(planStart + h * HOUR_MS).replace(",", "");
export const fmtDay = (planStart: number, h: number): string => dateFmt.format(planStart + h * HOUR_MS);
export const fmtMs = (ms: number): string => clock.format(ms).replace(",", "");

/** Hours as "2.5 h" or "45 min". */
export function fmtDuration(h: number): string {
  const abs = Math.abs(h);
  return abs < 1 ? `${Math.round(abs * 60)} min` : `${abs.toFixed(1).replace(/\.0$/, "")} h`;
}

/** ms to the value a datetime-local input wants, on the plant clock. */
export function toInputValue(ms: number): string {
  return new Date(ms + IST_MS).toISOString().slice(0, 16);
}

/** Back from a datetime-local value read on the plant clock. NaN when empty or invalid. */
export function fromInputValue(value: string): number {
  return value ? Date.parse(`${value}:00Z`) - IST_MS : NaN;
}
