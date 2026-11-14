import { hoursWithin, minus } from "./calendar";
import type { Inputs, MachineLoad, Metrics, Schedule, Segment } from "./types";

/** Load per machine inside the planning window (up to the last deadline), and the plan's headline numbers. */
export function metrics(s: Schedule, inputs: Inputs): Metrics {
  const loads: MachineLoad[] = inputs.machines.map((m) => {
    const mine = s.placements.filter((p) => p.machineId === m.id);
    const availH = hoursWithin(s.availability[m.id] ?? [], s.windowH);
    const runH = hoursWithin(mine.flatMap((p) => p.run), s.windowH);
    const changeoverH = hoursWithin(mine.flatMap((p) => p.changeover), s.windowH);
    const demandH = mine.reduce((sum, p) => sum + p.runH + p.changeoverMin / 60, 0);
    return {
      machineId: m.id,
      availH,
      runH,
      changeoverH,
      idleH: Math.max(0, availH - runH - changeoverH),
      utilization: availH > 0 ? (runH + changeoverH) / availH : 0,
      load: availH > 0 ? demandH / availH : mine.length > 0 ? Infinity : 0,
    };
  });
  const avail = loads.reduce((sum, l) => sum + l.availH, 0);
  const busy = loads.reduce((sum, l) => sum + l.runH + l.changeoverH, 0);
  const late = s.placements.filter((p) => p.status === "late").length;
  const atRisk = s.placements.filter((p) => p.status === "at-risk").length;
  const total = inputs.orders.length;
  return {
    orders: total,
    scheduled: s.placements.length,
    unscheduled: s.unscheduled.length,
    plannedBoxes: s.placements.reduce((sum, p) => sum + (inputs.orders.find((o) => o.id === p.orderId)?.qty ?? 0), 0),
    utilization: avail > 0 ? busy / avail : 0,
    changeoverH: s.placements.reduce((sum, p) => sum + p.changeoverMin / 60, 0),
    atRisk,
    late,
    onTimeRate: total > 0 ? (s.placements.length - late) / total : 1,
    finishH: s.placements.reduce((mx, p) => Math.max(mx, p.endH), 0),
    loads,
  };
}

/** Sum of hours every order finishes after its deadline. */
export const totalLateH = (s: Schedule): number => s.placements.reduce((sum, p) => sum + p.lateH, 0);

/** Open hours on a machine that nothing is scheduled in, inside the planning window. */
export function idleSegments(s: Schedule, machineId: string): Segment[] {
  const used = s.placements
    .filter((p) => p.machineId === machineId)
    .flatMap((p) => [...p.changeover, ...p.run])
    .map((x) => ({ fromH: x.from, toH: x.to }));
  return minus(s.availability[machineId] ?? [], used)
    .map((x) => ({ from: x.from, to: Math.min(x.to, s.windowH) }))
    .filter((x) => x.to - x.from > 1e-9);
}
