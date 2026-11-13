import {
  BOXES_PER_PALLET,
  FEEDERS,
  HEATMAP_DAYS,
  NODES,
  P,
  PROFILE,
  REASONS,
  SEED,
  SHIFT_IDS,
  SHIFT_START_HOUR,
  SHIFTS_PER_MONTH,
  SPARK_DAYS,
  TARGET,
  TODAY_WEEKDAY,
  WATCH_BAND,
  WEEKDAYS,
} from "./assumptions";
import { calc, ratios, rng, shiftParams, simulate, sumCalc, type ShiftDay } from "./model";
import type {
  Better,
  Calc,
  Feeder,
  Heatmap,
  Kpi,
  KpiId,
  NodeStat,
  ParetoRow,
  Scope,
  Section,
  ShiftId,
  ShiftParams,
  Status,
} from "./types";

const isShift = (scope: Scope): scope is ShiftId => scope === "A" || scope === "B" || scope === "C";

/** KPI values straight from summed m², so they agree with the waterfall. */
function kpiValues(c: Calc): Record<KpiId, number> {
  const r = ratios(c);
  return {
    oee: r.oee * 100,
    availability: r.availability * 100,
    speed: c.grossM2 / ((c.runMin * P.deckleMm) / 1000),
    trimPct: (c.trimM2 / c.grossM2) * 100,
    rejectPct: (c.rejectM2 / (c.grossM2 - c.trimM2)) * 100,
    psChangeoverMin: c.psChangeoverMin / c.shifts,
  };
}

const KPI_META: { id: KpiId; label: string; unit: string; decimals: number; better: Better; perUnit: string }[] = [
  { id: "oee", label: "OEE", unit: "%", decimals: 1, better: "higher", perUnit: "per point" },
  { id: "availability", label: "Availability", unit: "%", decimals: 1, better: "higher", perUnit: "per point" },
  { id: "speed", label: "Running speed", unit: "m/min", decimals: 0, better: "higher", perUnit: "per m/min" },
  { id: "trimPct", label: "Trim", unit: "%", decimals: 1, better: "lower", perUnit: "per point" },
  { id: "rejectPct", label: "Rejects", unit: "%", decimals: 1, better: "lower", perUnit: "per point" },
  { id: "psChangeoverMin", label: "P-S changeover", unit: "min/shift", decimals: 0, better: "lower", perUnit: "per min" },
];

function status(id: KpiId, value: number, better: Better): Status {
  const gap = better === "higher" ? TARGET[id] - value : value - TARGET[id];
  if (gap <= 0) return "good";
  return gap <= WATCH_BAND[id] ? "watch" : "loss";
}

/** ₹ a month for one unit better, run through the same simulator as the recommendations. */
function rupeesPerUnit(id: KpiId, base: ShiftParams): number {
  const delta = (change: Partial<ShiftParams>) => simulate(base, { ...base, ...change }).perMonth;
  switch (id) {
    case "oee":
      return 0.01 * calc(base).ratedM2 * P.marginPerM2 * SHIFTS_PER_MONTH;
    case "availability":
      return delta({ downtimeMin: base.downtimeMin - P.shiftMin / 100 });
    case "speed":
      return delta({ speed: base.speed + 1 });
    case "trimPct":
      return delta({ trimPct: base.trimPct - 1 });
    case "rejectPct":
      return delta({ rejectPct: base.rejectPct - 1 });
    case "psChangeoverMin":
      return delta({ psChangeoverMin: base.psChangeoverMin - 1 });
  }
}

/** Six KPI tiles. Trend compares with the previous period; sparkline is the last SPARK_DAYS days. */
export function kpis(scope: Scope, totals: Calc, previous: Calc, base: ShiftParams): Kpi[] {
  const now = kpiValues(totals);
  const before = kpiValues(previous);
  const shifts = isShift(scope) ? [scope] : SHIFT_IDS;
  const daily = Array.from({ length: SPARK_DAYS }, (_, i) => SPARK_DAYS - 1 - i).map((day) =>
    kpiValues(sumCalc(shifts.map((s) => calc(shiftParams(day, s).params)))),
  );
  return KPI_META.map((m) => ({
    ...m,
    value: now[m.id],
    previous: before[m.id],
    target: TARGET[m.id],
    status: status(m.id, now[m.id], m.better),
    spark: daily.map((d) => d[m.id]),
    rupeesPerUnit: rupeesPerUnit(m.id, base),
  }));
}

/** Minutes lost by cause, largest first, with the cumulative share for the 80% line. */
export function pareto(days: ShiftDay[]): Record<Section, ParetoRow[]> {
  const rows = (section: Section): ParetoRow[] => {
    const reasons = REASONS.filter((r) => r.section === section)
      .map((r) => ({ r, minutes: days.reduce((s, d) => s + d.reasons[r.id], 0) }))
      .sort((a, b) => b.minutes - a.minutes);
    const total = reasons.reduce((s, x) => s + x.minutes, 0);
    let running = 0;
    return reasons.map(({ r, minutes }) => {
      running += minutes;
      return {
        id: r.id,
        label: r.label,
        node: r.node,
        minutes,
        perShift: minutes / days.length,
        share: minutes / total,
        cumulative: running / total,
      };
    });
  };
  return { corrugator: rows("corrugator"), converting: rows("converting") };
}

/** Weekday name for a working day `day` days back from today, skipping Sundays. */
export function workingDayLabel(day: number): string {
  let weekday = TODAY_WEEKDAY;
  for (let left = day; left > 0; ) {
    weekday = (weekday + 6) % 7;
    if (weekday !== 0) left -= 1;
  }
  return day === 0 ? "Today" : WEEKDAYS[weekday];
}

/** Corrugator downtime by hour for the last HEATMAP_DAYS working days, oldest first. */
export function heatmap(scope: Scope): Heatmap {
  const hours = Array.from({ length: 24 }, (_, i) => (SHIFT_START_HOUR.A + i) % 24);
  const corrugator = REASONS.filter((r) => r.section === "corrugator");
  const days = Array.from({ length: HEATMAP_DAYS }, (_, i) => HEATMAP_DAYS - 1 - i).map((day) => {
    const cells = new Array<number>(24).fill(0);
    SHIFT_IDS.forEach((shift, s) => {
      const sd = shiftParams(day, shift);
      corrugator.forEach((reason, k) => {
        const r = rng(SEED * 3 + day * 97 + s * 13 + k * 7);
        const weights = PROFILE[reason.profile].map((w) => w * (0.7 + 0.6 * r()));
        const total = weights.reduce((a, b) => a + b, 0);
        weights.forEach((w, h) => {
          cells[s * 8 + h] += (sd.reasons[reason.id] * w) / total;
        });
      });
    });
    return { label: workingDayLabel(day), cells: cells.map((v) => Math.round(v * 10) / 10) };
  });
  const max = Math.max(...days.flatMap((d) => d.cells));
  return { hours, days, max, shift: isShift(scope) ? scope : null };
}

/** Effective rate of every machine, the constraint (slowest), and WIP piling up before each. */
export function nodeStats(base: ShiftParams, days: ShiftDay[]): NodeStat[] {
  const perShift = (id: string) =>
    days.reduce((s, d) => s + d.reasons[id as keyof ShiftDay["reasons"]], 0) / days.length;
  const corrugatorAvail = 1 - base.downtimeMin / P.shiftMin;
  const speedFactor = base.speed / P.ratedSpeed;

  const stats = NODES.map((node) => {
    const downtimeMin =
      node.section === "corrugator"
        ? base.downtimeMin
        : REASONS.filter((r) => r.node === node.id).reduce((s, r) => s + perShift(r.id), 0);
    const availability = node.section === "corrugator" ? corrugatorAvail : 1 - downtimeMin / P.shiftMin;
    const effectivePerHour =
      node.ratedPerHour * availability * (node.section === "corrugator" ? speedFactor : 1);
    return { ...node, downtimeMin, availability, effectivePerHour };
  });

  const slowest = Math.min(...stats.map((s) => s.effectivePerHour));
  let arriving = Infinity;
  return stats.map((s, i) => {
    const insideWeb = i > 0 && s.section === "corrugator";
    const wipBefore =
      i === 0 || insideWeb
        ? null
        : (Math.max(0, arriving - s.effectivePerHour) * (P.shiftMin / 60)) / BOXES_PER_PALLET;
    arriving = Math.min(arriving, s.effectivePerHour);
    return { ...s, wipBefore, isConstraint: s.effectivePerHour === slowest };
  });
}

/** Minutes a shift each utility cost the single facer. */
export function feeders(days: ShiftDay[]): Feeder[] {
  return FEEDERS.map((f) => ({
    id: f.id,
    label: f.label,
    node: f.node,
    lostMin: days.reduce((s, d) => s + d.reasons[f.reason], 0) / days.length,
  }));
}
