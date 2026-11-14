import { describe, expect, it } from "vitest";
import { PLANNER } from "@/lib/assumptions";
import { consume, dayOfWeek, fmtDuration, fromInputValue, HOUR_MS, minus, nextPlanStart, operatingSegments, toInputValue } from "@/lib/planner/calendar";
import { schedule } from "@/lib/planner/engine";
import { scheduleToCsv, cell } from "@/lib/planner/export";
import { insights } from "@/lib/planner/insights";
import { metrics, totalLateH } from "@/lib/planner/metrics";
import { indexAt, moveInSequences, nudge, sequencesOf } from "@/lib/planner/moves";
import { blankSize, changeover, compatible, incompatibility, materialNeed, runHours } from "@/lib/planner/rules";
import { buildInputs, MACHINES, MAINTENANCE, sampleOrders } from "@/lib/planner/sample";
import type { Inputs, PlannerOrder } from "@/lib/planner/types";
import { parseOrder, isOrder, type Draft } from "@/lib/planner/validate";
import { applyScenario, compare, isActive, NO_SCENARIO, URGENT_ID } from "@/lib/planner/whatif";

/** Monday 2026-11-16 06:00 plant time. */
const START = Date.UTC(2026, 10, 16, 0, 30);
const orders = () => sampleOrders(START);
const inputs = (list: PlannerOrder[] = orders()): Inputs => buildInputs(START, list);
const machine = (id: string) => MACHINES.find((m) => m.id === id)!;
const order = (id: string, over: Partial<PlannerOrder> = {}): PlannerOrder => ({ ...orders().find((o) => o.id === id)!, ...over });

describe("plant calendar", () => {
  it("knows the plan start is a Monday 06:00 and skips Sundays", () => {
    expect(dayOfWeek(START + 6 * HOUR_MS)).toBe(1);
    // Saturday 2026-11-14 06:00 plant time: next start skips the Sunday.
    expect(dayOfWeek(nextPlanStart(Date.UTC(2026, 10, 14, 4, 0)) + 6 * HOUR_MS)).toBe(1);
  });

  it("a three-shift machine runs round the clock Monday to Saturday and stops on Sunday", () => {
    const seg = operatingSegments(machine("ps1"), START, 24 * 8);
    expect(seg[0]).toEqual({ from: 0, to: 24 * 6 - 6 + 6 - 0 - 0 + 0 === 0 ? 0 : seg[0].to });
    // Mon 06:00 to Sun 06:00 is 144 h, then closed until Mon 06:00 (Sunday shifts do not run).
    expect(seg[0].to).toBeCloseTo(144, 6);
    expect(seg[1].from).toBeCloseTo(168, 6);
  });

  it("a two-shift machine is closed overnight", () => {
    const seg = operatingSegments(machine("ps2"), START, 48);
    expect(seg[0]).toEqual({ from: 0, to: 16 });
    expect(seg[1].from).toBeCloseTo(24, 6);
  });

  it("subtracts downtime and spends work across the gaps", () => {
    const open = minus([{ from: 0, to: 10 }], [{ fromH: 4, toH: 6 }]);
    expect(open).toEqual([{ from: 0, to: 4 }, { from: 6, to: 10 }]);
    const used = consume(open, 2, 4);
    expect(used?.end).toBeCloseTo(8, 9);
    expect(used?.segments).toEqual([{ from: 2, to: 4 }, { from: 6, to: 8 }]);
    expect(consume(open, 0, 11)).toBeNull();
    expect(consume(open, 3, 0)).toEqual({ segments: [], end: 3 });
  });

  it("round-trips a deadline through the date input on the plant clock", () => {
    expect(toInputValue(START)).toBe("2026-11-16T06:00");
    expect(fromInputValue("2026-11-16T06:00")).toBe(START);
    expect(Number.isNaN(fromInputValue(""))).toBe(true);
    expect(fmtDuration(0.5)).toBe("30 min");
    expect(fmtDuration(2.5)).toBe("2.5 h");
  });
});

describe("machine compatibility", () => {
  it("only die-cutters take die-cut boxes", () => {
    const die = order("PL-108");
    expect(MACHINES.filter((m) => compatible(die, m)).map((m) => m.id)).toEqual(["dc1"]);
    expect(incompatibility(die, machine("ps1"))[0]).toMatch(/DIE/);
  });

  it("a 4-colour white-top job fits only the 4-colour, 230 GSM printer", () => {
    const job = order("PL-109");
    expect(MACHINES.filter((m) => compatible(job, m)).map((m) => m.id)).toEqual(["ps1"]);
    expect(incompatibility(job, machine("ps2")).join(" ")).toMatch(/colours/);
    expect(incompatibility(job, machine("ps2")).join(" ")).toMatch(/GSM/);
  });

  it("checks blank size against the machine limits", () => {
    const big = order("PL-101", { lengthMm: 1200, widthMm: 900, heightMm: 800 });
    expect(incompatibility(big, machine("ps2")).join(" ")).toMatch(/blank/);
  });

  it("works out the flat blank for each style", () => {
    const rsc = order("PL-101");
    expect(blankSize(rsc)).toEqual({ widthMm: 300 + 250, lengthMm: 2 * (400 + 300) + PLANNER.glueFlapMm });
    expect(blankSize(order("PL-108")).lengthMm).toBe(500 + 2 * 150);
  });
});

describe("changeover", () => {
  const a = order("PL-101");
  it("costs the first job a set-up and nothing for an identical job", () => {
    expect(changeover(null, a).minutes).toBe(PLANNER.firstSetupMin);
    expect(changeover(a, { ...a, id: "X" })).toEqual({ minutes: 0, why: [] });
  });

  it("adds the minutes for each thing that differs", () => {
    const c = PLANNER.changeoverMin;
    expect(changeover(a, { ...a, grade: "L180", gsm: 180 }).minutes).toBe(c.grade);
    expect(changeover(a, { ...a, flute: "C" }).minutes).toBe(c.flute);
    expect(changeover(a, { ...a, print: "4c" }).minutes).toBe(c.printColour);
    expect(changeover(a, { ...a, print: "none" }).minutes).toBe(c.printPlates);
    expect(changeover(a, { ...a, lengthMm: 500 }).minutes).toBe(c.size);
    expect(changeover(a, { ...a, grade: "L180", gsm: 180, flute: "C" }).minutes).toBe(c.grade + c.flute);
    expect(changeover(a, { ...a, flute: "C" }).why).toEqual(["flute B to C"]);
  });
});

describe("run time and paper", () => {
  it("run hours = quantity over rated rate times efficiency times speed", () => {
    const o = order("PL-101", { qty: 44_200 });
    expect(runHours(o, machine("ps1"))).toBeCloseTo(44_200 / (5200 * 0.85), 9);
    expect(runHours(o, machine("ps1"), 0.5)).toBeCloseTo(2 * runHours(o, machine("ps1")), 9);
  });

  it("double wall needs more paper than single wall, and white top draws on duplex", () => {
    const single = materialNeed(order("PL-105", { flute: "B" }));
    const double = materialNeed(order("PL-105", { flute: "BC" }));
    expect(Object.values(double).reduce((s, t) => s + t, 0)).toBeGreaterThan(Object.values(single).reduce((s, t) => s + t, 0));
    expect(materialNeed(order("PL-109")).D230).toBeGreaterThan(0);
    expect(materialNeed(order("PL-101")).D230).toBeUndefined();
  });
});

describe("schedule", () => {
  const input = inputs();
  const s = schedule(input);
  const nameOf = (id: string) => s.placements.find((p) => p.orderId === id)!;

  it("is deterministic", () => {
    expect(schedule(input)).toEqual(s);
  });

  it("places every sample order on a compatible machine", () => {
    expect(s.unscheduled).toEqual([]);
    expect(s.placements).toHaveLength(input.orders.length);
    for (const p of s.placements) {
      const o = input.orders.find((x) => x.id === p.orderId)!;
      expect(compatible(o, machine(p.machineId))).toBe(true);
    }
  });

  it("never double-books a machine, and stays inside its open hours and away from maintenance", () => {
    for (const m of input.machines) {
      const busy = s.placements.filter((p) => p.machineId === m.id).flatMap((p) => [...p.changeover, ...p.run]).sort((a, b) => a.from - b.from);
      for (let i = 1; i < busy.length; i++) expect(busy[i].from).toBeGreaterThanOrEqual(busy[i - 1].to - 1e-9);
      for (const seg of busy) {
        expect(s.availability[m.id].some((o) => seg.from >= o.from - 1e-9 && seg.to <= o.to + 1e-9)).toBe(true);
        for (const d of MAINTENANCE.filter((x) => x.machineId === m.id)) {
          expect(seg.to <= d.fromH + 1e-9 || seg.from >= d.toH - 1e-9).toBe(true);
        }
      }
    }
  });

  it("run segments add up to the run hours, and the end is the last segment's end", () => {
    for (const p of s.placements) {
      expect(p.run.reduce((x, seg) => x + (seg.to - seg.from), 0)).toBeCloseTo(p.runH, 6);
      expect(p.endH).toBeCloseTo(p.run[p.run.length - 1].to, 9);
    }
  });

  it("flags late, at-risk and on-time against the deadline", () => {
    for (const p of s.placements) {
      expect(p.lateH).toBeCloseTo(Math.max(0, p.endH - p.dueH), 9);
      if (p.lateH > 0) expect(p.status).toBe("late");
      else if (p.slackH < PLANNER.riskBufferH) expect(p.status).toBe("at-risk");
      else expect(p.status).toBe("on-time");
    }
    const stressed = schedule(applyScenario(input, { ...NO_SCENARIO, breakdown: { machineId: "ps1", fromH: 0, hours: 30 } }));
    expect(stressed.placements.some((p) => p.status === "late")).toBe(true);
    expect(s.placements.some((p) => p.status === "at-risk")).toBe(true);
  });

  it("changeover on every placement is what the rules say for the previous job", () => {
    for (const m of input.machines) {
      const seq = s.placements.filter((p) => p.machineId === m.id);
      seq.forEach((p, i) => {
        const prev = i === 0 ? null : input.orders.find((o) => o.id === seq[i - 1].orderId)!;
        const next = input.orders.find((o) => o.id === p.orderId)!;
        expect(p.changeoverMin).toBe(changeover(prev, next).minutes);
      });
    }
  });

  it("puts an urgent order ahead of an identical normal one with the same deadline", () => {
    const base = order("PL-104");
    const list = [
      { ...base, id: "N-1", priority: "normal" as const },
      { ...base, id: "U-1", priority: "urgent" as const },
    ];
    const r = schedule(inputs(list));
    expect(r.placements.find((p) => p.orderId === "U-1")!.startH).toBeLessThanOrEqual(r.placements.find((p) => p.orderId === "N-1")!.startH);
  });

  it("groups same-family orders to save changeover without making the urgent one late", () => {
    const a = order("PL-101", { qty: 20_000 });
    const mk = (id: string, over: Partial<PlannerOrder>, dueH: number): PlannerOrder => ({ ...a, id, ...over, due: START + dueH * HOUR_MS });
    // One printer only: B/2c, C/2c, B/2c. Grouping runs the two B jobs together.
    const only = { ...inputs([mk("X1", {}, 20), mk("X2", { flute: "C" }, 22), mk("X3", {}, 24)]), machines: [machine("ps1")] };
    const r = schedule(only);
    expect(r.sequences.ps1).toEqual(["X1", "X3", "X2"]);
    expect(r.placements.every((p) => p.status !== "late")).toBe(true);
    // A tight middle job must NOT be pushed behind: grouping stops when it would make it late.
    const tight = { ...inputs([mk("X1", {}, 20), mk("X2", { flute: "C" }, 5.5), mk("X3", {}, 24)]), machines: [machine("ps1")] };
    expect(schedule(tight).sequences.ps1[0]).not.toBe("X3");
  });

  it("an order with no compatible machine is reported, not dropped", () => {
    const r = schedule(inputs([order("PL-101", { lengthMm: 2400, widthMm: 2400, heightMm: 2400 })]));
    expect(r.placements).toEqual([]);
    expect(r.unscheduled[0].reason).toMatch(/No machine can run it/);
  });

  it("handles no orders", () => {
    const r = schedule(inputs([]));
    expect(r.placements).toEqual([]);
    expect(r.unscheduled).toEqual([]);
    const m = metrics(r, inputs([]));
    expect(m.orders).toBe(0);
    expect(m.onTimeRate).toBe(1);
    expect(m.utilization).toBe(0);
    expect(insights(inputs([]), r)).toEqual(expect.any(Array));
  });

  it("a paper shortage holds an order until the purchase order lands, or blocks it", () => {
    const one = [order("PL-101")];
    const scarce = { ...inputs(one), stockT: { L150: 0, M120: 0 } };
    const wait = schedule(scarce);
    expect(wait.placements[0].materialWaitH).toBeGreaterThanOrEqual(0);
    expect(wait.placements[0].run[0].from).toBeGreaterThan(0);
    expect(wait.placements[0].materialWaitH).toBeGreaterThan(0);
    const none = schedule({ ...scarce, incoming: [] });
    expect(none.placements).toEqual([]);
    expect(none.unscheduled[0].reason).toMatch(/paper short/);
  });

  it("rescheduling a manual sequence is followed exactly", () => {
    const seq = sequencesOf(s);
    const target = seq.ps1.length > 1 ? seq.ps1[seq.ps1.length - 1] : seq.ps1[0];
    const moved = moveInSequences(seq, target, "ps1", 0);
    const r = schedule(input, { sequences: moved });
    expect(r.sequences.ps1[0]).toBe(target);
    expect(r.sequences.ps1).toEqual(moved.ps1);
    expect(r.placements).toHaveLength(input.orders.length);
  });

  it("reassigns an order to another compatible machine and recalculates", () => {
    const seq = sequencesOf(s);
    const candidate = input.orders.find((o) => compatible(o, machine("ps1")) && compatible(o, machine("ps2")) && nameOf(o.id).machineId === "ps2")!;
    const moved = moveInSequences(seq, candidate.id, "ps1", 0);
    const r = schedule(input, { sequences: moved });
    expect(r.placements.find((p) => p.orderId === candidate.id)!.machineId).toBe("ps1");
    expect(r.sequences.ps1[0]).toBe(candidate.id);
  });

  it("an order dragged onto an incompatible machine is rejected with a reason", () => {
    const moved = moveInSequences(sequencesOf(s), "PL-108", "ps1", 0);
    const r = schedule(input, { sequences: moved });
    expect(r.placements.some((p) => p.orderId === "PL-108")).toBe(false);
    expect(r.unscheduled.find((u) => u.orderId === "PL-108")?.reason).toMatch(/PS-1/);
  });

  it("orders added after a manual plan are placed automatically", () => {
    const seq = sequencesOf(s);
    const extra = { ...order("PL-101"), id: "PL-NEW" };
    const r = schedule(inputs([...input.orders, extra]), { sequences: seq });
    expect(r.placements.some((p) => p.orderId === "PL-NEW")).toBe(true);
  });

  it("nudge swaps neighbours and indexAt finds the drop position", () => {
    const seq = sequencesOf(s);
    const list = seq.ps1;
    expect(list.length).toBeGreaterThan(1);
    const swapped = nudge(s, list[0], 1);
    expect(swapped.ps1[1]).toBe(list[0]);
    expect(nudge(s, list[0], -1).ps1).toEqual(list);
    expect(indexAt(s, "ps1", "nobody", 0)).toBe(0);
    expect(indexAt(s, "ps1", "nobody", 1e6)).toBe(list.length);
  });
});

describe("metrics", () => {
  const input = inputs();
  const s = schedule(input);
  const m = metrics(s, input);

  it("counts orders, boxes, changeover and the on-time rate from the schedule", () => {
    expect(m.scheduled + m.unscheduled).toBe(m.orders);
    expect(m.plannedBoxes).toBe(input.orders.reduce((x, o) => x + o.qty, 0));
    expect(m.changeoverH).toBeCloseTo(s.placements.reduce((x, p) => x + p.changeoverMin, 0) / 60, 9);
    expect(m.onTimeRate).toBeCloseTo((m.scheduled - m.late) / m.orders, 9);
    expect(m.late).toBe(s.placements.filter((p) => p.status === "late").length);
    expect(totalLateH(s)).toBeCloseTo(s.placements.reduce((x, p) => x + p.lateH, 0), 9);
    expect(m.finishH).toBeCloseTo(Math.max(...s.placements.map((p) => p.endH)), 9);
  });

  it("load is assigned work over open hours; utilization never exceeds 100%", () => {
    for (const l of m.loads) {
      expect(l.utilization).toBeLessThanOrEqual(1 + 1e-9);
      expect(l.idleH).toBeCloseTo(Math.max(0, l.availH - l.runH - l.changeoverH), 9);
    }
    const ps2 = m.loads.find((l) => l.machineId === "ps2")!;
    const mine = s.placements.filter((p) => p.machineId === "ps2");
    expect(ps2.load).toBeCloseTo(mine.reduce((x, p) => x + p.runH + p.changeoverMin / 60, 0) / ps2.availH, 9);
  });
});

describe("insights are calculated from the schedule", () => {
  // The demo plan is healthy; 30% more of everything makes it interesting.
  const input = applyScenario(inputs(), { ...NO_SCENARIO, qtyIncrease: { pct: 30 } });
  const s = schedule(input);
  const list = insights(input, s);

  it("names each late order with its real lateness", () => {
    for (const p of s.placements.filter((x) => x.status === "late")) {
      const found = list.find((i) => i.id === `late-${p.orderId}`);
      expect(found).toBeDefined();
      expect(found!.title).toContain(p.orderId);
    }
  });

  it("flags an overloaded machine with its real percentage", () => {
    const loaded = applyScenario(inputs(), { ...NO_SCENARIO, qtyIncrease: { pct: 60 } });
    const ls = schedule(loaded);
    const m = metrics(ls, loaded);
    const li = insights(loaded, ls);
    expect(m.loads.some((x) => x.load > 1 + PLANNER.overloadNotePct / 100)).toBe(true);
    for (const l of m.loads.filter((x) => (x.load - 1) * 100 >= PLANNER.overloadNotePct)) {
      expect(li.find((i) => i.id === `load-${l.machineId}`)?.title).toContain(`${Math.round((l.load - 1) * 100)}%`);
    }
  });

  it("every suggested move, when applied, really makes the plan better", () => {
    const moves = list.filter((i) => i.action);
    expect(moves.length).toBeGreaterThan(0);
    const before = s.placements.filter((p) => p.status === "late").length;
    for (const i of moves) {
      const a = i.action!;
      const seq = sequencesOf(s);
      const at = s.placements.filter((p) => p.machineId === a.machineId && p.dueH <= s.placements.find((q) => q.orderId === a.orderId)!.dueH).length;
      const r = schedule(input, { sequences: moveInSequences(seq, a.orderId, a.machineId, at) });
      const after = r.placements.filter((p) => p.status === "late").length;
      expect(after <= before).toBe(true);
      expect(totalLateH(r) <= totalLateH(s) + 0.5 || metrics(r, input).finishH < metrics(s, input).finishH).toBe(true);
      expect(r.unscheduled.length).toBeLessThanOrEqual(s.unscheduled.length);
    }
  });

  it("finds orders that could be grouped when a family is split", () => {
    const a = order("PL-101", { qty: 20_000 });
    const mk = (id: string, over: Partial<PlannerOrder>, dueH: number): PlannerOrder => ({ ...a, id, ...over, due: START + dueH * HOUR_MS });
    const only = { ...inputs([mk("X1", {}, 20), mk("X2", { flute: "C" }, 22), mk("X3", {}, 24)]), machines: [machine("ps1")] };
    const forced = schedule(only, { sequences: { ps1: ["X1", "X2", "X3"] } });
    const g = insights(only, forced).find((i) => i.id === "group-ps1");
    expect(g?.detail).toContain("X1, X3");
  });
});

describe("what-if", () => {
  const input = inputs();

  it("does nothing when no change is chosen, and never edits the original", () => {
    const frozen = JSON.stringify(input);
    expect(isActive(NO_SCENARIO)).toBe(false);
    expect(applyScenario(input, NO_SCENARIO)).toEqual(input);
    applyScenario(input, { ...NO_SCENARIO, qtyIncrease: { pct: 50 }, breakdown: { machineId: "ps1", fromH: 0, hours: 10 } });
    expect(JSON.stringify(input)).toBe(frozen);
    const c = compare(input, NO_SCENARIO);
    expect(c.scenario).toEqual(c.base);
    expect(c.newlyLate).toEqual([]);
  });

  it("a breakdown makes the plan worse", () => {
    const c = compare(input, { ...NO_SCENARIO, breakdown: { machineId: "ps1", fromH: 0, hours: 24 } });
    expect(totalLateH(c.scenario)).toBeGreaterThan(totalLateH(c.base));
    expect(c.scenarioMetrics.onTimeRate).toBeLessThanOrEqual(c.baseMetrics.onTimeRate);
    expect(c.scenario.downtime.some((d) => d.reason === "breakdown")).toBe(true);
  });

  it("slowing a machine lengthens its jobs", () => {
    const slow = applyScenario(input, { ...NO_SCENARIO, slow: { machineId: "ps1", pct: 50 } });
    const base = schedule(input).placements.find((p) => p.machineId === "ps1")!;
    const after = schedule(slow).placements.find((p) => p.orderId === base.orderId);
    if (after && after.machineId === "ps1") expect(after.runH).toBeGreaterThan(base.runH);
    expect(slow.speed.ps1).toBeCloseTo(0.5, 9);
  });

  it("an extra shift opens more hours and cannot make the plan later", () => {
    const c = compare(input, { ...NO_SCENARIO, extraShift: { machineId: "ps2" } });
    expect(c.scenario.availability.ps2.reduce((x, s) => x + s.to - s.from, 0)).toBeGreaterThan(c.base.availability.ps2.reduce((x, s) => x + s.to - s.from, 0));
    expect(totalLateH(c.scenario)).toBeLessThanOrEqual(totalLateH(c.base) + 1e-6);
  });

  it("an extra shift on a three-shift machine opens Sunday", () => {
    const ext = applyScenario(input, { ...NO_SCENARIO, extraShift: { machineId: "ps1" } });
    expect(ext.machines.find((m) => m.id === "ps1")?.sundayWork).toBe(true);
  });

  it("an urgent order adds work and shows its effect", () => {
    const c = compare(input, { ...NO_SCENARIO, urgentOrder: { qty: 40_000, dueInH: 12 } });
    expect(c.inputs.orders.some((o) => o.id === URGENT_ID)).toBe(true);
    expect(c.scenarioMetrics.orders).toBe(c.baseMetrics.orders + 1);
    expect(c.scenarioMetrics.plannedBoxes).toBe(c.baseMetrics.plannedBoxes + 40_000);
  });

  it("a paper shortage can leave orders unscheduled", () => {
    const c = compare(input, { ...NO_SCENARIO, shortage: { grade: "L150", pct: 100 } });
    expect(c.scenario.unscheduled.length).toBeGreaterThan(c.base.unscheduled.length);
    expect(c.newlyLate.length).toBeGreaterThan(0);
  });

  it("growing every order grows the load", () => {
    const c = compare(input, { ...NO_SCENARIO, qtyIncrease: { pct: 40 } });
    expect(c.scenarioMetrics.plannedBoxes).toBeGreaterThan(c.baseMetrics.plannedBoxes * 1.3);
    expect(c.scenarioMetrics.late).toBeGreaterThanOrEqual(c.baseMetrics.late);
  });
});

describe("order form validation", () => {
  const good: Draft = {
    id: "PL-900", customer: "Test Foods", style: "RSC", lengthMm: "400", widthMm: "300", heightMm: "250", qty: "10000",
    grade: "L150", flute: "B", print: "2c", due: "2026-11-18T12:00", priority: "normal",
  };

  it("accepts a complete order and fills the GSM from the grade", () => {
    const r = parseOrder(good, [], START);
    expect(r.errors).toEqual({});
    expect(r.order).toMatchObject({ id: "PL-900", qty: 10_000, gsm: 150, due: fromInputValue("2026-11-18T12:00") });
  });

  it("reports every problem at once", () => {
    const r = parseOrder({ ...good, id: "", customer: "", lengthMm: "10", widthMm: "abc", heightMm: "9999", qty: "0", due: "" }, [], START);
    expect(r.order).toBeNull();
    expect(Object.keys(r.errors).sort()).toEqual(["customer", "due", "heightMm", "id", "lengthMm", "qty", "widthMm"]);
  });

  it("rejects fractions, negatives and huge quantities", () => {
    expect(parseOrder({ ...good, qty: "12.5" }, [], START).errors.qty).toBeDefined();
    expect(parseOrder({ ...good, qty: "-5" }, [], START).errors.qty).toBeDefined();
    expect(parseOrder({ ...good, qty: "99999999" }, [], START).errors.qty).toBeDefined();
  });

  it("rejects a duplicate id (any case), a deadline before the plan, and unknown choices", () => {
    expect(parseOrder(good, ["pl-900"], START).errors.id).toMatch(/in use/);
    expect(parseOrder({ ...good, due: "2026-11-10T08:00" }, [], START).errors.due).toMatch(/before the plan/);
    const bad = parseOrder({ ...good, style: "X", flute: "Z", grade: "Q", print: "9c", priority: "now" }, [], START);
    expect(Object.keys(bad.errors).sort()).toEqual(["flute", "grade", "print", "priority", "style"]);
  });

  it("drops stored junk instead of crashing", () => {
    expect(isOrder(order("PL-101"))).toBe(true);
    expect(isOrder(null)).toBe(false);
    expect(isOrder({ ...order("PL-101"), qty: -1 })).toBe(false);
    expect(isOrder({ ...order("PL-101"), flute: "Z" })).toBe(false);
    expect(isOrder({ id: "x" })).toBe(false);
  });
});

describe("CSV export", () => {
  it("quotes, escapes and defuses formulas", () => {
    expect(cell("plain")).toBe("plain");
    expect(cell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(cell("=1+1")).toBe("'=1+1");
    expect(cell("+cmd")).toBe("'+cmd");
    expect(cell("a\nb")).toBe('"a\nb"');
  });

  it("writes one row per scheduled and per unscheduled order", () => {
    const input = inputs([...orders(), order("PL-101", { id: "PL-BAD", lengthMm: 2400, widthMm: 2400, heightMm: 2400 })]);
    const s = schedule(input);
    const lines = scheduleToCsv(input, s).split("\r\n");
    expect(lines[0].split(",")[0]).toBe("Order");
    expect(lines).toHaveLength(1 + input.orders.length);
    expect(lines.some((l) => l.startsWith("PL-BAD") && l.includes("Not scheduled"))).toBe(true);
  });
});
