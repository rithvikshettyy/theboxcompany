import {
  HISTORY_DAYS,
  MONTHS_PER_YEAR,
  NOISE,
  P,
  REASONS,
  REEL_DRIFT_C,
  SCOPE_WORKING_DAYS,
  SEED,
  SH,
  SHIFT_IDS,
  SHIFTS_PER_MONTH,
  WASTE_PER_M2,
} from "./assumptions";
import { heatmap, kpis, nodeStats, pareto, feeders } from "./insights";
import { recsCalc } from "./recs";
import { schedule } from "./schedule";
import { trimPlan } from "./trim";
import type {
  Calc,
  Lever,
  LossKey,
  PlantData,
  ReasonId,
  Scope,
  ShiftId,
  ShiftParams,
  SimResult,
  WaterfallStep,
} from "./types";

/** Mulberry32: a tiny seeded PRNG, so every build of the plant is identical. Returns [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;
const DECKLE_M = P.deckleMm / 1000;

/** One shift on one working day: cause minutes and the five levers. */
export type ShiftDay = {
  /** Working days ago: 0 is today. */
  day: number;
  shift: ShiftId;
  reasons: Record<ReasonId, number>;
  params: ShiftParams;
};

/** Deterministic history: shift `shift`, `day` working days ago, with seeded day-to-day noise. */
export function shiftParams(day: number, shift: ShiftId): ShiftDay {
  const r = rng(SEED + day * 101 + SHIFT_IDS.indexOf(shift) * 7);
  const swing = () => r() * 2 - 1;
  const reasons = {} as Record<ReasonId, number>;
  for (const reason of REASONS) {
    let minutes = reason.min[shift];
    if (reason.id === "reels" && shift === "C") {
      minutes += REEL_DRIFT_C * (1 - day / (HISTORY_DAYS - 1));
    }
    reasons[reason.id] = round(minutes * (1 + swing() * NOISE.reasonFrac), 1);
  }
  const corrugatorMin = REASONS.filter((x) => x.section === "corrugator").reduce(
    (sum, x) => sum + reasons[x.id],
    0,
  );
  const sh = SH[shift];
  return {
    day,
    shift,
    reasons,
    params: {
      downtimeMin: round(corrugatorMin, 1),
      speed: round(sh.speed + swing() * NOISE.speed, 1),
      trimPct: round(sh.trimPct + swing() * NOISE.trimPct, 2),
      rejectPct: round(sh.rejectPct + swing() * NOISE.rejectPct, 2),
      psChangeoverMin: reasons.psChange,
    },
  };
}

/** One shift's running conditions turned into m² and ₹. */
export function calc(p: ShiftParams): Calc {
  const runMin = P.shiftMin - p.downtimeMin;
  const ratedM2 = P.ratedSpeed * DECKLE_M * P.shiftMin;
  const downtimeM2 = P.ratedSpeed * DECKLE_M * p.downtimeMin;
  const grossM2 = p.speed * DECKLE_M * runMin;
  const slowM2 = (P.ratedSpeed - p.speed) * DECKLE_M * runMin;
  const trimM2 = (grossM2 * p.trimPct) / 100;
  const rejectM2 = ((grossM2 - trimM2) * p.rejectPct) / 100;
  const goodM2 = grossM2 - trimM2 - rejectM2;
  const loss: Record<LossKey, number> = {
    downtime: downtimeM2 * P.marginPerM2,
    slow: slowM2 * P.marginPerM2,
    trim: trimM2 * WASTE_PER_M2,
    rejects: rejectM2 * WASTE_PER_M2,
  };
  const potential = ratedM2 * P.marginPerM2;
  const leak = loss.downtime + loss.slow + loss.trim + loss.rejects;
  return {
    shifts: 1,
    shiftMin: P.shiftMin,
    runMin,
    psChangeoverMin: p.psChangeoverMin,
    ratedM2,
    downtimeM2,
    slowM2,
    grossM2,
    trimM2,
    rejectM2,
    goodM2,
    potential,
    loss,
    leak,
    earned: potential - leak,
  };
}

/** Adds shifts together. Ratios are recomputed from the sums, never averaged. */
export function sumCalc(list: Calc[]): Calc {
  const add = (pick: (c: Calc) => number) => list.reduce((s, c) => s + pick(c), 0);
  return {
    shifts: add((c) => c.shifts),
    shiftMin: add((c) => c.shiftMin),
    runMin: add((c) => c.runMin),
    psChangeoverMin: add((c) => c.psChangeoverMin),
    ratedM2: add((c) => c.ratedM2),
    downtimeM2: add((c) => c.downtimeM2),
    slowM2: add((c) => c.slowM2),
    grossM2: add((c) => c.grossM2),
    trimM2: add((c) => c.trimM2),
    rejectM2: add((c) => c.rejectM2),
    goodM2: add((c) => c.goodM2),
    potential: add((c) => c.potential),
    loss: {
      downtime: add((c) => c.loss.downtime),
      slow: add((c) => c.loss.slow),
      trim: add((c) => c.loss.trim),
      rejects: add((c) => c.loss.rejects),
    },
    leak: add((c) => c.leak),
    earned: add((c) => c.earned),
  };
}

/** OEE and its parts from m². OEE = availability × performance × quality = good ÷ rated. */
export function ratios(c: Calc) {
  const available = c.ratedM2 - c.downtimeM2;
  const availability = available / c.ratedM2;
  const performance = c.grossM2 / available;
  const quality = c.goodM2 / c.grossM2;
  return { availability, performance, quality, oee: availability * performance * quality };
}

/** ₹ a shift the plant keeps: board margin net of waste, minus box output lost to P-S changeovers. */
export function shiftValue(p: ShiftParams): number {
  const psLoss = (p.psChangeoverMin / 60) * P.psBoxesPerHour * P.boxMargin;
  return calc(p).earned - psLoss;
}

/** Order the simulator attributes ₹ to each lever. Each step adds one lever, so parts sum exactly. */
export const LEVER_ORDER: readonly Lever[] = [
  "downtimeMin",
  "speed",
  "trimPct",
  "rejectPct",
  "psChangeoverMin",
];

/** ₹ recovered a month by running at `next` instead of `base`, every shift. */
export function simulate(base: ShiftParams, next: ShiftParams): SimResult {
  let current = { ...base };
  const byLever = LEVER_ORDER.map((lever) => {
    const stepped = { ...current, [lever]: next[lever] };
    const perMonth = (shiftValue(stepped) - shiftValue(current)) * SHIFTS_PER_MONTH;
    current = stepped;
    return { lever, perMonth };
  });
  const perMonth = (shiftValue(next) - shiftValue(base)) * SHIFTS_PER_MONTH;
  const extraM2PerMonth = (calc(next).goodM2 - calc(base).goodM2) * SHIFTS_PER_MONTH;
  return {
    perMonth,
    perYear: perMonth * MONTHS_PER_YEAR,
    extraM2PerMonth,
    truckloads: extraM2PerMonth / P.truckM2,
    byLever,
  };
}

/** The shifts a scope covers, `back` periods ago (0 = the current window). */
export function scopeDays(scope: Scope, back = 0): ShiftDay[] {
  if (scope === "A" || scope === "B" || scope === "C") return [shiftParams(back, scope)];
  const days = SCOPE_WORKING_DAYS[scope];
  return Array.from({ length: days }, (_, i) => back * days + i).flatMap((day) =>
    SHIFT_IDS.map((shift) => shiftParams(day, shift)),
  );
}

/** Mean of each lever across shifts: the simulator baseline for a scope. */
export function averageParams(list: ShiftDay[]): ShiftParams {
  const mean = (lever: Lever, dp: number) =>
    round(list.reduce((s, d) => s + d.params[lever], 0) / list.length, dp);
  return {
    downtimeMin: mean("downtimeMin", 1),
    speed: mean("speed", 1),
    trimPct: mean("trimPct", 2),
    rejectPct: mean("rejectPct", 2),
    psChangeoverMin: mean("psChangeoverMin", 1),
  };
}

const LOSS_LABEL: Record<WaterfallStep["key"], string> = {
  potential: "Rated capacity",
  downtime: "Downtime",
  slow: "Slow running",
  trim: "Trim",
  rejects: "Rejects",
  earned: "Good board",
};

/** Rated capacity down to good board, in ₹. Losses are positive amounts taken off. */
export function waterfall(c: Calc): WaterfallStep[] {
  const step = (key: WaterfallStep["key"], rupees: number, m2: number): WaterfallStep => ({
    key,
    label: LOSS_LABEL[key],
    rupees,
    m2,
    share: rupees / c.potential,
  });
  return [
    step("potential", c.potential, c.ratedM2),
    step("downtime", c.loss.downtime, c.downtimeM2),
    step("slow", c.loss.slow, c.slowM2),
    step("trim", c.loss.trim, c.trimM2),
    step("rejects", c.loss.rejects, c.rejectM2),
    step("earned", c.earned, c.goodM2),
  ];
}

/** Everything the dashboard shows for one scope. Pure: same scope in, same numbers out. */
export function build(scope: Scope): PlantData {
  const current = scopeDays(scope);
  const totals = sumCalc(current.map((d) => calc(d.params)));
  const previous = sumCalc(scopeDays(scope, 1).map((d) => calc(d.params)));
  const base = averageParams(current);
  const trim = trimPlan();
  const paretoRows = pareto(current);
  return {
    scope,
    shifts: current.length,
    base,
    totals,
    previous,
    waterfall: waterfall(totals),
    kpis: kpis(scope, totals, previous, base),
    pareto: paretoRows,
    heatmap: heatmap(scope),
    nodes: nodeStats(base, current),
    feeders: feeders(current),
    recs: recsCalc(scope, base, current, trim),
    trim,
    orders: { planned: schedule("planned", base), due: schedule("due", base) },
  };
}
