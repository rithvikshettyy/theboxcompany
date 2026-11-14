import { SHIFTS_PER_MONTH } from "./assumptions";
import type { PlantData, Rec } from "./types";

export type Priority = "High" | "Medium" | "Low";

export type Action = {
  rank: number;
  id: Rec["id"];
  problem: string;
  action: string;
  /** ₹ a month if the fix is made (the simulator's figure for this preset). */
  perMonth: number;
  /** Share of the plant's monthly leak this fix wins back, 0 to 1. */
  shareOfLeak: number;
  priority: Priority;
  owner: string;
  effort: Rec["effort"];
  preset: Rec["preset"];
};

/** High once a fix wins back 5% of the monthly leak or more; Medium from 2%. */
export const PRIORITY_AT = { high: 0.05, medium: 0.02 } as const;

/**
 * The plant's top operational problems for the scope in view, as an action list: the problem, what to
 * do, what it is worth, who owns it and how urgent it is. Ranked by ₹ a month (recs already are).
 */
export function actionCentre(d: PlantData, limit = 4): Action[] {
  const monthlyLeak = (d.totals.leak / d.shifts) * SHIFTS_PER_MONTH;
  return d.recs.slice(0, limit).map((r, i) => {
    const shareOfLeak = r.perMonth / monthlyLeak;
    return {
      rank: i + 1,
      id: r.id,
      problem: r.problem,
      action: r.title,
      perMonth: r.perMonth,
      shareOfLeak,
      priority: shareOfLeak >= PRIORITY_AT.high ? "High" : shareOfLeak >= PRIORITY_AT.medium ? "Medium" : "Low",
      owner: r.owner,
      effort: r.effort,
      preset: r.preset,
    };
  });
}
