import { P, REASONS, SCOPE_WORKING_DAYS, SHIFT_IDS } from "./assumptions";
import { pct } from "./format";
import { averageParams, calc, ratios, shiftParams, simulate, sumCalc, type ShiftDay } from "./model";
import type { ReasonId, Scope, ShiftId, ShiftParams } from "./types";

export type ShiftRow = {
  id: ShiftId;
  oee: number;
  availability: number;
  speed: number;
  trimPct: number;
  rejectPct: number;
  psChangeoverMin: number;
  downtimeMin: number;
  /** ₹ leaked in the window. */
  leak: number;
  base: ShiftParams;
};

export type Cause = { label: string; detail: string; perMonth: number };

export type ShiftIntel = {
  /** The window compared: "today", "7d" or "30d". Shift scopes compare today. */
  period: "today" | "7d" | "30d";
  rows: ShiftRow[];
  best: ShiftRow;
  weakest: ShiftRow;
  /** OEE points between best and weakest. */
  oeeGap: number;
  /** Why the weakest shift trails the best, largest ₹ first. Each is priced on its own, so they overlap a little. */
  causes: Cause[];
};

const windowOf = (scope: Scope): ShiftIntel["period"] => (scope === "7d" || scope === "30d" ? scope : "today");

function shiftDays(shift: ShiftId, period: ShiftIntel["period"]): ShiftDay[] {
  return Array.from({ length: SCOPE_WORKING_DAYS[period] }, (_, day) => shiftParams(day, shift));
}

const mean = (list: ShiftDay[], pick: (d: ShiftDay) => number) => list.reduce((s, d) => s + pick(d), 0) / list.length;

/**
 * Shifts A, B and C side by side over the scope's window, the weakest one, and what separates it
 * from the best. Every ₹ is `simulate(weakest, weakest with one thing set to the best shift's level)`,
 * the same engine as the fixes, per month.
 */
export function shiftIntel(scope: Scope): ShiftIntel {
  const period = windowOf(scope);
  const days = Object.fromEntries(SHIFT_IDS.map((s) => [s, shiftDays(s, period)])) as Record<ShiftId, ShiftDay[]>;
  const rows: ShiftRow[] = SHIFT_IDS.map((id) => {
    const total = sumCalc(days[id].map((d) => calc(d.params)));
    const r = ratios(total);
    const base = averageParams(days[id]);
    return {
      id,
      oee: r.oee * 100,
      availability: r.availability * 100,
      speed: total.grossM2 / ((total.runMin * (P.deckleMm / 1000))),
      trimPct: (total.trimM2 / total.grossM2) * 100,
      rejectPct: (total.rejectM2 / (total.grossM2 - total.trimM2)) * 100,
      psChangeoverMin: total.psChangeoverMin / total.shifts,
      downtimeMin: base.downtimeMin,
      leak: total.leak,
      base,
    };
  });

  const best = rows.reduce((a, b) => (b.oee > a.oee ? b : a));
  const weakest = rows.reduce((a, b) => (b.oee < a.oee ? b : a));
  const w = weakest.base;
  const worth = (preset: Partial<ShiftParams>) => simulate(w, { ...w, ...preset }).perMonth;

  const causes: Cause[] = [];
  const add = (label: string, detail: string, perMonth: number) => {
    if (perMonth > 0) causes.push({ label, detail, perMonth });
  };

  if (best.base.speed > w.speed) {
    add(
      "Slower running",
      `${weakest.id} runs ${(best.base.speed - w.speed).toFixed(0)} m/min slower than ${best.id} (${w.speed.toFixed(0)} against ${best.base.speed.toFixed(0)} m/min).`,
      worth({ speed: best.base.speed }),
    );
  }
  if (best.base.trimPct < w.trimPct) {
    add("More trim", `Trim ${pct(w.trimPct)} on ${weakest.id}, ${pct(best.base.trimPct)} on ${best.id}.`, worth({ trimPct: best.base.trimPct }));
  }
  if (best.base.rejectPct < w.rejectPct) {
    add("More rejects", `Rejects ${pct(w.rejectPct)} on ${weakest.id}, ${pct(best.base.rejectPct)} on ${best.id}.`, worth({ rejectPct: best.base.rejectPct }));
  }
  for (const reason of REASONS) {
    const id: ReasonId = reason.id;
    const mine = mean(days[weakest.id], (d) => d.reasons[id]);
    const theirs = mean(days[best.id], (d) => d.reasons[id]);
    const excess = mine - theirs;
    if (excess < 1) continue;
    const detail = `${reason.label}: ${mine.toFixed(0)} min a shift on ${weakest.id}, ${theirs.toFixed(0)} on ${best.id}.`;
    if (reason.section === "corrugator") add(reason.label, detail, worth({ downtimeMin: w.downtimeMin - excess }));
    else if (id === "psChange") add(reason.label, detail, worth({ psChangeoverMin: w.psChangeoverMin - excess }));
  }
  causes.sort((a, b) => b.perMonth - a.perMonth);

  return { period, rows, best, weakest, oeeGap: best.oee - weakest.oee, causes: causes.slice(0, 4) };
}
