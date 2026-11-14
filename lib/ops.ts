import { OPS, ORDERS, P, SHIFT_IDS, TARGET } from "./assumptions";
import { workingDayLabel } from "./insights";
import { calc, shiftParams } from "./model";
import {
  CONSUMABLES,
  DISPATCH_TODAY,
  GRADES,
  PENDING_DISPATCH,
  QUALITY_ALERTS,
  QUALITY_TESTS,
  QUOTES,
  REEL_STOCK,
  SHIPMENTS,
  VENDORS,
  type GradeId,
} from "./records";
import type { Flute, Order, PlantData } from "./types";

const tonnes = (m2: number) => (m2 * OPS.boardKgPerM2) / 1000;

/* ── Production ─────────────────────────────────────────────────────────── */

/** Output, waste, speed, deckle use and changeovers for the scope in view. */
export function production(d: PlantData) {
  const t = d.totals;
  const targetM2 = (OPS.dailyTargetM2 / P.shiftsPerDay) * d.shifts;
  const used = d.trim.runs.reduce((s, r) => s + r.planned.usedMm * r.meters, 0);
  const best = d.trim.runs.reduce((s, r) => s + r.best.usedMm * r.meters, 0);
  const width = d.trim.runs.reduce((s, r) => s + P.deckleMm * r.meters, 0);
  const orderChange = d.pareto.corrugator.find((r) => r.id === "orderChange")?.perShift ?? 0;
  const speed = d.kpis.find((k) => k.id === "speed")?.value ?? 0;
  return {
    goodM2: t.goodM2,
    tons: tonnes(t.goodM2),
    previousTons: tonnes(d.previous.goodM2),
    targetM2,
    targetTons: tonnes(targetM2),
    ofTarget: t.goodM2 / targetM2,
    trimPct: (t.trimM2 / t.grossM2) * 100,
    dryEndPct: (t.rejectM2 / t.grossM2) * 100,
    trimTons: tonnes(t.trimM2),
    dryEndTons: tonnes(t.rejectM2),
    wastageTarget: OPS.wastageTargetPct,
    speed,
    speedTarget: TARGET.speed,
    deckleUsePct: (used / width) * 100,
    deckleBestPct: (best / width) * 100,
    orderChangeMin: orderChange / OPS.orderChangesPerShift,
    psChangeMin: d.base.psChangeoverMin / OPS.psChangeoversPerShift,
  };
}
export type Production = ReturnType<typeof production>;

/** Good board in tonnes for each of the last `days` working days, oldest first. */
const dailyCache = new Map<number, { label: string; tons: number }[]>();
export function dailyTonnes(days = 14): { label: string; tons: number }[] {
  // Deterministic, and called on every render of the production charts, so it is worked out once.
  const hit = dailyCache.get(days);
  if (hit) return hit;
  const out = Array.from({ length: days }, (_, i) => days - 1 - i).map((day) => ({
    label: workingDayLabel(day),
    tons: tonnes(SHIFT_IDS.reduce((s, sh) => s + calc(shiftParams(day, sh).params).goodM2, 0)),
  }));
  dailyCache.set(days, out);
  return out;
}

/* ── Materials ──────────────────────────────────────────────────────────── */

/** Orders printed on a white-top liner instead of the plain kraft top. */
const WHITE_TOP = new Set(["SO-4815", "SO-4830"]);
/** Allowance for trim and waste when converting order m² to paper. */
const PAPER_ALLOWANCE = 1.06;

/** Paper an order needs, kg by grade. BC is 5-ply (3 liners, 2 flutes); the rest are 3-ply. */
export function paperFor(o: Order): Partial<Record<GradeId, number>> {
  const m2 = ((o.qty * o.widthMm * o.lengthMm) / 1e6) * PAPER_ALLOWANCE;
  const kg = (g: GradeId, layers: number, takeUp = 1) => m2 * (GRADES[g].gsm / 1000) * layers * takeUp;
  if (o.flute === "BC") {
    return { L180: kg("L180", 3), M140: kg("M140", 1, OPS.takeUp.B) + kg("M140", 1, OPS.takeUp.C) };
  }
  const flute = o.flute as Exclude<Flute, "BC">;
  const top: GradeId = WHITE_TOP.has(o.id) ? "D230" : "L150";
  return { [top]: kg(top, 1), L150: (top === "L150" ? 2 : 1) * kg("L150", 1), M120: kg("M120", 1, OPS.takeUp[flute]) };
}

/** Reel stock against the booked order load, grade by grade. */
export function materials() {
  const daily: Record<GradeId, number> = { L150: 0, L180: 0, M120: 0, M140: 0, D230: 0 };
  for (const o of ORDERS) {
    for (const [g, kg] of Object.entries(paperFor(o)) as [GradeId, number][]) daily[g] += kg / 1000;
  }
  const grades = REEL_STOCK.map((r) => {
    const load = daily[r.grade] * OPS.bookedDays;
    const incoming = VENDORS.filter((v) => v.grade === r.grade && v.nextIn <= OPS.bookedDays).reduce(
      (s, v) => s + v.openPoTonnes,
      0,
    );
    return {
      ...r,
      name: GRADES[r.grade].name,
      load,
      incoming,
      coverDays: r.tonnes / daily[r.grade],
      gap: r.tonnes + incoming - load,
      value: r.tonnes * 1000 * GRADES[r.grade].rate,
    };
  });
  const stock = grades.reduce((s, g) => s + g.tonnes, 0);
  const load = grades.reduce((s, g) => s + g.load, 0);
  const perDay = load / OPS.bookedDays;
  return {
    grades,
    stock,
    load,
    coverDays: stock / perDay,
    stockValue: grades.reduce((s, g) => s + g.value, 0),
    short: grades.filter((g) => g.gap < 0),
    vendors: VENDORS,
    consumables: CONSUMABLES.map((c) => ({ ...c, coverDays: c.onHand / c.perDay })),
  };
}

/* ── Quality ────────────────────────────────────────────────────────────── */

export function quality() {
  return {
    alerts: QUALITY_ALERTS,
    fails: QUALITY_ALERTS.filter((a) => a.level === "fail").length,
    watches: QUALITY_ALERTS.filter((a) => a.level === "watch").length,
    tests: QUALITY_TESTS.done,
    firstPassPct: (QUALITY_TESTS.passedFirstTime / QUALITY_TESTS.done) * 100,
  };
}

/* ── Orders and dispatch ────────────────────────────────────────────────── */

const BUCKETS = [
  { label: "0 to 1 day", min: 0, max: 1 },
  { label: "2 to 3 days", min: 2, max: 3 },
  { label: "4 to 7 days", min: 4, max: 7 },
  { label: "8 days or more", min: 8, max: Infinity },
] as const;

/** Paper ₹ per m² of board for an order, from its grade build. */
function paperRupeesPerM2(o: Order): number {
  const m2 = ((o.qty * o.widthMm * o.lengthMm) / 1e6) * PAPER_ALLOWANCE;
  return (Object.entries(paperFor(o)) as [GradeId, number][]).reduce((s, [g, kg]) => s + kg * GRADES[g].rate, 0) / m2;
}

export function orders() {
  const ready = DISPATCH_TODAY.filter((o) => o.stage === "packed" || o.stage === "loaded");
  const margins = ORDERS.map((o) => {
    const boxM2 = (o.widthMm * o.lengthMm) / 1e6;
    const cost = boxM2 * PAPER_ALLOWANCE * (paperRupeesPerM2(o) + OPS.conversionPerM2);
    const quote = QUOTES[o.id];
    const price = quote?.price ?? cost;
    return { ...o, price, cost, marginPct: ((price - cost) / price) * 100, note: quote?.note };
  }).sort((a, b) => a.marginPct - b.marginPct);
  return {
    dispatch: DISPATCH_TODAY,
    readyPct: (ready.length / DISPATCH_TODAY.length) * 100,
    readyCount: ready.length,
    aging: BUCKETS.map((b) => {
      const rows = PENDING_DISPATCH.filter((p) => p.days >= b.min && p.days <= b.max);
      return { ...b, count: rows.length, value: rows.reduce((s, r) => s + r.value, 0) };
    }),
    pending: PENDING_DISPATCH,
    pendingValue: PENDING_DISPATCH.reduce((s, p) => s + p.value, 0),
    oldestDays: Math.max(...PENDING_DISPATCH.map((p) => p.days)),
    shipments: SHIPMENTS,
    margins,
    lowMargin: margins.filter((m) => m.marginPct < OPS.marginFloorPct),
  };
}
