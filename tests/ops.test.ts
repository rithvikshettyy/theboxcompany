import { describe, expect, it } from "vitest";
import { OPS, ORDERS, P } from "@/lib/assumptions";
import { build } from "@/lib/model";
import { dailyTonnes, materials, orders, paperFor, production, quality } from "@/lib/ops";
import { GRADES, PENDING_DISPATCH, QUALITY_TESTS } from "@/lib/records";
import { SCOPES } from "@/lib/scope";

describe("production", () => {
  it.each(SCOPES)("converts good board to tonnes and compares with the scope's target (%s)", (scope) => {
    const d = build(scope);
    const p = production(d);
    expect(p.tons).toBeCloseTo((d.totals.goodM2 * OPS.boardKgPerM2) / 1000, 9);
    expect(p.targetM2).toBeCloseTo((OPS.dailyTargetM2 / P.shiftsPerDay) * d.shifts, 9);
    expect(p.ofTarget).toBeCloseTo(d.totals.goodM2 / p.targetM2, 12);
    // Side trim plus dry end is every m² of gross board that did not become good board.
    expect(p.trimPct + p.dryEndPct).toBeCloseTo((1 - d.totals.goodM2 / d.totals.grossM2) * 100, 9);
    expect(p.deckleUsePct).toBeLessThanOrEqual(p.deckleBestPct + 1e-9);
    expect(p.deckleBestPct).toBeLessThanOrEqual(100);
  });

  it("gives one figure per working day, today last", () => {
    const days = dailyTonnes(14);
    expect(days).toHaveLength(14);
    expect(days[13].label).toBe("Today");
    expect(days[13].tons).toBeCloseTo(production(build("today")).tons, 9);
  });
});

describe("materials", () => {
  const m = materials();
  it("checks stock plus incoming against the booked load, grade by grade", () => {
    for (const g of m.grades) expect(g.gap).toBeCloseTo(g.tonnes + g.incoming - g.load, 9);
    expect(m.stock).toBe(m.grades.reduce((s, g) => s + g.tonnes, 0));
  });

  it("builds 5-ply orders from 180 GSM liners and 140 GSM fluting only", () => {
    const fivePly = ORDERS.find((o) => o.flute === "BC");
    expect(Object.keys(paperFor(fivePly ?? ORDERS[0])).sort()).toEqual(["L180", "M140"]);
  });

  it("values stock at each grade's rate", () => {
    expect(m.stockValue).toBeCloseTo(m.grades.reduce((s, g) => s + g.tonnes * 1000 * GRADES[g.grade].rate, 0), 6);
  });
});

describe("quality and orders", () => {
  it("works out first-pass yield", () => {
    expect(quality().firstPassPct).toBeCloseTo((QUALITY_TESTS.passedFirstTime / QUALITY_TESTS.done) * 100, 12);
  });

  it("puts every pending dispatch in exactly one age bucket", () => {
    const o = orders();
    expect(o.aging.reduce((s, b) => s + b.count, 0)).toBe(PENDING_DISPATCH.length);
    expect(o.aging.reduce((s, b) => s + b.value, 0)).toBe(o.pendingValue);
  });

  it("flags only orders under the margin floor, thinnest first", () => {
    const o = orders();
    expect(o.lowMargin.every((m) => m.marginPct < OPS.marginFloorPct)).toBe(true);
    expect(o.margins.map((m) => m.marginPct)).toEqual([...o.margins.map((m) => m.marginPct)].sort((a, b) => a - b));
  });
});
