import type { Schedule } from "./types";

type Sequences = Record<string, string[]>;

/** The plan's current order of jobs on every machine, ready to edit and feed back to the scheduler. */
export const sequencesOf = (s: Schedule): Sequences =>
  Object.fromEntries(Object.entries(s.sequences).map(([id, list]) => [id, [...list]]));

/** Move one order to `index` in a machine's sequence (clamped). The order leaves wherever it was. */
export function moveInSequences(seqs: Sequences, orderId: string, machineId: string, index: number): Sequences {
  const out: Sequences = Object.fromEntries(Object.entries(seqs).map(([id, list]) => [id, list.filter((x) => x !== orderId)]));
  const list = out[machineId] ?? [];
  const at = Math.max(0, Math.min(index, list.length));
  out[machineId] = [...list.slice(0, at), orderId, ...list.slice(at)];
  return out;
}

/** Where a drop at hour `atH` lands in a machine's sequence: after every job that starts before it. */
export function indexAt(s: Schedule, machineId: string, orderId: string, atH: number): number {
  return s.placements.filter((p) => p.machineId === machineId && p.orderId !== orderId && p.startH < atH).length;
}

/** Swap an order one place earlier (-1) or later (+1) on its machine. Returns the same sequences if it cannot move. */
export function nudge(s: Schedule, orderId: string, delta: -1 | 1): Sequences {
  const seqs = sequencesOf(s);
  for (const [machineId, list] of Object.entries(seqs)) {
    const i = list.indexOf(orderId);
    if (i < 0) continue;
    const j = i + delta;
    if (j < 0 || j >= list.length) return seqs;
    return moveInSequences(seqs, orderId, machineId, j);
  }
  return seqs;
}

/** Where a suggested move should sit on the new machine: after every job there due no later than this one. */
export function suggestedIndex(s: Schedule, orderId: string, machineId: string): number {
  const dueH = s.placements.find((p) => p.orderId === orderId)?.dueH ?? Infinity;
  return s.placements.filter((p) => p.machineId === machineId && p.orderId !== orderId && p.dueH <= dueH).length;
}
