import type { ShiftId } from "../types";
import type { GradeId } from "../records";
import { GRADES } from "../records";
import { HOUR_MS } from "./calendar";
import { schedule } from "./engine";
import { metrics } from "./metrics";
import type { Inputs, Machine, Metrics, PlannerOrder, Schedule } from "./types";

/** One or more changes to try on the plan without touching it. */
export type Scenario = {
  /** A new urgent job lands on the floor. */
  urgentOrder: { qty: number; dueInH: number } | null;
  /** A machine stops for a while. */
  breakdown: { machineId: string; fromH: number; hours: number } | null;
  /** A machine runs slower than rated. */
  slow: { machineId: string; pct: number } | null;
  /** A machine runs an extra shift (a Sunday, if it already runs all three). */
  extraShift: { machineId: string } | null;
  /** Paper runs short: a grade loses part of its stock and purchase orders. */
  shortage: { grade: GradeId; pct: number } | null;
  /** Every order grows by this much. */
  qtyIncrease: { pct: number } | null;
};

export const NO_SCENARIO: Scenario = {
  urgentOrder: null,
  breakdown: null,
  slow: null,
  extraShift: null,
  shortage: null,
  qtyIncrease: null,
};

export const URGENT_ID = "WHAT-IF";

export const isActive = (s: Scenario): boolean => Object.values(s).some((v) => v !== null);

const ALL_SHIFTS: readonly ShiftId[] = ["A", "B", "C"];

function withExtraShift(m: Machine): Machine {
  const missing = ALL_SHIFTS.find((s) => !m.shifts.includes(s));
  return missing ? { ...m, shifts: [...m.shifts, missing] } : { ...m, sundayWork: true };
}

/** The inputs with the scenario's changes applied. The originals are not changed. */
export function applyScenario(inputs: Inputs, sc: Scenario): Inputs {
  let orders: PlannerOrder[] = [...inputs.orders];
  let machines: Machine[] = [...inputs.machines];
  let downtime = [...inputs.downtime];
  let stockT = { ...inputs.stockT };
  let incoming = inputs.incoming.map((i) => ({ ...i }));
  const speed = { ...inputs.speed };

  if (sc.qtyIncrease) orders = orders.map((o) => ({ ...o, qty: Math.round(o.qty * (1 + sc.qtyIncrease!.pct / 100)) }));
  if (sc.urgentOrder) {
    orders.push({
      id: URGENT_ID,
      customer: "Urgent job (what-if)",
      style: "RSC",
      lengthMm: 300,
      widthMm: 200,
      heightMm: 200,
      qty: sc.urgentOrder.qty,
      grade: "L150",
      gsm: GRADES.L150.gsm,
      flute: "B",
      print: "2c",
      due: inputs.planStart + sc.urgentOrder.dueInH * HOUR_MS,
      priority: "urgent",
    });
  }
  if (sc.breakdown) {
    const { machineId, fromH, hours } = sc.breakdown;
    downtime = [...downtime, { machineId, fromH, toH: fromH + hours, reason: "breakdown", note: "What-if breakdown" }];
  }
  if (sc.slow) speed[sc.slow.machineId] = Math.max(0.05, 1 - sc.slow.pct / 100);
  if (sc.extraShift) machines = machines.map((m) => (m.id === sc.extraShift!.machineId ? withExtraShift(m) : m));
  if (sc.shortage) {
    const keep = Math.max(0, 1 - sc.shortage.pct / 100);
    const grade = sc.shortage.grade;
    stockT = { ...stockT, [grade]: (stockT[grade] ?? 0) * keep };
    incoming = incoming.map((i) => (i.grade === grade ? { ...i, tonnes: i.tonnes * keep } : i));
  }
  return { ...inputs, orders, machines, downtime, stockT, incoming, speed };
}

export type Comparison = {
  inputs: Inputs;
  base: Schedule;
  scenario: Schedule;
  baseMetrics: Metrics;
  scenarioMetrics: Metrics;
  /** Orders on time in the base plan and late or unscheduled in the scenario. */
  newlyLate: string[];
  /** Late or unscheduled in the base plan and on time in the scenario. */
  recovered: string[];
};

const onTime = (s: Schedule, id: string): boolean => s.placements.some((p) => p.orderId === id && p.status !== "late");

/**
 * Run the automatic scheduler on the plan as it stands and again with the scenario applied, so the
 * two are compared like for like (manual moves are left out of both).
 */
export function compare(inputs: Inputs, sc: Scenario): Comparison {
  const scenarioInputs = applyScenario(inputs, sc);
  const base = schedule(inputs);
  const scenario = schedule(scenarioInputs);
  const ids = scenarioInputs.orders.map((o) => o.id);
  return {
    inputs: scenarioInputs,
    base,
    scenario,
    baseMetrics: metrics(base, inputs),
    scenarioMetrics: metrics(scenario, scenarioInputs),
    newlyLate: ids.filter((id) => !onTime(scenario, id) && onTime(base, id)),
    recovered: ids.filter((id) => onTime(scenario, id) && !onTime(base, id) && inputs.orders.some((o) => o.id === id)),
  };
}
