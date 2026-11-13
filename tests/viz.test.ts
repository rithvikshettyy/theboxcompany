import { describe, expect, it } from "vitest";
import { build } from "@/lib/model";
import { kpiTrend, peakHour, planClock, shiftOfColumn, vitalFew, waterfallBars } from "@/lib/viz";
import type { Kpi } from "@/lib/types";

describe("waterfallBars", () => {
  it("bridges from rated capacity down to good board without gaps", () => {
    const bars = waterfallBars(build("today").waterfall);
    expect(bars[0]).toMatchObject({ kind: "total", from: 0, to: 1 });
    for (let i = 1; i < bars.length - 1; i++) {
      expect(bars[i].kind).toBe("loss");
      expect(bars[i].to).toBeCloseTo(i === 1 ? 1 : bars[i - 1].from, 12);
    }
    const last = bars[bars.length - 1];
    expect(last.kind).toBe("total");
    expect(last.to).toBeCloseTo(bars[bars.length - 2].from, 9);
  });
});

describe("vitalFew", () => {
  it("returns the causes up to and including the one that crosses 80%", () => {
    const rows = build("30d").pareto.corrugator;
    const few = vitalFew(rows);
    expect(few[few.length - 1].cumulative).toBeGreaterThanOrEqual(0.8);
    if (few.length > 1) expect(few[few.length - 2].cumulative).toBeLessThan(0.8);
  });
});

describe("planClock", () => {
  it("counts from 06:00 and marks the next day", () => {
    expect(planClock(0)).toBe("06:00");
    expect(planClock(95)).toBe("07:35");
    expect(planClock(18 * 60)).toBe("00:00 +1d");
  });
});

describe("kpiTrend", () => {
  const k = (value: number, previous: number, better: "higher" | "lower"): Kpi => ({
    id: "oee", label: "OEE", unit: "%", decimals: 1, value, previous, target: 70, better,
    status: "watch", spark: [], rupeesPerUnit: 0, perUnit: "per point",
  });
  it("calls a rise good when higher is better, and bad when lower is better", () => {
    expect(kpiTrend(k(60, 58, "higher"))).toMatchObject({ direction: "up", improving: true });
    expect(kpiTrend(k(60, 58, "lower"))).toMatchObject({ direction: "up", improving: false });
    expect(kpiTrend(k(60, 60.01, "higher"))).toMatchObject({ direction: "flat", improving: null });
  });
});

describe("heatmap helpers", () => {
  it("maps production columns to shifts and finds the peak hour", () => {
    expect(shiftOfColumn(0)).toBe("A");
    expect(shiftOfColumn(8)).toBe("B");
    expect(shiftOfColumn(16)).toBe("C");
    expect(shiftOfColumn(23)).toBe("C");
    const peak = peakHour(build("today").heatmap);
    expect(peak.avg).toBeGreaterThan(peak.overall);
  });
});
