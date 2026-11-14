import { describe, expect, it } from "vitest";
import { OPS, P, SHIFTS_PER_MONTH, TARGET, WASTE_PER_M2 } from "@/lib/assumptions";
import { build, ratios, shiftParams } from "@/lib/model";
import { production } from "@/lib/ops";
import { plantClock, shiftAt } from "@/lib/plantTime";
import { SCOPES } from "@/lib/scope";
import { trimPlan, trimSavings } from "@/lib/trim";

/**
 * Independent audit: every ₹ and OEE figure is recomputed here from the raw constants with plain
 * arithmetic, not by calling the functions under test.
 */
const W = P.deckleMm / 1000;

describe("targets agree with each other", () => {
  it("OEE target is availability × performance × quality at their own targets", () => {
    const implied =
      (TARGET.availability / 100) * (TARGET.speed / P.ratedSpeed) * (1 - TARGET.trimPct / 100) * (1 - TARGET.rejectPct / 100);
    expect(Math.abs(TARGET.oee - implied * 100)).toBeLessThan(0.05);
  });

  it("daily plan is rated output at the OEE target, so plan and OEE tell the same story", () => {
    const rated = P.ratedSpeed * W * P.shiftMin * P.shiftsPerDay;
    expect(Math.abs(OPS.dailyTargetM2 - rated * (TARGET.oee / 100))).toBeLessThanOrEqual(500);
  });

  it("total waste target is trim target plus reject target", () => {
    expect(OPS.wastageTargetPct).toBeCloseTo(TARGET.trimPct + TARGET.rejectPct, 6);
  });

  it("a plant exactly on every component target has OEE and plan both at 100% of target", () => {
    const run = P.shiftMin * TARGET.availability / 100;
    const gross = TARGET.speed * W * run;
    const good = gross * (1 - TARGET.trimPct / 100) * (1 - (TARGET.rejectPct / 100));
    const oee = good / (P.ratedSpeed * W * P.shiftMin);
    expect(Math.abs(oee * 100 - TARGET.oee)).toBeLessThan(0.05);
    expect(Math.abs((good * 3) / OPS.dailyTargetM2 - 1)).toBeLessThan(0.01);
  });
});

describe.each(SCOPES)("finance, scope %s", (scope) => {
  const d = build(scope);
  const days = scope === "A" || scope === "B" || scope === "C" ? 1 : { today: 1, "7d": 6, "30d": 26 }[scope];
  const list = (["A", "B", "C"] as const)
    .filter((s) => (scope === "A" || scope === "B" || scope === "C" ? s === scope : true))
    .flatMap((s) => Array.from({ length: days }, (_, day) => shiftParams(day, s).params));

  it("recomputes the leak from raw minutes, speeds and percentages", () => {
    let leak = 0;
    let good = 0;
    let rated = 0;
    for (const p of list) {
      const run = P.shiftMin - p.downtimeMin;
      const gross = p.speed * W * run;
      const trim = (gross * p.trimPct) / 100;
      const reject = ((gross - trim) * p.rejectPct) / 100;
      const slow = (P.ratedSpeed - p.speed) * W * run;
      const down = P.ratedSpeed * W * p.downtimeMin;
      leak += (down + slow) * P.marginPerM2 + (trim + reject) * (P.marginPerM2 + P.paperPerM2 * (1 - P.scrapRecovery));
      good += gross - trim - reject;
      rated += P.ratedSpeed * W * P.shiftMin;
    }
    expect(d.totals.leak).toBeCloseTo(leak, 4);
    expect(d.totals.goodM2).toBeCloseTo(good, 4);
    expect(ratios(d.totals).oee).toBeCloseTo(good / rated, 9);
    expect(d.kpis.find((k) => k.id === "oee")?.value).toBeCloseTo((good / rated) * 100, 6);
  });

  it("waste costs margin plus unrecovered paper per m²", () => {
    expect(WASTE_PER_M2).toBeCloseTo(3.2 + 16 * 0.65, 9);
  });

  it("each fix's ₹ a month matches its own stated arithmetic", () => {
    const b = d.base;
    const run = P.shiftMin - b.downtimeMin;
    const gross = b.speed * W * run;
    const t = b.trimPct / 100;
    const r = b.rejectPct / 100;
    const smed = d.recs.find((x) => x.id === "smed");
    if (smed) {
      const expected = ((b.psChangeoverMin - TARGET.psChangeoverMin) / 60) * P.psBoxesPerHour * P.boxMargin * SHIFTS_PER_MONTH;
      expect(smed.perMonth).toBeCloseTo(expected, 3);
    }
    const rejects = d.recs.find((x) => x.id === "rejects");
    if (rejects) {
      const expected = ((b.rejectPct - TARGET.rejectPct) / 100) * (gross - gross * t) * WASTE_PER_M2 * SHIFTS_PER_MONTH;
      expect(rejects.perMonth).toBeCloseTo(expected, 2);
    }
    const trim = d.recs.find((x) => x.id === "trim");
    if (trim) {
      const to = trim.preset.trimPct ?? b.trimPct;
      const expected = ((b.trimPct - to) / 100) * gross * (1 - r) * WASTE_PER_M2 * SHIFTS_PER_MONTH;
      expect(trim.perMonth).toBeCloseTo(expected, 2);
    }
    const reels = d.recs.find((x) => x.id === "reels");
    if (reels) {
      const to = reels.preset.downtimeMin ?? b.downtimeMin;
      const net = P.marginPerM2 - WASTE_PER_M2 * (t + (1 - t) * r);
      // Minutes won back run at current speed; the rest of the model prices them at the same net ₹.
      const expected = (b.downtimeMin - to) * b.speed * W * net * SHIFTS_PER_MONTH;
      expect(reels.perMonth).toBeCloseTo(expected, 2);
    }
  });

  it("no fix recovers more a month than the whole monthly leak", () => {
    const monthlyLeak = (d.totals.leak / d.shifts) * SHIFTS_PER_MONTH;
    for (const r of d.recs) expect(r.perMonth).toBeLessThan(monthlyLeak);
  });

  it("production tonnage is m² × board weight and the plan scales with shifts", () => {
    const p = production(d);
    expect(p.tons).toBeCloseTo((d.totals.goodM2 * OPS.boardKgPerM2) / 1000, 6);
    expect(p.targetTons).toBeCloseTo(((OPS.dailyTargetM2 / 3) * d.shifts * OPS.boardKgPerM2) / 1000, 6);
  });
});

describe("plant clock", () => {
  it("reads plant time (IST) whatever the viewer's zone", () => {
    // 2026-01-05 00:30 UTC is 06:00 in Kolkata (UTC+5:30).
    expect(plantClock(Date.UTC(2026, 0, 5, 0, 30)).label).toBe("06:00");
    // 18:29 UTC the day before is 23:59 plant time; one minute later it is 00:00, not 24:00.
    expect(plantClock(Date.UTC(2026, 0, 4, 18, 29)).label).toBe("23:59");
    expect(plantClock(Date.UTC(2026, 0, 4, 18, 30)).label).toBe("00:00");
  });

  it("maps hours to shifts, with C running past midnight", () => {
    expect([5, 6, 13, 14, 21, 22, 23, 0].map(shiftAt)).toEqual(["C", "A", "A", "B", "B", "C", "C", "C"]);
  });
});

describe("deckle planner savings", () => {
  it("saved paper and ₹ add up run by run and are never negative", () => {
    const plan = trimPlan();
    const s = trimSavings(plan);
    let m2 = 0;
    for (const r of plan.runs) m2 += ((r.planned.trimMm - r.best.trimMm) / 1000) * r.meters;
    expect(s.savedM2).toBeCloseTo(m2, 6);
    expect(s.savedM2).toBeGreaterThan(0);
    expect(s.byRun.every((r) => r.savedM2 >= -1e-9)).toBe(true);
    expect(s.rupeesPerDay).toBeCloseTo(m2 * (3.2 + 16 * 0.65), 4);
    expect(s.savedKg).toBeCloseTo(m2 * OPS.boardKgPerM2, 6);
  });
});
