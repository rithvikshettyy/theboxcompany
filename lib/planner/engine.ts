import { PLANNER } from "../assumptions";
import type { GradeId } from "../records";
import { consume, HOUR_MS, openTime } from "./calendar";
import { changeover, familyKey, incompatibility, materialNeed, runHours } from "./rules";
import type { Inputs, Machine, Placement, PlannerOrder, Schedule, Segment, Unscheduled } from "./types";

/**
 * The scheduling heuristic. It is a greedy list scheduler, not an optimiser, and makes no claim to
 * the best possible plan:
 *
 *  1. Rank orders by an effective deadline: the real deadline pulled in for urgent and high
 *     priority orders and pushed out for low ones (PLANNER.priorityBiasH).
 *  2. Take the first unplaced order and put it on the compatible machine that finishes it soonest
 *     (fewer changeover minutes breaks a tie). Changeover and run time both use only the hours the
 *     machine is open, so shifts, Sundays, maintenance and breakdowns are respected.
 *  3. Pull forward any later order from the same setup family (same grade, flute and print) onto
 *     that machine while it fits its own deadline, and only if doing so does not push a more
 *     urgent order from on time to late. This is the grouping step that saves changeovers.
 *  4. Paper is handed out in the same ranked order from stock, then from open purchase orders. An
 *     order waits until its paper arrives; one the stock and POs cannot cover is not scheduled.
 *
 * Manual sequences (from drag and drop) are laid down first, exactly as given; whatever is left is
 * placed by steps 1 to 4 after them.
 */

type Prep = {
  order: PlannerOrder;
  dueH: number;
  eff: number;
  options: { machine: Machine; runH: number }[];
  readyH: number;
};

type MState = { machine: Machine; open: Segment[]; free: number; last: PlannerOrder | null };

const EPS = 1e-9;

/** Hand out reel stock, then purchase orders, in ranked order. Returns when each order's paper is ready, or why it is short. */
function allocatePaper(list: { order: PlannerOrder }[], inputs: Inputs): Map<string, { readyH: number; short?: string }> {
  const stock: Partial<Record<GradeId, number>> = { ...inputs.stockT };
  const incoming = inputs.incoming.map((i) => ({ ...i, left: i.tonnes })).sort((a, b) => a.atH - b.atH);
  const result = new Map<string, { readyH: number; short?: string }>();
  for (const { order } of list) {
    let readyH = 0;
    let short: string | undefined;
    for (const [grade, tonnes] of Object.entries(materialNeed(order)) as [GradeId, number][]) {
      const have = stock[grade] ?? 0;
      if (tonnes <= have + EPS) {
        stock[grade] = have - tonnes;
        continue;
      }
      let missing = tonnes - have;
      stock[grade] = 0;
      let at = 0;
      for (const inc of incoming) {
        if (inc.grade !== grade || inc.left <= EPS || missing <= EPS) continue;
        const take = Math.min(inc.left, missing);
        inc.left -= take;
        missing -= take;
        at = Math.max(at, inc.atH);
      }
      if (missing > EPS) short = `${grade} paper short by ${missing.toFixed(1)} t (needs ${tonnes.toFixed(1)} t)`;
      else readyH = Math.max(readyH, at);
    }
    result.set(order.id, { readyH, short });
  }
  return result;
}

export type ScheduleOptions = {
  /** Fixed order of jobs per machine, from manual moves. Orders not listed are placed automatically afterwards. */
  sequences?: Record<string, readonly string[]>;
};

export function schedule(inputs: Inputs, options: ScheduleOptions = {}): Schedule {
  const horizonH = PLANNER.horizonDays * 24;
  const unscheduled: Unscheduled[] = [];

  const ranked: Prep[] = [];
  for (const order of inputs.orders) {
    const dueH = (order.due - inputs.planStart) / HOUR_MS;
    const opts = inputs.machines
      .filter((m) => incompatibility(order, m).length === 0)
      .map((machine) => ({ machine, runH: runHours(order, machine, inputs.speed[machine.id] ?? 1) }));
    if (opts.length === 0) {
      const why = inputs.machines.map((m) => `${m.name} ${incompatibility(order, m)[0] ?? ""}`).join("; ");
      unscheduled.push({ orderId: order.id, reason: `No machine can run it: ${why}` });
      continue;
    }
    ranked.push({ order, dueH, eff: dueH - PLANNER.priorityBiasH[order.priority], options: opts, readyH: 0 });
  }
  ranked.sort((a, b) => a.eff - b.eff || a.dueH - b.dueH || a.order.id.localeCompare(b.order.id));

  const paper = allocatePaper(ranked, inputs);
  const pending: Prep[] = [];
  for (const p of ranked) {
    const got = paper.get(p.order.id);
    if (got?.short) unscheduled.push({ orderId: p.order.id, reason: got.short });
    else {
      p.readyH = got?.readyH ?? 0;
      pending.push(p);
    }
  }

  const downtime = inputs.downtime.filter((d) => d.toH > d.fromH);
  const states: MState[] = inputs.machines.map((machine) => ({
    machine,
    open: openTime(machine, inputs.planStart, horizonH, downtime),
    free: 0,
    last: null,
  }));

  /** Where `p` would go on this machine right now, without changing anything. */
  const tryPlace = (state: MState, p: Prep): Placement | null => {
    const runH = p.options.find((o) => o.machine.id === state.machine.id)?.runH;
    if (runH === undefined) return null;
    const co = changeover(state.last, p.order);
    const coUse = consume(state.open, state.free, co.minutes / PLANNER.minPerHour);
    if (!coUse) return null;
    const runUse = consume(state.open, Math.max(coUse.end, p.readyH), runH);
    if (!runUse) return null;
    const startH = coUse.segments[0]?.from ?? runUse.segments[0].from;
    const endH = runUse.end;
    const lateH = Math.max(0, endH - p.dueH);
    const slackH = p.dueH - endH;
    return {
      orderId: p.order.id,
      machineId: state.machine.id,
      run: runUse.segments,
      changeover: coUse.segments,
      changeoverMin: co.minutes,
      changeoverWhy: co.why,
      runH,
      startH,
      endH,
      dueH: p.dueH,
      lateH,
      slackH,
      status: lateH > EPS ? "late" : slackH < PLANNER.riskBufferH ? "at-risk" : "on-time",
      materialReadyH: p.readyH,
      materialWaitH: Math.max(0, p.readyH - coUse.end),
    };
  };

  const placements: Placement[] = [];
  const commit = (state: MState, p: Prep, placement: Placement) => {
    state.free = placement.endH;
    state.last = p.order;
    placements.push(placement);
  };

  const bestOption = (on: MState[], p: Prep): { state: MState; placement: Placement } | null => {
    let best: { state: MState; placement: Placement } | null = null;
    for (const state of on) {
      const placement = tryPlace(state, p);
      if (!placement) continue;
      if (
        !best ||
        placement.endH < best.placement.endH - EPS ||
        (Math.abs(placement.endH - best.placement.endH) <= EPS && placement.changeoverMin < best.placement.changeoverMin)
      ) {
        best = { state, placement };
      }
    }
    return best;
  };

  const noTime = `No machine time inside the ${PLANNER.horizonDays}-day planning horizon`;
  const take = (p: Prep) => {
    const i = pending.indexOf(p);
    if (i >= 0) pending.splice(i, 1);
  };

  // Manual sequences first, exactly as given.
  const prepById = new Map(pending.map((p) => [p.order.id, p]));
  const placedIds = new Set<string>();
  for (const state of states) {
    for (const id of options.sequences?.[state.machine.id] ?? []) {
      const p = prepById.get(id);
      if (!p || placedIds.has(id)) continue;
      placedIds.add(id);
      take(p);
      const why = incompatibility(p.order, state.machine);
      if (why.length) {
        unscheduled.push({ orderId: id, reason: `Placed on ${state.machine.name}, which ${why[0]}` });
        continue;
      }
      const placement = tryPlace(state, p);
      if (placement) commit(state, p, placement);
      else unscheduled.push({ orderId: id, reason: noTime });
    }
  }

  // Everything else by the heuristic.
  while (pending.length > 0) {
    const anchor = pending.shift() as Prep;
    const best = bestOption(states, anchor);
    if (!best) {
      unscheduled.push({ orderId: anchor.order.id, reason: noTime });
      continue;
    }
    commit(best.state, anchor, best.placement);
    const state = best.state;

    for (;;) {
      let pick: { p: Prep; placement: Placement } | null = null;
      for (let i = 0; i < pending.length && !pick; i++) {
        const f = pending[i];
        if (!state.last || familyKey(f.order) !== familyKey(state.last)) continue;
        const placement = tryPlace(state, f);
        if (!placement || placement.endH > f.dueH + EPS) continue;
        const after = states.map((s) => (s === state ? { ...s, free: placement.endH, last: f.order } : s));
        const harms = pending.slice(0, i).some((y) => {
          const before = bestOption(states, y);
          const later = bestOption(after, y);
          return !!before && before.placement.endH <= y.dueH + EPS && (!later || later.placement.endH > y.dueH + EPS);
        });
        if (!harms) pick = { p: f, placement };
      }
      if (!pick) break;
      take(pick.p);
      commit(state, pick.p, pick.placement);
    }
  }

  placements.sort((a, b) => a.startH - b.startH || a.orderId.localeCompare(b.orderId));
  const sequences: Record<string, string[]> = {};
  for (const m of inputs.machines) sequences[m.id] = placements.filter((p) => p.machineId === m.id).map((p) => p.orderId);
  const lastDue = inputs.orders.reduce((mx, o) => Math.max(mx, (o.due - inputs.planStart) / HOUR_MS), 0);

  return {
    placements,
    unscheduled,
    availability: Object.fromEntries(states.map((s) => [s.machine.id, s.open])),
    downtime,
    sequences,
    windowH: Math.min(horizonH, Math.max(24, lastDue)),
  };
}
