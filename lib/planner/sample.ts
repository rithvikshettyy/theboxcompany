import { REEL_STOCK, VENDORS, type GradeId } from "../records";
import { GRADES } from "../records";
import { HOUR_MS } from "./calendar";
import type { Downtime, Inputs, Machine, PlannerOrder } from "./types";

/**
 * DEMO DATA. The machines, maintenance windows and orders below are made up for a mid-size plant.
 * They are not live factory orders and do not come from an ERP. The planner labels them as sample
 * data until the user replaces them.
 */

export const MACHINES: readonly Machine[] = [
  {
    id: "ps1",
    name: "PS-1",
    kind: "Printer-slotter, 4 colour",
    ratePerHour: 5200,
    efficiency: 0.85,
    flutes: ["B", "C", "E", "BC"],
    styles: ["RSC", "HSC", "FOL"],
    maxColours: 4,
    maxGsm: 230,
    maxBlankWidthMm: 1000,
    maxBlankLengthMm: 2400,
    shifts: ["A", "B", "C"],
  },
  {
    id: "ps2",
    name: "PS-2",
    kind: "Printer-slotter, 2 colour",
    ratePerHour: 3800,
    efficiency: 0.85,
    flutes: ["B", "C", "E", "EB"],
    styles: ["RSC", "HSC"],
    maxColours: 2,
    maxGsm: 200,
    maxBlankWidthMm: 900,
    maxBlankLengthMm: 2200,
    shifts: ["A", "B"],
  },
  {
    id: "fg1",
    name: "FG-1",
    kind: "Folder-gluer, plain or 1 colour",
    ratePerHour: 6400,
    efficiency: 0.8,
    flutes: ["B", "C", "BC"],
    styles: ["RSC", "FOL"],
    maxColours: 1,
    maxGsm: 230,
    maxBlankWidthMm: 1100,
    maxBlankLengthMm: 2600,
    shifts: ["A", "B", "C"],
  },
  {
    id: "dc1",
    name: "DC-1",
    kind: "Rotary die-cutter",
    ratePerHour: 1800,
    efficiency: 0.8,
    flutes: ["B", "C", "E", "BC", "EB"],
    styles: ["DIE"],
    maxColours: 2,
    maxGsm: 230,
    maxBlankWidthMm: 1000,
    maxBlankLengthMm: 1500,
    shifts: ["A", "B"],
  },
];

/** Planned maintenance, hours from plan start. */
export const MAINTENANCE: readonly Downtime[] = [
  { machineId: "ps2", fromH: 28, toH: 34, reason: "maintenance", note: "Knife grinding" },
  { machineId: "ps1", fromH: 50, toH: 54, reason: "maintenance", note: "Ink train service" },
  { machineId: "dc1", fromH: 20, toH: 24, reason: "maintenance", note: "Die change and lubrication" },
];

type Row = Omit<PlannerOrder, "due" | "gsm"> & { dueH: number };

const SAMPLE_ROWS: readonly Row[] = [
  { id: "PL-101", customer: "Kaveri Foods", style: "RSC", lengthMm: 400, widthMm: 300, heightMm: 250, qty: 50_000, grade: "L150", flute: "B", print: "2c", priority: "normal", dueH: 46 },
  { id: "PL-102", customer: "Sona Pharma", style: "RSC", lengthMm: 300, widthMm: 200, heightMm: 150, qty: 85_000, grade: "L150", flute: "B", print: "1c", priority: "high", dueH: 32 },
  { id: "PL-103", customer: "Indus Tiles", style: "HSC", lengthMm: 600, widthMm: 400, heightMm: 300, qty: 12_000, grade: "L180", flute: "BC", print: "4c", priority: "normal", dueH: 70 },
  { id: "PL-104", customer: "Nirmal Dairy", style: "RSC", lengthMm: 350, widthMm: 250, heightMm: 200, qty: 96_000, grade: "L150", flute: "C", print: "2c", priority: "urgent", dueH: 30 },
  { id: "PL-105", customer: "Vega Fans", style: "FOL", lengthMm: 450, widthMm: 300, heightMm: 350, qty: 30_000, grade: "L180", flute: "BC", print: "none", priority: "normal", dueH: 64 },
  { id: "PL-106", customer: "Tara Footwear", style: "RSC", lengthMm: 320, widthMm: 200, heightMm: 120, qty: 90_000, grade: "L150", flute: "B", print: "none", priority: "normal", dueH: 62 },
  { id: "PL-107", customer: "Ganga Agro", style: "HSC", lengthMm: 500, widthMm: 350, heightMm: 300, qty: 50_000, grade: "L150", flute: "C", print: "1c", priority: "low", dueH: 66 },
  { id: "PL-108", customer: "Swastik Glass", style: "DIE", lengthMm: 500, widthMm: 400, heightMm: 150, qty: 8_000, grade: "L180", flute: "EB", print: "2c", priority: "normal", dueH: 72 },
  { id: "PL-109", customer: "Mira Snacks", style: "RSC", lengthMm: 280, widthMm: 180, heightMm: 200, qty: 60_000, grade: "D230", flute: "E", print: "4c", priority: "high", dueH: 50 },
  { id: "PL-110", customer: "Delta Pumps", style: "FOL", lengthMm: 550, widthMm: 400, heightMm: 350, qty: 20_000, grade: "L180", flute: "BC", print: "1c", priority: "normal", dueH: 66 },
  { id: "PL-111", customer: "Coastal Tiles", style: "DIE", lengthMm: 400, widthMm: 300, heightMm: 80, qty: 15_000, grade: "L150", flute: "B", print: "1c", priority: "normal", dueH: 62 },
  { id: "PL-112", customer: "Green Agro", style: "RSC", lengthMm: 380, widthMm: 260, heightMm: 220, qty: 50_000, grade: "L150", flute: "B", print: "2c", priority: "normal", dueH: 50 },
];

/** Ids of the demo orders, so the page can say when demo data is on screen. */
export const SAMPLE_IDS: ReadonlySet<string> = new Set(SAMPLE_ROWS.map((r) => r.id));

/** The demo orders, with deadlines counted from `planStart`. */
export function sampleOrders(planStart: number): PlannerOrder[] {
  return SAMPLE_ROWS.map(({ dueH, ...row }) => ({ ...row, gsm: GRADES[row.grade].gsm, due: planStart + dueH * HOUR_MS }));
}

/** Reel stock and open purchase orders from the plant's materials records, counted from plan start. */
export function paperSupply(): Pick<Inputs, "stockT" | "incoming"> {
  const stockT: Partial<Record<GradeId, number>> = {};
  for (const r of REEL_STOCK) stockT[r.grade] = r.tonnes;
  const incoming = VENDORS.flatMap((v) => (v.grade ? [{ grade: v.grade, tonnes: v.openPoTonnes, atH: v.nextIn * 24 }] : []));
  return { stockT, incoming };
}

/** Everything the scheduler needs for a set of orders. */
export function buildInputs(planStart: number, orders: readonly PlannerOrder[]): Inputs {
  return { planStart, orders, machines: MACHINES, downtime: MAINTENANCE, ...paperSupply(), speed: {} };
}
