import { OPS, PLANNER } from "../assumptions";
import { GRADES, type GradeId } from "../records";
import { PRINTS, type Machine, type PlannerOrder, type StyleId } from "./types";

/** Flat blank the box is cut from, mm. Allowances follow the usual fold layouts. */
export function blankSize(o: Pick<PlannerOrder, "style" | "lengthMm" | "widthMm" | "heightMm">): { widthMm: number; lengthMm: number } {
  const girth = 2 * (o.lengthMm + o.widthMm) + PLANNER.glueFlapMm;
  const byStyle: Record<StyleId, { widthMm: number; lengthMm: number }> = {
    RSC: { widthMm: o.widthMm + o.heightMm, lengthMm: girth },
    HSC: { widthMm: o.widthMm + o.heightMm / 2, lengthMm: girth },
    FOL: { widthMm: o.widthMm + 2 * o.heightMm, lengthMm: girth },
    DIE: { widthMm: o.widthMm + 2 * o.heightMm, lengthMm: o.lengthMm + 2 * o.heightMm },
  };
  return byStyle[o.style];
}

/** Why a machine cannot run an order. Empty means it can. */
export function incompatibility(o: PlannerOrder, m: Machine): string[] {
  const why: string[] = [];
  const blank = blankSize(o);
  if (!m.styles.includes(o.style)) why.push(`does not run ${o.style} boxes`);
  if (!m.flutes.includes(o.flute)) why.push(`does not run ${o.flute} flute`);
  if (PRINTS[o.print].colours > m.maxColours) why.push(`prints up to ${m.maxColours} colours, order needs ${PRINTS[o.print].colours}`);
  if (o.gsm > m.maxGsm) why.push(`takes up to ${m.maxGsm} GSM liner, order is ${o.gsm}`);
  if (blank.widthMm > m.maxBlankWidthMm) why.push(`blank is ${Math.round(blank.widthMm)} mm wide, limit ${m.maxBlankWidthMm}`);
  if (blank.lengthMm > m.maxBlankLengthMm) why.push(`blank is ${Math.round(blank.lengthMm)} mm long, limit ${m.maxBlankLengthMm}`);
  return why;
}

export const compatible = (o: PlannerOrder, m: Machine): boolean => incompatibility(o, m).length === 0;

/** Hours to make the order on a machine, at its working efficiency and any speed change. */
export function runHours(o: PlannerOrder, m: Machine, speed = 1): number {
  return o.qty / (m.ratePerHour * m.efficiency * speed);
}

/** Jobs that share these need no grade, flute or print change between them. */
export const familyKey = (o: PlannerOrder): string => `${o.grade}|${o.flute}|${o.print}`;

/** Changeover from one job to the next on a machine, and what causes it. `prev` null is a cold start. */
export function changeover(prev: PlannerOrder | null, next: PlannerOrder): { minutes: number; why: string[] } {
  const c = PLANNER.changeoverMin;
  if (!prev) return { minutes: PLANNER.firstSetupMin, why: ["first job set-up"] };
  let minutes = 0;
  const why: string[] = [];
  if (prev.grade !== next.grade) {
    minutes += c.grade;
    why.push(`grade ${prev.grade} to ${next.grade}`);
  }
  if (prev.flute !== next.flute) {
    minutes += c.flute;
    why.push(`flute ${prev.flute} to ${next.flute}`);
  }
  if (prev.print !== next.print) {
    const colour = PRINTS[prev.print].colours > 0 && PRINTS[next.print].colours > 0;
    minutes += colour ? c.printColour : c.printPlates;
    why.push(`print ${PRINTS[prev.print].label.toLowerCase()} to ${PRINTS[next.print].label.toLowerCase()}`);
  }
  const a = blankSize(prev);
  const b = blankSize(next);
  if (Math.abs(a.widthMm - b.widthMm) > PLANNER.sizeToleranceMm || Math.abs(a.lengthMm - b.lengthMm) > PLANNER.sizeToleranceMm) {
    minutes += c.size;
    why.push("blank size");
  }
  return { minutes, why };
}

/** Paper an order needs, tonnes by grade. Single wall has 2 liners and 1 medium, double wall 3 and 2. */
export function materialNeed(o: PlannerOrder): Partial<Record<GradeId, number>> {
  const blank = blankSize(o);
  const m2 = ((o.qty * blank.widthMm * blank.lengthMm) / 1e6) * PLANNER.paperAllowance;
  const need: Partial<Record<GradeId, number>> = {};
  const add = (grade: GradeId, layers: number, takeUp = 1) => {
    need[grade] = (need[grade] ?? 0) + (m2 * (GRADES[grade].gsm / 1000) * layers * takeUp) / 1000;
  };
  const double = o.flute === "BC" || o.flute === "EB";
  const outer = o.grade;
  const inner: GradeId = outer === "D230" ? "L150" : outer;
  add(outer, 1);
  add(inner, double ? 2 : 1);
  if (o.flute === "B") add("M120", 1, OPS.takeUp.B);
  else if (o.flute === "C") add("M140", 1, OPS.takeUp.C);
  else if (o.flute === "E") add("M120", 1, OPS.takeUp.E);
  else if (o.flute === "BC") {
    add("M120", 1, OPS.takeUp.B);
    add("M140", 1, OPS.takeUp.C);
  } else {
    add("M120", 1, OPS.takeUp.E);
    add("M120", 1, OPS.takeUp.B);
  }
  return need;
}
