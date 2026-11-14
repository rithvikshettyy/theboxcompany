import { describe, expect, it } from "vitest";
import { SHIFTS_PER_MONTH } from "@/lib/assumptions";
import { actionCentre } from "@/lib/actions";
import { build, ratios, simulate } from "@/lib/model";
import { SCOPES } from "@/lib/scope";
import { shiftIntel } from "@/lib/shifts";

describe("action centre", () => {
  it.each(SCOPES)("lists the top 3 to 4 fixes, ranked, each priced like the simulator (%s)", (scope) => {
    const d = build(scope);
    const list = actionCentre(d);
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.length).toBeLessThanOrEqual(4);
    list.forEach((a, i) => {
      expect(a.rank).toBe(i + 1);
      expect(a.problem.length).toBeGreaterThan(10);
      expect(a.owner).not.toBe("");
      expect(Math.abs(simulate(d.base, { ...d.base, ...a.preset }).perMonth - a.perMonth)).toBeLessThan(1e-6);
      expect(a.shareOfLeak).toBeCloseTo(a.perMonth / ((d.totals.leak / d.shifts) * SHIFTS_PER_MONTH), 9);
      if (i > 0) expect(a.perMonth).toBeLessThanOrEqual(list[i - 1].perMonth);
    });
  });
});

describe("shift intelligence", () => {
  it.each(SCOPES)("finds the weakest shift by OEE and explains it in positive ₹ (%s)", (scope) => {
    const intel = shiftIntel(scope);
    expect(intel.rows.map((r) => r.id)).toEqual(["A", "B", "C"]);
    expect(intel.weakest.oee).toBe(Math.min(...intel.rows.map((r) => r.oee)));
    expect(intel.best.oee).toBe(Math.max(...intel.rows.map((r) => r.oee)));
    expect(intel.oeeGap).toBeCloseTo(intel.best.oee - intel.weakest.oee, 9);
    expect(intel.causes.length).toBeGreaterThan(0);
    for (const c of intel.causes) expect(c.perMonth).toBeGreaterThan(0);
  });

  it("agrees with the plant totals: the three shifts' OEE bracket the all-shift OEE", () => {
    const intel = shiftIntel("7d");
    const all = ratios(build("7d").totals).oee * 100;
    expect(all).toBeGreaterThanOrEqual(intel.weakest.oee);
    expect(all).toBeLessThanOrEqual(intel.best.oee);
    const leak = intel.rows.reduce((s, r) => s + r.leak, 0);
    expect(leak).toBeCloseTo(build("7d").totals.leak, 4);
  });

  it("names Shift C and its reel waits for today's plant", () => {
    const intel = shiftIntel("today");
    expect(intel.weakest.id).toBe("C");
    expect(intel.causes.some((c) => c.label === "Reels not staged")).toBe(true);
  });
});
