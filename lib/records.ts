/**
 * Sample plant records for the operations views: stock, vendors, quality tests, dispatch and
 * quotes. Illustrative data for a mid-size Indian corrugated plant; vendor names, vehicle numbers
 * and quotes are made up. Replace with ERP / MES exports when they exist. Figures are "as of
 * this morning" (06:00 Friday, the model's today).
 */

export type GradeId = "L150" | "L180" | "M120" | "M140" | "D230";

/** Paper grades on the reel stand. BF = bursting factor. */
export const GRADES: Record<GradeId, { name: string; gsm: number; rate: number }> = {
  L150: { name: "Kraft liner 150 GSM, BF 20", gsm: 150, rate: 31.5 },
  L180: { name: "Kraft liner 180 GSM, BF 22", gsm: 180, rate: 33 },
  M120: { name: "Fluting 120 GSM, BF 16", gsm: 120, rate: 27.5 },
  M140: { name: "Fluting 140 GSM, BF 18", gsm: 140, rate: 28.5 },
  D230: { name: "Duplex white top 230 GSM", gsm: 230, rate: 46 },
};

/** Reels in the store: tonnes and reel count by grade, and the widths on hand (mm). */
export const REEL_STOCK: { grade: GradeId; tonnes: number; reels: number; widths: number[] }[] = [
  { grade: "L150", tonnes: 112, reels: 94, widths: [1300, 1500, 1600, 1700] },
  { grade: "L180", tonnes: 172, reels: 134, widths: [1500, 1600, 1700, 1800] },
  { grade: "M120", tonnes: 46, reels: 41, widths: [1300, 1500, 1600] },
  { grade: "M140", tonnes: 128, reels: 104, widths: [1500, 1700, 1800] },
  { grade: "D230", tonnes: 26, reels: 22, widths: [1400, 1600] },
];

/** Paper mills and other suppliers. Open PO tonnes arrive on `nextIn` days from today. */
export const VENDORS: {
  name: string;
  city: string;
  supplies: string;
  grade?: GradeId;
  leadDays: number;
  onTimePct: number;
  rejectPct: number;
  openPoTonnes: number;
  nextIn: number;
}[] = [
  { name: "Sahyadri Kraft Mills", city: "Kolhapur", supplies: "Kraft liner 150 GSM", grade: "L150", leadDays: 4, onTimePct: 94, rejectPct: 0.8, openPoTonnes: 60, nextIn: 1 },
  { name: "Narmada Paper and Board", city: "Vapi", supplies: "Kraft liner 180 GSM", grade: "L180", leadDays: 5, onTimePct: 88, rejectPct: 1.2, openPoTonnes: 80, nextIn: 2 },
  { name: "Shivganga Fluting", city: "Morbi", supplies: "Fluting 120 GSM", grade: "M120", leadDays: 6, onTimePct: 71, rejectPct: 2.9, openPoTonnes: 40, nextIn: 5 },
  { name: "Godavari Mills", city: "Nashik", supplies: "Fluting 140 GSM", grade: "M140", leadDays: 3, onTimePct: 96, rejectPct: 0.6, openPoTonnes: 50, nextIn: 1 },
  { name: "Coastal Duplex", city: "Vapi", supplies: "Duplex white top", grade: "D230", leadDays: 7, onTimePct: 90, rejectPct: 1.5, openPoTonnes: 20, nextIn: 3 },
  { name: "Annapurna Starch", city: "Ahmednagar", supplies: "Maize starch", leadDays: 2, onTimePct: 98, rejectPct: 0.2, openPoTonnes: 10, nextIn: 2 },
];

/** Finished boxes waiting in the warehouse, by customer. */
export const FINISHED_GOODS: { customer: string; pallets: number; boxes: number; value: number }[] = [
  { customer: "Kaveri Foods", pallets: 22, boxes: 13_200, value: 3_48_000 },
  { customer: "Tara Footwear", pallets: 31, boxes: 46_500, value: 4_18_500 },
  { customer: "Nirmal Dairy", pallets: 14, boxes: 11_900, value: 1_90_400 },
  { customer: "Indus Tiles", pallets: 9, boxes: 4_050, value: 1_74_150 },
  { customer: "Mira Snacks", pallets: 12, boxes: 15_600, value: 1_63_800 },
];

/** Consumables: on hand, daily use and unit. */
export const CONSUMABLES: { name: string; onHand: number; perDay: number; unit: string }[] = [
  { name: "Maize starch", onHand: 14_200, perDay: 2_300, unit: "kg" },
  { name: "Caustic soda", onHand: 640, perDay: 95, unit: "kg" },
  { name: "Flexo ink", onHand: 410, perDay: 120, unit: "litres" },
  { name: "Stitching wire", onHand: 380, perDay: 45, unit: "kg" },
  { name: "Strapping roll", onHand: 26, perDay: 9, unit: "rolls" },
];

export type QualityAlert = {
  time: string;
  where: string;
  test: string;
  measured: string;
  spec: string;
  level: "fail" | "watch";
  action: string;
};

/** Today's lab results that missed or nearly missed spec. */
export const QUALITY_ALERTS: QualityAlert[] = [
  { time: "05:40", where: "Run R7 · Ganga Agro", test: "Board moisture", measured: "10.4%", spec: "7 to 9%", level: "fail", action: "Raise pre-heater wrap; hold the last 2 pallets for retest." },
  { time: "04:15", where: "Run R5 · Vega Fans", test: "Pin adhesion (bonding)", measured: "62 N/m", spec: "80 N/m min", level: "fail", action: "Check glue gap and starch gel point on the double backer." },
  { time: "02:50", where: "Run R2 · Sona Pharma", test: "Edge crush (ECT)", measured: "5.7 kN/m", spec: "5.5 kN/m min", level: "watch", action: "Within spec but falling three tests running; review fluting reel batch." },
  { time: "01:30", where: "Run R3 · Indus Tiles", test: "Warp", measured: "6 mm/m", spec: "5 mm/m max", level: "fail", action: "Balance steam on top and bottom liner; recheck after 500 m." },
  { time: "23:10", where: "Reel 4471 · Shivganga Fluting", test: "Incoming reel moisture", measured: "9.8%", spec: "8% max", level: "watch", action: "Use after the drier reels; flag to vendor." },
  { time: "22:20", where: "Run R1 · Kaveri Foods", test: "Bursting strength", measured: "12.6 kg/cm²", spec: "12 kg/cm² min", level: "watch", action: "Close to minimum; switch to BF 22 liner for the next run." },
];

/** Quality checks done since 06:00 yesterday, and how many passed first time. */
export const QUALITY_TESTS = { done: 64, passedFirstTime: 58 };

export type Stage = "produced" | "qc" | "packed" | "loaded";
export const STAGES: { id: Stage; label: string }[] = [
  { id: "produced", label: "Produced" },
  { id: "qc", label: "QC passed" },
  { id: "packed", label: "Packed" },
  { id: "loaded", label: "Loaded" },
];

/** Orders due to leave today and how far each has got. `null` stage = still on the line. */
export const DISPATCH_TODAY: { order: string; customer: string; pallets: number; stage: Stage | null }[] = [
  { order: "SO-4790", customer: "Sona Pharma", pallets: 12, stage: "loaded" },
  { order: "SO-4794", customer: "Kaveri Foods", pallets: 18, stage: "packed" },
  { order: "SO-4797", customer: "Tara Footwear", pallets: 24, stage: "packed" },
  { order: "SO-4801", customer: "Nirmal Dairy", pallets: 10, stage: "qc" },
  { order: "SO-4803", customer: "Indus Tiles", pallets: 8, stage: "produced" },
  { order: "SO-4806", customer: "Ganga Agro", pallets: 9, stage: null },
  { order: "SO-4808", customer: "Mira Snacks", pallets: 11, stage: "loaded" },
];

/** Produced and invoiced but not yet shipped. */
export const PENDING_DISPATCH: { order: string; customer: string; days: number; value: number; reason: string }[] = [
  { order: "SO-4762", customer: "Delta Pumps", days: 11, value: 92_000, reason: "Customer asked to hold" },
  { order: "SO-4771", customer: "Swastik Glass", days: 8, value: 74_500, reason: "Awaiting payment" },
  { order: "SO-4779", customer: "Vega Fans", days: 6, value: 1_12_000, reason: "No truck allotted" },
  { order: "SO-4783", customer: "Indus Tiles", days: 4, value: 66_800, reason: "Part order, rest on line" },
  { order: "SO-4784", customer: "Ganga Agro", days: 3, value: 58_200, reason: "Retest after moisture alert" },
  { order: "SO-4786", customer: "Kaveri Foods", days: 2, value: 1_46_000, reason: "Ships with SO-4794" },
  { order: "SO-4788", customer: "Tara Footwear", days: 1, value: 2_02_000, reason: "Scheduled tomorrow" },
  { order: "SO-4789", customer: "Mira Snacks", days: 1, value: 84_400, reason: "Scheduled tomorrow" },
];

/** Trucks on the road. Times are today unless marked. */
export const SHIPMENTS: { vehicle: string; customer: string; to: string; left: string; eta: string; status: "on-time" | "delayed" | "delivered" }[] = [
  { vehicle: "MH 12 KT 4821", customer: "Sona Pharma", to: "Pune", left: "07:10", eta: "10:30", status: "delivered" },
  { vehicle: "MH 15 GV 1907", customer: "Mira Snacks", to: "Nashik", left: "08:05", eta: "13:15", status: "on-time" },
  { vehicle: "MH 14 HB 6630", customer: "Kaveri Foods", to: "Satara", left: "09:40", eta: "14:00", status: "on-time" },
  { vehicle: "GJ 15 AT 2284", customer: "Swastik Glass", to: "Vapi", left: "Yesterday 21:30", eta: "11:00", status: "delayed" },
  { vehicle: "MH 09 CU 5512", customer: "Nirmal Dairy", to: "Kolhapur", left: "11:20", eta: "17:45", status: "on-time" },
];

/** Quoted price per box for today's orders, ₹. Cost is worked out from the board in lib/ops.ts. */
export const QUOTES: Record<string, { price: number; note?: string }> = {
  "SO-4812": { price: 27.4 },
  "SO-4815": { price: 8.9, note: "Quoted before the July paper price rise" },
  "SO-4817": { price: 41.5 },
  "SO-4820": { price: 11.6 },
  "SO-4821": { price: 22.9 },
  "SO-4824": { price: 5.2, note: "Volume discount on an 80,000 box order" },
  "SO-4826": { price: 16.8 },
  "SO-4829": { price: 46.2 },
  "SO-4830": { price: 10.1, note: "White-top liner priced as plain kraft" },
  "SO-4833": { price: 31.9 },
};
