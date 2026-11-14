/** Every view of the plant. Shifts A/B/C or a rolling period. */
export type Scope = "A" | "B" | "C" | "today" | "7d" | "30d";
export type ShiftId = "A" | "B" | "C";
export type Section = "corrugator" | "converting";
export type Better = "higher" | "lower";
/** good = on target (green), watch = close (amber), loss = off target (red). */
export type Status = "good" | "watch" | "loss";

export type ScopeLabel = {
  /** Shown on wide screens and in the hero kicker, e.g. "Shift A". */
  long: string;
  /** Shown on phones where the tabs share one row, e.g. "A". */
  short: string;
};

/** Running conditions for one shift. These are the five levers the simulator moves. */
export type ShiftParams = {
  /** Corrugator stops, minutes a shift. */
  downtimeMin: number;
  /** Average running speed while the corrugator runs, m/min. */
  speed: number;
  /** Share of gross board width cut off as trim, %. */
  trimPct: number;
  /** Share of net board rejected, %. */
  rejectPct: number;
  /** Printer-Slotter changeover time, minutes a shift. */
  psChangeoverMin: number;
};
export type Lever = keyof ShiftParams;

export type LossKey = "downtime" | "slow" | "trim" | "rejects";

/** One shift, or a sum of shifts, turned into m² and ₹. */
export type Calc = {
  shifts: number;
  shiftMin: number;
  runMin: number;
  psChangeoverMin: number;
  ratedM2: number;
  downtimeM2: number;
  slowM2: number;
  grossM2: number;
  trimM2: number;
  rejectM2: number;
  goodM2: number;
  /** ₹ margin the line would earn at rated speed, all shift, zero waste. */
  potential: number;
  loss: Record<LossKey, number>;
  leak: number;
  /** potential − leak: margin actually earned on good board, net of paper thrown away. */
  earned: number;
};

export type WaterfallStep = {
  key: "potential" | LossKey | "earned";
  label: string;
  rupees: number;
  m2: number;
  /** Share of the rated potential, 0 to 1. */
  share: number;
};

export type KpiId = "oee" | "availability" | "speed" | "trimPct" | "rejectPct" | "psChangeoverMin";
export type Kpi = {
  id: KpiId;
  label: string;
  unit: string;
  decimals: number;
  value: number;
  previous: number;
  target: number;
  better: Better;
  status: Status;
  /** One point per working day, oldest first. */
  spark: number[];
  /** ₹ a month for one unit better (one point, one m/min or one minute). */
  rupeesPerUnit: number;
  perUnit: string;
};

export type ReasonId =
  | "reels"
  | "splice"
  | "steam"
  | "glue"
  | "orderChange"
  | "warp"
  | "stacker"
  | "psChange"
  | "plates"
  | "feeder"
  | "fgJam"
  | "strap";

export type NodeId = "reel" | "sf" | "db" | "ss" | "co" | "ps" | "fg" | "bd";

export type ParetoRow = {
  id: ReasonId;
  label: string;
  node: NodeId;
  /** Minutes lost in the whole scope. */
  minutes: number;
  /** Minutes lost per shift, averaged over the scope. */
  perShift: number;
  share: number;
  cumulative: number;
};

export type Heatmap = {
  /** Clock hours in production-day order, starting at Shift A (06:00). */
  hours: number[];
  /** Oldest day first. `cells[i]` is corrugator downtime minutes in `hours[i]`. */
  days: { label: string; cells: number[] }[];
  max: number;
  /** The shift the scope covers, or null when it covers whole days. */
  shift: ShiftId | null;
};

export type NodeStat = {
  id: NodeId;
  label: string;
  short: string;
  section: Section;
  ratedPerHour: number;
  effectivePerHour: number;
  availability: number;
  downtimeMin: number;
  /** Pallets that pile up before this machine in a shift. Null inside the corrugator (one web). */
  wipBefore: number | null;
  isConstraint: boolean;
};

export type Feeder = { id: "boiler" | "glue"; label: string; node: NodeId; lostMin: number };

export type Rec = {
  id: "trim" | "reels" | "smed" | "rejects";
  /** The operational problem in one sentence, with the numbers behind it. */
  problem: string;
  title: string;
  body: string;
  owner: string;
  effort: "Low" | "Medium" | "High";
  lever: Lever;
  /** Applied on top of the scope baseline. Simulating it reproduces `perMonth` exactly. */
  preset: Partial<ShiftParams>;
  perMonth: number;
  /** The working behind `perMonth`, for the back of the card. */
  formula: string;
};

export type Flute = "B" | "C" | "E" | "BC";
export type Order = {
  id: string;
  customer: string;
  flute: Flute;
  /** Blank width across the corrugator, mm. */
  widthMm: number;
  lengthMm: number;
  qty: number;
  /** Due, hours from the start of the plan. */
  dueH: number;
};

export type Combo = {
  orders: { id: string; outs: number; widthMm: number }[];
  reelMm: number;
  usedMm: number;
  trimMm: number;
  trimPct: number;
};
export type TrimRun = { id: string; meters: number; planned: Combo; best: Combo };
export type TrimPlan = { runs: TrimRun[]; plannedPct: number; bestPct: number };

export type OrderStatus = "late" | "tight" | "ok";
export type ScheduledOrder = {
  id: string;
  customer: string;
  flute: Flute;
  startMin: number;
  endMin: number;
  dueMin: number;
  status: OrderStatus;
  fluteChange: boolean;
};
export type Schedule = { rows: ScheduledOrder[]; late: number; fluteChanges: number };

export type SimResult = {
  perMonth: number;
  perYear: number;
  extraM2PerMonth: number;
  truckloads: number;
  byLever: { lever: Lever; perMonth: number }[];
};

/** Everything the dashboard shows for one scope. GET /api/plant?scope= returns this. */
export type PlantData = {
  scope: Scope;
  shifts: number;
  /** Scope average running conditions: the simulator baseline. */
  base: ShiftParams;
  totals: Calc;
  /** Same window one period back (yesterday, the 7 days before, …). */
  previous: Calc;
  waterfall: WaterfallStep[];
  kpis: Kpi[];
  pareto: Record<Section, ParetoRow[]>;
  heatmap: Heatmap;
  nodes: NodeStat[];
  feeders: Feeder[];
  recs: Rec[];
  trim: TrimPlan;
  orders: { planned: Schedule; due: Schedule };
};
