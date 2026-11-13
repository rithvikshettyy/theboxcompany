import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/plant/route";
import { EDGE, P, REELS, SHIFTS_PER_MONTH, TARGET } from "@/lib/assumptions";
import { inr, inrSigned, k, num, pct } from "@/lib/format";
import { build, calc, ratios, simulate } from "@/lib/model";
import { SCOPES } from "@/lib/scope";
import { leakStory } from "@/lib/story";
import { bestFor, fitRun, trimPlan } from "@/lib/trim";
import type { ShiftParams } from "@/lib/types";

/** Shift B's average conditions, worked through by hand below. */
const SHIFT_B: ShiftParams = {
  downtimeMin: 82,
  speed: 118,
  trimPct: 4.6,
  rejectPct: 2.1,
  psChangeoverMin: 96,
};

describe("calc", () => {
  it("turns Shift B's conditions into the hand-worked m² and ₹", () => {
    const c = calc(SHIFT_B);
    // 150 m/min × 1.8 m × 480 min
    expect(c.ratedM2).toBe(129_600);
    // 150 × 1.8 × 82 min stopped
    expect(c.downtimeM2).toBeCloseTo(22_140, 6);
    // 118 × 1.8 × 398 min running
    expect(c.grossM2).toBeCloseTo(84_535.2, 6);
    // (150 − 118) × 1.8 × 398
    expect(c.slowM2).toBeCloseTo(22_924.8, 6);
    expect(c.trimM2).toBeCloseTo(3_888.6192, 6);
    expect(c.rejectM2).toBeCloseTo(1_693.578197, 5);
    expect(c.goodM2).toBeCloseTo(78_953.0026, 3);
    // Margin ₹3.2/m²; waste ₹3.2 + ₹16 × (1 − 0.35) = ₹13.6/m²
    expect(c.loss.downtime).toBeCloseTo(70_848, 4);
    expect(c.loss.slow).toBeCloseTo(73_359.36, 4);
    expect(c.loss.trim).toBeCloseTo(52_885.22, 1);
    expect(c.loss.rejects).toBeCloseTo(23_032.66, 1);
    expect(c.potential).toBe(414_720);
    expect(c.leak).toBeCloseTo(220_125.24, 1);
    expect(c.earned).toBeCloseTo(194_594.76, 1);
  });

  it.each(SCOPES)("OEE equals availability × performance × quality (%s)", (scope) => {
    const { totals } = build(scope);
    const r = ratios(totals);
    expect(Math.abs(r.oee - r.availability * r.performance * r.quality)).toBeLessThan(1e-9);
    expect(Math.abs(r.oee - totals.goodM2 / totals.ratedM2)).toBeLessThan(1e-9);
  });
});

describe("build", () => {
  it("is deterministic", () => {
    expect(build("7d")).toEqual(build("7d"));
  });

  it.each(SCOPES)("waterfall closes and the hero leak is the sum of its losses (%s)", (scope) => {
    const d = build(scope);
    const [potential, ...rest] = d.waterfall;
    const earned = rest.pop();
    const losses = rest.reduce((s, step) => s + step.rupees, 0);
    expect(potential.rupees - losses).toBeCloseTo(earned?.rupees ?? NaN, 4);
    expect(losses).toBeCloseTo(d.totals.leak, 4);
    expect(leakStory(d).delta).toBeCloseTo(d.totals.leak - d.previous.leak, 4);
  });

  it.each(SCOPES)("the Printer-Slotter is the constraint (%s)", (scope) => {
    const constraint = build(scope).nodes.filter((n) => n.isConstraint);
    expect(constraint.map((n) => n.id)).toEqual(["ps"]);
  });

  it("covers the right number of shifts per scope", () => {
    expect(build("A").shifts).toBe(1);
    expect(build("today").shifts).toBe(3);
    expect(build("7d").shifts).toBe(18);
    expect(build("30d").shifts).toBe(SHIFTS_PER_MONTH);
  });
});

describe("trim optimiser", () => {
  const plan = trimPlan();
  const combos = plan.runs.flatMap((r) => [r.planned, r.best]);

  it("never returns trim under EDGE or a reel wider than the deckle", () => {
    for (const c of combos) {
      expect(c.trimMm).toBeGreaterThanOrEqual(EDGE);
      expect(c.reelMm).toBeLessThanOrEqual(P.deckleMm);
      expect(c.usedMm + c.trimMm).toBe(c.reelMm);
    }
    for (let used = 0; used <= P.deckleMm; used += 7) {
      const reel = fitRun(used);
      if (reel !== null) {
        expect(reel - used).toBeGreaterThanOrEqual(EDGE);
        expect(REELS).toContain(reel);
      } else {
        expect(used + EDGE).toBeGreaterThan(P.deckleMm);
      }
    }
  });

  it("never does worse than the planner", () => {
    for (const run of plan.runs) {
      expect(run.best.trimPct).toBeLessThanOrEqual(run.planned.trimPct + 1e-9);
      expect(bestFor(run.planned.orders[0].id)).toEqual(run.best);
    }
    expect(plan.bestPct).toBeLessThan(plan.plannedPct);
  });
});

describe("recommendations and simulator", () => {
  it.each(SCOPES)("each rec's preset reproduces its ₹ exactly in the simulator (%s)", (scope) => {
    const d = build(scope);
    expect(d.recs.length).toBeGreaterThan(0);
    for (const rec of d.recs) {
      const sim = simulate(d.base, { ...d.base, ...rec.preset });
      expect(sim.perMonth).toBeGreaterThan(0);
      expect(Math.abs(sim.perMonth - rec.perMonth) / rec.perMonth).toBeLessThan(1e-9);
    }
    const sorted = [...d.recs].sort((a, b) => b.perMonth - a.perMonth);
    expect(d.recs).toEqual(sorted);
  });

  it("baseline simulates to ₹0 and lever parts add up to the total", () => {
    const base = build("today").base;
    expect(simulate(base, base).perMonth).toBe(0);
    const next = { ...base, downtimeMin: 60, speed: 130, trimPct: 3, rejectPct: 1.5, psChangeoverMin: 42 };
    const sim = simulate(base, next);
    const parts = sim.byLever.reduce((s, l) => s + l.perMonth, 0);
    expect(parts).toBeCloseTo(sim.perMonth, 4);
    expect(sim.perYear).toBeCloseTo(sim.perMonth * 12, 4);
  });

  it("SMED ₹ is minutes saved × P-S rate × ₹ a box × shifts a month", () => {
    const d = build("today");
    const smed = d.recs.find((r) => r.id === "smed");
    const saved = d.base.psChangeoverMin - TARGET.psChangeoverMin;
    expect(smed?.perMonth).toBeCloseTo((saved / 60) * P.psBoxesPerHour * P.boxMargin * SHIFTS_PER_MONTH, 4);
  });
});

describe("order sequence", () => {
  it.each(SCOPES)("due-date order is never later, planned order never has more flute changes (%s)", (scope) => {
    const { planned, due } = build(scope).orders;
    expect(due.late).toBeLessThanOrEqual(planned.late);
    expect(planned.fluteChanges).toBeLessThanOrEqual(due.fluteChanges);
  });
});

describe("format", () => {
  it("formats ₹ in lakh and crore", () => {
    expect(inr(698000)).toBe("₹6.98 L");
    expect(inr(18400000)).toBe("₹1.84 Cr");
    expect(inr(84500)).toBe("₹84,500");
    expect(inr(99_999.6)).toBe("₹1.00 L");
    expect(inr(9_999_999)).toBe("₹1.00 Cr");
    expect(inr(-236000)).toBe("−₹2.36 L");
    expect(inrSigned(0)).toBe("+₹0");
    expect(inrSigned(-12400)).toBe("−₹12,400");
    expect(inrSigned(584064)).toBe("+₹5.84 L");
  });

  it("formats counts and percents en-IN", () => {
    expect(num(223327)).toBe("2,23,327");
    expect(num(-1.5, 1)).toBe("−1.5");
    expect(pct(61.43)).toBe("61.4%");
    expect(k(5200)).toBe("5.2k");
    expect(k(12000)).toBe("12k");
  });
});

describe("GET /api/plant", () => {
  it("returns PlantData for a valid scope", async () => {
    const res = GET(new Request("http://x/api/plant?scope=B"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scope).toBe("B");
    expect(body.totals.leak).toBeCloseTo(build("B").totals.leak, 6);
  });

  it("rejects an unknown scope with 400", async () => {
    expect(GET(new Request("http://x/api/plant?scope=D")).status).toBe(400);
    expect(GET(new Request("http://x/api/plant")).status).toBe(400);
  });
});
