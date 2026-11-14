import { EDGE, MAX_OUTS, OPS, ORDERS, P, PLAN_RUNS, REELS, WASTE_PER_M2 } from "./assumptions";
import type { Combo, Order, TrimPlan } from "./types";

const byId = new Map(ORDERS.map((o) => [o.id, o]));

function order(id: string): Order {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown order ${id}`);
  return found;
}

/** Narrowest stocked reel that fits `usedMm` plus the minimum edge trim, or null if none does. */
export function fitRun(usedMm: number): number | null {
  return REELS.find((reel) => reel <= P.deckleMm && reel - usedMm >= EDGE) ?? null;
}

function combo(parts: { id: string; outs: number }[], reelMm: number): Combo {
  const orders = parts.map((p) => ({ ...p, widthMm: order(p.id).widthMm }));
  const usedMm = orders.reduce((s, o) => s + o.outs * o.widthMm, 0);
  const trimMm = reelMm - usedMm;
  return { orders, reelMm, usedMm, trimMm, trimPct: (trimMm / reelMm) * 100 };
}

/** The planner's run as it stands: their orders on their reel. */
export function planRun(run: (typeof PLAN_RUNS)[number]): Combo {
  return combo(run.orders, run.reelMm);
}

/**
 * Best way to run `primaryId`: its own outs, optionally shared with one other order of the same
 * flute, on the narrowest reel that fits. Lowest trim % wins; ties go to fewer outs.
 */
export function bestFor(primaryId: string): Combo {
  const primary = order(primaryId);
  const partners = ORDERS.filter((o) => o.flute === primary.flute && o.id !== primary.id);
  let best: Combo | null = null;
  let bestOuts = Infinity;

  const consider = (parts: { id: string; outs: number }[]) => {
    const used = parts.reduce((s, p) => s + p.outs * order(p.id).widthMm, 0);
    const reel = fitRun(used);
    if (reel === null) return;
    const candidate = combo(parts, reel);
    const outs = parts.reduce((s, p) => s + p.outs, 0);
    if (
      !best ||
      candidate.trimPct < best.trimPct - 1e-9 ||
      (Math.abs(candidate.trimPct - best.trimPct) < 1e-9 && outs < bestOuts)
    ) {
      best = candidate;
      bestOuts = outs;
    }
  };

  for (let a = 1; a <= MAX_OUTS; a++) {
    consider([{ id: primary.id, outs: a }]);
    for (const partner of partners) {
      for (let b = 1; a + b <= MAX_OUTS; b++) {
        consider([
          { id: primary.id, outs: a },
          { id: partner.id, outs: b },
        ]);
      }
    }
  }
  if (!best) throw new Error(`No reel fits order ${primaryId}`);
  return best;
}

/** Planned runs against the best combination, and the area-weighted trim % of each. */
export function trimPlan(): TrimPlan {
  const runs = PLAN_RUNS.map((run) => ({
    id: run.id,
    meters: run.meters,
    planned: planRun(run),
    best: bestFor(run.orders[0].id),
  }));
  const weighted = (pick: (r: (typeof runs)[number]) => { reelMm: number; trimMm: number }) => {
    const area = runs.reduce((s, r) => s + pick(r).reelMm * r.meters, 0);
    const trim = runs.reduce((s, r) => s + pick(r).trimMm * r.meters, 0);
    return (trim / area) * 100;
  };
  return {
    runs,
    plannedPct: weighted((r) => r.planned),
    bestPct: weighted((r) => r.best),
  };
}

export type TrimSavings = {
  /** Board edge that stops being cut off and thrown away, m², over the plan's runs. */
  savedM2: number;
  /** The same board in kg of paper-and-board. */
  savedKg: number;
  /** ₹ a day the plan's runs win back: margin never earned plus paper not recovered, per m². */
  rupeesPerDay: number;
  /** Saved m² for each run, in plan order. */
  byRun: { id: string; savedM2: number }[];
};

/**
 * What the best pairing saves against the planner's, run by run. A run's trim is a strip the length
 * of its board; the saving is the difference in strip width times the metres run. Metres per run
 * are held the same in both plans, so this is a like-for-like comparison of trim only.
 */
export function trimSavings(plan: TrimPlan): TrimSavings {
  const byRun = plan.runs.map((r) => ({ id: r.id, savedM2: ((r.planned.trimMm - r.best.trimMm) / 1000) * r.meters }));
  const savedM2 = byRun.reduce((s, r) => s + r.savedM2, 0);
  return { savedM2, savedKg: savedM2 * OPS.boardKgPerM2, rupeesPerDay: savedM2 * WASTE_PER_M2, byRun };
}
