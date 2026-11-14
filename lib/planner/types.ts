import type { GradeId } from "../records";
import type { ShiftId } from "../types";

export type StyleId = "RSC" | "HSC" | "FOL" | "DIE";
export type PlannerFlute = "B" | "C" | "E" | "BC" | "EB";
export type PrintSpec = "none" | "1c" | "2c" | "4c";
export type Priority = "urgent" | "high" | "normal" | "low";

export const STYLES: Record<StyleId, string> = {
  RSC: "Regular slotted (RSC)",
  HSC: "Half slotted (HSC)",
  FOL: "Full overlap (FOL)",
  DIE: "Die-cut",
};
export const FLUTES: readonly PlannerFlute[] = ["B", "C", "E", "BC", "EB"];
export const PRINTS: Record<PrintSpec, { label: string; colours: number }> = {
  none: { label: "Plain", colours: 0 },
  "1c": { label: "1 colour", colours: 1 },
  "2c": { label: "2 colours", colours: 2 },
  "4c": { label: "4 colours", colours: 4 },
};
export const PRIORITIES: readonly Priority[] = ["urgent", "high", "normal", "low"];

/** One customer order, as typed in. Dimensions are the finished box, mm. */
export type PlannerOrder = {
  id: string;
  customer: string;
  style: StyleId;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  qty: number;
  /** Liner reel grade the order runs on. */
  grade: GradeId;
  /** Liner GSM. Follows the grade. */
  gsm: number;
  flute: PlannerFlute;
  print: PrintSpec;
  /** Delivery deadline, ms since epoch. */
  due: number;
  priority: Priority;
};

export type Machine = {
  id: string;
  name: string;
  /** What the machine is, for people. */
  kind: string;
  /** Rated boxes an hour. */
  ratePerHour: number;
  /** Share of rated speed the machine really holds across a job (set-up creep, stops). */
  efficiency: number;
  flutes: readonly PlannerFlute[];
  styles: readonly StyleId[];
  maxColours: number;
  maxGsm: number;
  maxBlankWidthMm: number;
  maxBlankLengthMm: number;
  /** Shifts the machine runs, Monday to Saturday. */
  shifts: readonly ShiftId[];
  /** Also runs Sundays. */
  sundayWork?: boolean;
};

/** A window a machine cannot run, in hours from plan start. */
export type Downtime = { machineId: string; fromH: number; toH: number; reason: "maintenance" | "breakdown"; note: string };

export type Segment = { from: number; to: number };

export type PlacementStatus = "on-time" | "at-risk" | "late";

/** An order placed on a machine. Times are hours from plan start. */
export type Placement = {
  orderId: string;
  machineId: string;
  /** Run time, split where the machine is closed. */
  run: Segment[];
  /** Changeover before the run, split the same way. */
  changeover: Segment[];
  changeoverMin: number;
  changeoverWhy: string[];
  runH: number;
  startH: number;
  endH: number;
  dueH: number;
  /** Positive when it finishes after its deadline, hours. */
  lateH: number;
  /** Hours to spare before the deadline (negative when late). */
  slackH: number;
  status: PlacementStatus;
  materialReadyH: number;
  /** Waiting for paper: hours the run started later than the machine could. */
  materialWaitH: number;
};

export type Unscheduled = { orderId: string; reason: string };

export type Inputs = {
  /** Plan start, ms since epoch. */
  planStart: number;
  orders: readonly PlannerOrder[];
  machines: readonly Machine[];
  downtime: readonly Downtime[];
  /** Reel stock by grade, tonnes, and when more arrives. */
  stockT: Partial<Record<GradeId, number>>;
  incoming: { grade: GradeId; tonnes: number; atH: number }[];
  /** Speed multiplier per machine (1 = normal). */
  speed: Record<string, number>;
};

export type Schedule = {
  placements: Placement[];
  unscheduled: Unscheduled[];
  /** Machine open time, hours from plan start. */
  availability: Record<string, Segment[]>;
  /** Machine downtime that was applied. */
  downtime: Downtime[];
  /** The order each machine runs, in sequence. */
  sequences: Record<string, string[]>;
  /** Hours the planning window runs to: the latest deadline of any order. */
  windowH: number;
};

export type MachineLoad = {
  machineId: string;
  /** Open hours inside the window. */
  availH: number;
  runH: number;
  changeoverH: number;
  /** Open hours not used inside the window. */
  idleH: number;
  /** Used share of open hours inside the window, 0 to 1. */
  utilization: number;
  /** All assigned work (run + changeover) over open hours in the window. Above 1 means it cannot finish by the last deadline. */
  load: number;
};

export type Metrics = {
  orders: number;
  scheduled: number;
  unscheduled: number;
  plannedBoxes: number;
  utilization: number;
  changeoverH: number;
  atRisk: number;
  late: number;
  onTimeRate: number;
  /** When the last order finishes, hours from plan start. */
  finishH: number;
  loads: MachineLoad[];
};

export type Insight = {
  id: string;
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  orderId?: string;
  machineId?: string;
  /** One click that carries the suggestion out. */
  action?: { label: string; orderId: string; machineId: string };
};
