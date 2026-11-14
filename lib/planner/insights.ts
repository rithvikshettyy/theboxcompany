import { PLANNER } from "../assumptions";
import { fmtDuration, fmtH } from "./calendar";
import { schedule } from "./engine";
import { metrics, totalLateH } from "./metrics";
import { moveInSequences, sequencesOf, suggestedIndex } from "./moves";
import { changeover, familyKey, incompatibility } from "./rules";
import type { Inputs, Insight, Machine, PlannerOrder, Schedule } from "./types";

const SEVERITY = { high: 0, medium: 1, info: 2 } as const;
const MAX_MOVES = 3;

/** Total changeover minutes if the jobs ran in this order. */
function changeoverMin(list: PlannerOrder[]): number {
  return list.reduce((sum, o, i) => sum + (i === 0 ? 0 : changeover(list[i - 1], o).minutes), 0);
}

/** The same jobs with each setup family run back to back (families in the order they first appear). */
function regrouped(list: PlannerOrder[]): PlannerOrder[] {
  const order: string[] = [];
  for (const o of list) if (!order.includes(familyKey(o))) order.push(familyKey(o));
  return order.flatMap((k) => list.filter((o) => familyKey(o) === k));
}

/**
 * Moves worth making, found by trying them: for each order that is late, or on an overloaded
 * machine, put it on every other compatible machine, re-run the scheduler with everything else kept
 * in order, and keep the move only if the plan really gets better.
 */
function betterMoves(inputs: Inputs, base: Schedule, overloaded: Set<string>): Insight[] {
  const byId = new Map(inputs.orders.map((o) => [o.id, o]));
  const name = new Map(inputs.machines.map((m) => [m.id, m.name]));
  const baseSeq = sequencesOf(base);
  const baseLate = base.placements.filter((p) => p.status === "late").length;
  const baseTotal = totalLateH(base);
  const baseFinish = metrics(base, inputs).finishH;
  const found: { gain: number; insight: Insight }[] = [];

  for (const p of base.placements) {
    const order = byId.get(p.orderId);
    if (!order || (p.status !== "late" && !overloaded.has(p.machineId))) continue;
    let best: { gain: number; insight: Insight } | null = null;
    for (const m of inputs.machines) {
      if (m.id === p.machineId || incompatibility(order, m).length > 0) continue;
      const at = suggestedIndex(base, p.orderId, m.id);
      const next = schedule(inputs, { sequences: moveInSequences(baseSeq, p.orderId, m.id, at) });
      const late = next.placements.filter((q) => q.status === "late").length;
      const total = totalLateH(next);
      const finish = metrics(next, inputs).finishH;
      const fewerLate = (late < baseLate && total <= baseTotal + 0.5) || (late === baseLate && total < baseTotal - 0.1);
      const sooner = late <= baseLate && total <= baseTotal + 1e-9 && finish < baseFinish - 1;
      if (next.unscheduled.length > base.unscheduled.length || (!fewerLate && !sooner)) continue;
      const gain = (baseTotal - total) * 10 + (baseFinish - finish);
      const detail = fewerLate
        ? `Late orders ${baseLate} to ${late}; total lateness ${fmtDuration(baseTotal)} to ${fmtDuration(total)}.`
        : `The whole plan would finish ${fmtDuration(baseFinish - finish)} sooner (${fmtH(inputs.planStart, baseFinish)} to ${fmtH(inputs.planStart, finish)}).`;
      if (!best || gain > best.gain) {
        best = {
          gain,
          insight: {
            id: `move-${p.orderId}-${m.id}`,
            severity: p.status === "late" ? "high" : "medium",
            title: `Move ${p.orderId} to ${name.get(m.id)}`,
            detail,
            orderId: p.orderId,
            machineId: m.id,
            action: { label: `Move to ${name.get(m.id)}`, orderId: p.orderId, machineId: m.id },
          },
        };
      }
    }
    if (best) found.push(best);
  }
  return found.sort((a, b) => b.gain - a.gain).slice(0, MAX_MOVES).map((f) => f.insight);
}

/** Recommendations read off the schedule itself: every figure is calculated from the plan, none is canned text. */
export function insights(inputs: Inputs, s: Schedule): Insight[] {
  const out: Insight[] = [];
  const byId = new Map(inputs.orders.map((o) => [o.id, o]));
  const machines = new Map<string, Machine>(inputs.machines.map((m) => [m.id, m]));
  const m = metrics(s, inputs);
  const at = (h: number) => fmtH(inputs.planStart, h);

  for (const u of s.unscheduled) {
    out.push({ id: `unscheduled-${u.orderId}`, severity: "high", title: `${u.orderId} is not scheduled`, detail: u.reason, orderId: u.orderId });
  }

  for (const p of s.placements) {
    if (p.status === "late") {
      out.push({
        id: `late-${p.orderId}`,
        severity: "high",
        title: `${p.orderId} may miss its deadline by ${fmtDuration(p.lateH)}`,
        detail: `Finishes ${at(p.endH)} on ${machines.get(p.machineId)?.name} against a deadline of ${at(p.dueH)}.`,
        orderId: p.orderId,
        machineId: p.machineId,
      });
    } else if (p.status === "at-risk") {
      out.push({
        id: `risk-${p.orderId}`,
        severity: "medium",
        title: `${p.orderId} has only ${fmtDuration(p.slackH)} to spare`,
        detail: `Finishes ${at(p.endH)} against a deadline of ${at(p.dueH)}. Any stop on ${machines.get(p.machineId)?.name} makes it late.`,
        orderId: p.orderId,
        machineId: p.machineId,
      });
    }
    if (p.materialWaitH > 0.25) {
      out.push({
        id: `paper-${p.orderId}`,
        severity: "medium",
        title: `${p.orderId} waits ${fmtDuration(p.materialWaitH)} for paper`,
        detail: `Its reels arrive ${at(p.materialReadyH)}. The machine could have started earlier.`,
        orderId: p.orderId,
      });
    }
  }

  const overloaded = new Set<string>();
  for (const l of m.loads) {
    const over = (l.load - 1) * 100;
    if (over < PLANNER.overloadNotePct) continue;
    overloaded.add(l.machineId);
    out.push({
      id: `load-${l.machineId}`,
      severity: over >= 10 ? "high" : "medium",
      title: `${machines.get(l.machineId)?.name} is overloaded by ${Math.round(over)}%`,
      detail: `${fmtDuration(l.load * l.availH)} of work against ${fmtDuration(l.availH)} of open time before the last deadline.`,
      machineId: l.machineId,
    });
  }

  for (const machine of inputs.machines) {
    const jobs = (s.sequences[machine.id] ?? []).map((id) => byId.get(id)).filter((o): o is PlannerOrder => !!o);
    const saved = changeoverMin(jobs) - changeoverMin(regrouped(jobs));
    if (saved < PLANNER.groupingNoteMin) continue;
    const split = [...new Set(jobs.map(familyKey))].filter((k) => {
      const idx = jobs.map((o, i) => (familyKey(o) === k ? i : -1)).filter((i) => i >= 0);
      return idx.length > 1 && idx[idx.length - 1] - idx[0] + 1 > idx.length;
    });
    const ids = jobs.filter((o) => split.includes(familyKey(o))).map((o) => o.id);
    out.push({
      id: `group-${machine.id}`,
      severity: "info",
      title: `${ids.length} orders on ${machine.name} could be grouped`,
      detail: `${ids.join(", ")} share grade, flute and print but other jobs sit between them. Run together they save ${Math.round(saved)} min of changeover, deadlines allowing.`,
      machineId: machine.id,
    });
  }

  for (const l of m.loads) {
    if (l.idleH < PLANNER.idleNoteH || l.availH === 0) continue;
    const machine = machines.get(l.machineId) as Machine;
    const helpable = s.placements
      .filter((p) => p.machineId !== machine.id && (p.status !== "on-time" || overloaded.has(p.machineId)))
      .map((p) => byId.get(p.orderId))
      .filter((o): o is PlannerOrder => !!o && incompatibility(o, machine).length === 0)
      .map((o) => o.id);
    out.push({
      id: `idle-${machine.id}`,
      severity: "info",
      title: `${machine.name} has ${fmtDuration(l.idleH)} idle`,
      detail: helpable.length
        ? `It could take ${helpable.slice(0, 3).join(", ")} from busier machines.`
        : "Nothing waiting elsewhere is compatible with it.",
      machineId: machine.id,
    });
  }

  out.push(...betterMoves(inputs, s, overloaded));
  return out.sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity]);
}
