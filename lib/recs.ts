import {
  P,
  SHIFT_IDS,
  SHIFT_START_HOUR,
  SHIFTS_PER_MONTH,
  TARGET,
  WASTE_PER_M2,
} from "./assumptions";
import { num, pct } from "./format";
import { calc, simulate, type ShiftDay } from "./model";
import type { Rec, Scope, ShiftId, ShiftParams, TrimPlan } from "./types";

const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;
const DECKLE_M = P.deckleMm / 1000;
const MONTH = `× ${SHIFTS_PER_MONTH} shifts`;

/** Shift with the most reel waits in the scope, and its average minutes. */
function worstReelShift(scope: Scope, days: ShiftDay[]): { shift: ShiftId; minutes: number } {
  const candidates = scope === "A" || scope === "B" || scope === "C" ? [scope] : SHIFT_IDS;
  return candidates
    .map((shift) => {
      const own = days.filter((d) => d.shift === shift);
      return { shift, minutes: own.reduce((s, d) => s + d.reasons.reels, 0) / own.length };
    })
    .reduce((a, b) => (b.minutes > a.minutes ? b : a));
}

/**
 * The fixes, ranked by ₹ recovered a month. Each one's ₹ is `simulate(base, base + preset)`,
 * so pressing Simulate reproduces the card exactly (CLAUDE.md §4 rule 18).
 */
export function recsCalc(scope: Scope, base: ShiftParams, days: ShiftDay[], trim: TrimPlan): Rec[] {
  const c = calc(base);
  const gross = c.grossM2;
  const t = base.trimPct / 100;
  const r = base.rejectPct / 100;
  const perMonth = (preset: Partial<ShiftParams>) => simulate(base, { ...base, ...preset }).perMonth;

  const trimTo = round(base.trimPct * (trim.bestPct / trim.plannedPct), 2);
  const reels = worstReelShift(scope, days);
  const avoidable =
    days.reduce((s, d) => s + Math.max(0, d.reasons.reels - TARGET.reelWaitMin), 0) / days.length;
  const downtimeTo = round(base.downtimeMin - avoidable, 1);
  const netPerM2 = P.marginPerM2 - WASTE_PER_M2 * (t + (1 - t) * r);

  const recs: Omit<Rec, "perMonth">[] = [
    {
      id: "trim",
      title: `Re-plan corrugator runs to cut trim from ${pct(base.trimPct)} to ${pct(trimTo)}`,
      body: "Pair orders of the same flute so they fill more of the web. The deckle planner shows the better pairing for every run.",
      owner: "Planning",
      effort: "Low",
      lever: "trimPct",
      preset: { trimPct: trimTo },
      formula: `${num(base.trimPct - trimTo, 2)} pts less trim × ${num(gross)} m² a shift × ${pct((1 - r) * 100)} kept after rejects × ₹${num(WASTE_PER_M2, 2)}/m² ${MONTH}`,
    },
    {
      id: "reels",
      title: `Stage reels before Shift ${reels.shift} starts`,
      body: `Shift ${reels.shift} loses ${num(reels.minutes)} min a shift waiting for paper reels. Have the outgoing crew stage the first three hours of reels before ${String(SHIFT_START_HOUR[reels.shift]).padStart(2, "0")}:00.`,
      owner: "Stores",
      effort: "Low",
      lever: "downtimeMin",
      preset: { downtimeMin: downtimeTo },
      formula: `${num(base.downtimeMin - downtimeTo, 1)} min a shift × ${num(base.speed)} m/min × ${num(DECKLE_M, 1)} m × ₹${num(netPerM2, 2)}/m² net of trim and rejects ${MONTH}`,
    },
    {
      id: "smed",
      title: `Cut Printer-Slotter changeovers from ${num(base.psChangeoverMin)} to ${TARGET.psChangeoverMin} min a shift`,
      body: "Mount plates and mix ink off-line while the last order runs. The Printer-Slotter is the constraint, so every minute saved is extra boxes out of the plant.",
      owner: "Converting",
      effort: "Medium",
      lever: "psChangeoverMin",
      preset: { psChangeoverMin: TARGET.psChangeoverMin },
      formula: `${num(base.psChangeoverMin - TARGET.psChangeoverMin)} min × ${num(P.psBoxesPerHour)} boxes/h × ₹${P.boxMargin} a box ${MONTH}`,
    },
    {
      id: "rejects",
      title: "Check glue and steam at every shift start",
      body: `Rejects run at ${pct(base.rejectPct)} against a ${pct(TARGET.rejectPct)} target, mostly warp and weak bonding. A 10-minute check on glue viscosity and steam pressure catches them.`,
      owner: "Quality",
      effort: "Low",
      lever: "rejectPct",
      preset: { rejectPct: TARGET.rejectPct },
      formula: `${num(base.rejectPct - TARGET.rejectPct, 2)} pts × ${num(gross - c.trimM2)} m² a shift × ₹${num(WASTE_PER_M2, 2)}/m² ${MONTH}`,
    },
  ];

  return recs
    .map((rec) => ({ ...rec, perMonth: perMonth(rec.preset) }))
    .filter((rec) => rec.perMonth > 0)
    .sort((a, b) => b.perMonth - a.perMonth);
}

