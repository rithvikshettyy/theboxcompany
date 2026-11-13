import { PLAN_START_HOUR, SHIFT_START_HOUR } from "./assumptions";
import type { Heatmap, Kpi, ParetoRow, ShiftId, WaterfallStep } from "./types";

/** A waterfall bar: from `bottom` to `top` in ₹, as shares of the rated potential. */
export type WaterfallBar = WaterfallStep & { from: number; to: number; kind: "total" | "loss" };

/** Floats each loss below the running total, so the bars read as a bridge from rated to good. */
export function waterfallBars(steps: WaterfallStep[]): WaterfallBar[] {
  const max = steps[0]?.rupees ?? 1;
  let level = max;
  return steps.map((s) => {
    if (s.key === "potential" || s.key === "earned") {
      return { ...s, from: 0, to: s.rupees / max, kind: "total" };
    }
    const top = level;
    level -= s.rupees;
    return { ...s, from: level / max, to: top / max, kind: "loss" };
  });
}

/** Causes that together make up the first 80% of minutes: where to act (Pareto rule). */
export function vitalFew(rows: ParetoRow[], cut = 0.8): ParetoRow[] {
  const out: ParetoRow[] = [];
  for (const r of rows) {
    out.push(r);
    if (r.cumulative >= cut) break;
  }
  return out;
}

/** Clock time for `minutes` after the plan starts (06:00), with "+1d" past midnight. */
export function planClock(minutes: number): string {
  const total = PLAN_START_HOUR * 60 + Math.round(minutes);
  const day = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return day > 0 ? `${hhmm} +${day}d` : hhmm;
}

export type Trend = { delta: number; direction: "up" | "down" | "flat"; improving: boolean | null };

/** How a KPI moved against the previous period, and whether that is good news. */
export function kpiTrend(k: Kpi): Trend {
  const delta = k.value - k.previous;
  const flat = Math.abs(delta) < 0.5 * 10 ** -k.decimals;
  if (flat) return { delta: 0, direction: "flat", improving: null };
  const up = delta > 0;
  return { delta, direction: up ? "up" : "down", improving: k.better === "higher" ? up : !up };
}

/** Which shift a production-order hour column (0 = 06:00) belongs to. */
export function shiftOfColumn(col: number): ShiftId {
  const hour = (SHIFT_START_HOUR.A + col) % 24;
  if (hour >= SHIFT_START_HOUR.A && hour < SHIFT_START_HOUR.B) return "A";
  if (hour >= SHIFT_START_HOUR.B && hour < SHIFT_START_HOUR.C) return "B";
  return "C";
}

/** The clock hour with the most downtime on average over the heatmap's days. */
export function peakHour(h: Heatmap): { hour: number; avg: number; overall: number } {
  const cols = h.hours.map((hour, i) => ({
    hour,
    avg: h.days.reduce((s, d) => s + d.cells[i], 0) / h.days.length,
  }));
  const peak = cols.reduce((a, b) => (b.avg > a.avg ? b : a));
  const overall = cols.reduce((s, c) => s + c.avg, 0) / cols.length;
  return { ...peak, overall };
}

export const hh = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
