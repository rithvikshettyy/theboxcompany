import { P, TARGET } from "./assumptions";
import { inr, num, pct } from "./format";
import type { PlantData, Scope, WaterfallStep } from "./types";

/** What the scope is compared with, as read in a sentence. */
export const PREVIOUS_LABEL: Record<Scope, string> = {
  A: "Shift A yesterday",
  B: "Shift B yesterday",
  C: "Shift C yesterday",
  today: "yesterday",
  "7d": "the 7 days before",
  "30d": "the 30 days before",
};

export type LeakStory = {
  /** Leak now minus leak in the previous period. Positive means it got worse. */
  delta: number;
  worse: boolean;
  /** "more than yesterday" / "less than the 7 days before" */
  comparison: string;
  /** The biggest of the four losses. */
  top: WaterfallStep;
  /** One sentence: the biggest loss in ₹, then its cause with a number. */
  lede: string;
};

/** Words for the hero. Shared by the home page and the dashboard so they always agree. */
export function leakStory(d: PlantData): LeakStory {
  const delta = d.totals.leak - d.previous.leak;
  const worse = delta > 0;
  const losses = d.waterfall.filter((s) => s.key !== "potential" && s.key !== "earned");
  const top = losses.reduce((a, b) => (b.rupees > a.rupees ? b : a));
  const kpi = (id: string) => d.kpis.find((k) => k.id === id)?.value ?? 0;

  let cause: string;
  switch (top.key) {
    case "slow":
      cause = `The line averaged ${num(kpi("speed"))} m/min against ${P.ratedSpeed} rated.`;
      break;
    case "trim":
      cause = `Runs averaged ${pct(kpi("trimPct"))} trim against a ${pct(TARGET.trimPct)} target.`;
      break;
    case "rejects":
      cause = `${pct(kpi("rejectPct"))} of board was rejected against a ${pct(TARGET.rejectPct)} target.`;
      break;
    default: {
      const reason = d.pareto.corrugator[0];
      cause = `The biggest cause was ${reason.label.toLowerCase()}, ${num(reason.perShift)} min a shift.`;
    }
  }

  return {
    delta,
    worse,
    comparison: `${worse ? "more" : "less"} than ${PREVIOUS_LABEL[d.scope]}`,
    top,
    lede: `${top.label} cost the most, ${inr(top.rupees)} or ${pct((top.rupees / d.totals.leak) * 100, 0)} of the leak. ${cause}`,
  };
}
