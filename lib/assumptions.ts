import type {
  KpiId,
  NodeId,
  Order,
  ReasonId,
  Scope,
  Section,
  ShiftId,
  ShiftParams,
} from "./types";

/**
 * Every business constant in The Box Company app (CLAUDE.md §9). The model and the UI read from here only.
 *
 * reference/v1.html was not available when the model was written, so these are the app's own
 * assumptions for a mid-size Indian corrugated box plant. Swap in v1's values when the file lands;
 * tests/model.test.ts recomputes every ₹ figure from this file.
 */

/** Product name, shown in the logo, page titles and on the box. */
export const BRAND = { name: "The Box Company" } as const;

/** Plant identity shown in the header. `name` is a placeholder until the real one is known. */
export const PLANT = {
  name: "Plant 1",
  line: "Corrugator + converting",
  /** Clock and shift boundaries run on plant time. */
  timeZone: "Asia/Kolkata",
  timeZoneLabel: "IST",
} as const;

/** Plant physics and money. */
export const P = {
  /** Corrugator working width, mm. Order widths plus trim must fit inside it. */
  deckleMm: 1800,
  /** Speed the corrugator is rated for on this board mix, m/min. The waterfall starts here. */
  ratedSpeed: 150,
  /** One shift, minutes (8 h). */
  shiftMin: 480,
  shiftsPerDay: 3,
  /** Working days a month. Sunday is the weekly off. */
  workingDaysPerMonth: 26,
  /**
   * ₹ contribution per m² of good board: price minus paper, starch and power. The plant is
   * assumed sold out (board the box line cannot take is sold as sheets), so every m² not made
   * loses this margin.
   */
  marginPerM2: 3.2,
  /** ₹ paper cost per m² of board. Trim and rejects throw it away. */
  paperPerM2: 16,
  /** Share of that paper cost won back by selling trim and rejects as waste paper. */
  scrapRecovery: 0.35,
  /** Printer-Slotter rated output, boxes an hour. */
  psBoxesPerHour: 5200,
  /**
   * ₹ contribution per box through the Printer-Slotter. It is the constraint, so a minute lost
   * there is a minute of box output lost for the whole plant.
   */
  boxMargin: 1.6,
  /** One truckload of board, m² (about 9 t at 0.5 kg/m²). Makes m² tangible. */
  truckM2: 18_000,
} as const;

export const SHIFTS_PER_MONTH = P.shiftsPerDay * P.workingDaysPerMonth;
export const MONTHS_PER_YEAR = 12;
/** ₹ lost per m² of trim or reject: the margin never earned plus paper not won back as scrap. */
export const WASTE_PER_M2 = P.marginPerM2 + P.paperPerM2 * (1 - P.scrapRecovery);

/** What good looks like. KPI status and recommendation presets use these. */
export const TARGET = {
  oee: 70,
  availability: 85,
  speed: 135,
  trimPct: 3,
  rejectPct: 1.5,
  /** Four changeovers a shift at 10.5 min each, with plates and ink set up off-line. */
  psChangeoverMin: 42,
  /** Reel-wait minutes a shift that staging cannot remove (splice prep, roll handling). */
  reelWaitMin: 8,
} as const;

/** Production and materials targets for the operations views. */
export const OPS = {
  /** Good board the plant plans to make a day, m². */
  dailyTargetM2: 250_000,
  /** Average board weight across the 3-ply and 5-ply mix, kg per m². Converts m² to tonnes. */
  boardKgPerM2: 0.56,
  /** Total waste target: side trim plus dry-end rejects, % of gross board. */
  wastageTargetPct: 4.5,
  /** Share of the deckle the plan should fill, %. */
  deckleTargetPct: 90,
  /** Corrugator order changes and Printer-Slotter changeovers in a typical shift. */
  orderChangesPerShift: 8,
  psChangeoversPerShift: 4,
  /** Target minutes per change: corrugator order change, Printer-Slotter changeover. */
  orderChangeTargetMin: 2,
  psChangeTargetMin: TARGET.psChangeoverMin / 4,
  /** Days of booked orders ahead of the corrugator (the pending load). */
  bookedDays: 4,
  /** Margin floor below which an order is flagged, %. */
  marginFloorPct: 8,
  /** Conversion cost per m² of board (starch, power, labour, ink), ₹. */
  conversionPerM2: 4.2,
  /** Medium take-up: metres of fluting paper per metre of board, by flute. */
  takeUp: { B: 1.32, C: 1.45, E: 1.25 },
} as const;

/** KPI shows amber (watch) instead of red while it is within this distance of target. */
export const WATCH_BAND: Record<KpiId, number> = {
  oee: 5,
  availability: 4,
  speed: 10,
  trimPct: 0.8,
  rejectPct: 0.4,
  psChangeoverMin: 20,
};

export const SHIFT_IDS: readonly ShiftId[] = ["A", "B", "C"];
/** Shift start on the plant clock, 24 h. Shift C runs past midnight and belongs to its start day. */
export const SHIFT_START_HOUR: Record<ShiftId, number> = { A: 6, B: 14, C: 22 };

/** Working days each rolling scope covers. 7 calendar days hold 6 working days, 30 hold 26. */
export const SCOPE_WORKING_DAYS: Record<Exclude<Scope, ShiftId>, number> = {
  today: 1,
  "7d": 6,
  "30d": 26,
};

/**
 * Average running conditions per shift before day-to-day noise. Shift C (night) runs slowest
 * and rejects most; trim follows the order mix each shift gets.
 */
export const SH: Record<ShiftId, Omit<ShiftParams, "downtimeMin" | "psChangeoverMin">> = {
  A: { speed: 124, trimPct: 4.2, rejectPct: 1.6 },
  B: { speed: 118, trimPct: 4.6, rejectPct: 2.1 },
  C: { speed: 110, trimPct: 4.9, rejectPct: 2.6 },
};

/** How a cause spreads over the 8 hours of a shift: front-loaded, flat or back-loaded. */
export const PROFILE = {
  start: [5, 3, 1.5, 1, 1, 1, 1, 1],
  even: [1, 1, 1, 1, 1, 1, 1, 1],
  end: [1, 1, 1, 1, 1, 1.5, 2, 2.5],
} as const;

type Reason = {
  id: ReasonId;
  label: string;
  section: Section;
  node: NodeId;
  profile: keyof typeof PROFILE;
  /** Average minutes lost per shift. */
  min: Record<ShiftId, number>;
};

/**
 * Downtime causes with average minutes per shift. Corrugator causes add up to the corrugator's
 * downtime. "psChange" is the Printer-Slotter changeover lever.
 */
export const REASONS: readonly Reason[] = [
  { id: "reels", label: "Reels not staged", section: "corrugator", node: "reel", profile: "start", min: { A: 8, B: 10, C: 36 } },
  { id: "splice", label: "Splice failure", section: "corrugator", node: "reel", profile: "even", min: { A: 9, B: 11, C: 14 } },
  { id: "steam", label: "Low steam pressure", section: "corrugator", node: "sf", profile: "start", min: { A: 12, B: 10, C: 18 } },
  { id: "glue", label: "Glue viscosity off", section: "corrugator", node: "sf", profile: "start", min: { A: 6, B: 12, C: 10 } },
  { id: "orderChange", label: "Order change at cut-off", section: "corrugator", node: "co", profile: "even", min: { A: 20, B: 22, C: 18 } },
  { id: "warp", label: "Warp correction", section: "corrugator", node: "db", profile: "end", min: { A: 9, B: 11, C: 9 } },
  { id: "stacker", label: "Stacker jam", section: "corrugator", node: "co", profile: "even", min: { A: 4, B: 4, C: 5 } },
  { id: "psChange", label: "Printer-Slotter changeover", section: "converting", node: "ps", profile: "even", min: { A: 88, B: 96, C: 104 } },
  { id: "plates", label: "Plate and ink wash", section: "converting", node: "ps", profile: "even", min: { A: 18, B: 20, C: 22 } },
  { id: "feeder", label: "Feeder misfeed", section: "converting", node: "ps", profile: "even", min: { A: 10, B: 12, C: 16 } },
  { id: "fgJam", label: "Folder-gluer jam", section: "converting", node: "fg", profile: "end", min: { A: 14, B: 15, C: 19 } },
  { id: "strap", label: "Strapping wire break", section: "converting", node: "bd", profile: "even", min: { A: 6, B: 7, C: 8 } },
];

/** Day-to-day noise: ± fraction for cause minutes, ± absolute for the rest. */
export const NOISE = { reasonFrac: 0.3, speed: 5, trimPct: 0.5, rejectPct: 0.4 } as const;
/** Shift C reel waits have crept up over the history: minutes added on the latest day. */
export const REEL_DRIFT_C = 12;
/** Two 26-day windows, so "Last 30 days" can compare with the 30 days before. */
export const HISTORY_DAYS = 52;
/** Seed for the deterministic RNG. Same seed, same plant, every build. */
export const SEED = 1729;
/** The synthetic history ends on a Friday (0 = Sunday). Only used for day labels. */
export const TODAY_WEEKDAY = 5;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Working days in a KPI sparkline. */
export const SPARK_DAYS = 14;

/** Heatmap shape: the last 7 working days by 24 hours. */
export const HEATMAP_DAYS = 7;
export const HEATMAP_HOURS = 24;

type MachineNode = { id: NodeId; label: string; short: string; section: Section; ratedPerHour: number };

/**
 * The line, in flow order. Rates are box equivalents an hour this machine can feed to the box
 * line. Corrugator machines share one web, so they stop and slow together.
 */
export const NODES: readonly MachineNode[] = [
  { id: "reel", label: "Reel stand", short: "Reels", section: "corrugator", ratedPerHour: 9000 },
  { id: "sf", label: "Single facer", short: "SF", section: "corrugator", ratedPerHour: 8400 },
  { id: "db", label: "Double backer", short: "DB", section: "corrugator", ratedPerHour: 8000 },
  { id: "ss", label: "Slitter-scorer", short: "SS", section: "corrugator", ratedPerHour: 8800 },
  { id: "co", label: "Cut-off and stacker", short: "Cut-off", section: "corrugator", ratedPerHour: 8200 },
  { id: "ps", label: "Printer-slotter", short: "P-S", section: "converting", ratedPerHour: P.psBoxesPerHour },
  { id: "fg", label: "Folder-gluer", short: "FG", section: "converting", ratedPerHour: 6400 },
  { id: "bd", label: "Bundler", short: "Bundler", section: "converting", ratedPerHour: 9500 },
];

/** Utilities that feed the single facer. Their stops show up as steam and glue causes. */
export const FEEDERS = [
  { id: "boiler", label: "Boiler", node: "sf", reason: "steam" },
  { id: "glue", label: "Glue kitchen", node: "sf", reason: "glue" },
] as const;

export const BOXES_PER_PALLET = 1000;

/** Minimum total edge trim, mm (20 mm a side), so the slitter cuts clean board. */
export const EDGE = 40;
/** Paper reel widths in stock, mm. */
export const REELS: readonly number[] = [1200, 1300, 1400, 1500, 1600, 1700, 1800];
/** Most outs (blanks across the web) the slitter-scorer can set. */
export const MAX_OUTS = 6;

/** Today's order book. Customers are illustrative. */
export const ORDERS: readonly Order[] = [
  { id: "SO-4812", customer: "Kaveri Foods", flute: "BC", widthMm: 612, lengthMm: 1150, qty: 36_000, dueH: 6 },
  { id: "SO-4815", customer: "Sona Pharma", flute: "B", widthMm: 405, lengthMm: 820, qty: 60_000, dueH: 3 },
  { id: "SO-4817", customer: "Indus Tiles", flute: "BC", widthMm: 780, lengthMm: 1320, qty: 22_000, dueH: 12.5 },
  { id: "SO-4820", customer: "Nirmal Dairy", flute: "C", widthMm: 540, lengthMm: 960, qty: 48_000, dueH: 8 },
  { id: "SO-4821", customer: "Vega Fans", flute: "BC", widthMm: 455, lengthMm: 1240, qty: 30_000, dueH: 17 },
  { id: "SO-4824", customer: "Tara Footwear", flute: "B", widthMm: 365, lengthMm: 700, qty: 80_000, dueH: 10 },
  { id: "SO-4826", customer: "Ganga Agro", flute: "C", widthMm: 690, lengthMm: 1080, qty: 30_000, dueH: 15 },
  { id: "SO-4829", customer: "Swastik Glass", flute: "BC", widthMm: 830, lengthMm: 1420, qty: 16_000, dueH: 21 },
  { id: "SO-4830", customer: "Mira Snacks", flute: "C", widthMm: 425, lengthMm: 880, qty: 56_000, dueH: 19 },
  { id: "SO-4833", customer: "Delta Pumps", flute: "BC", widthMm: 560, lengthMm: 1460, qty: 20_000, dueH: 23 },
];

/** The planner's sequence: grouped by flute to save changeovers, ignoring due dates. */
export const PLANNED_SEQUENCE: readonly string[] = [
  "SO-4815", "SO-4824", "SO-4820", "SO-4826", "SO-4830",
  "SO-4812", "SO-4817", "SO-4821", "SO-4829", "SO-4833",
];
/** Today's order plan starts with Shift A. */
export const PLAN_START_HOUR = 6;
/** Minutes to change flute on the corrugator. */
export const FLUTE_CHANGE_MIN = 20;
/** Finishing inside this many minutes of due counts as tight. */
export const TIGHT_MIN = 60;

/** The planner's corrugator runs for today: which orders share the web, and on what reel. */
export const PLAN_RUNS: readonly { id: string; reelMm: number; meters: number; orders: { id: string; outs: number }[] }[] = [
  { id: "R1", reelMm: 1300, meters: 6_900, orders: [{ id: "SO-4812", outs: 2 }] },
  { id: "R2", reelMm: 1700, meters: 8_200, orders: [{ id: "SO-4815", outs: 4 }] },
  { id: "R3", reelMm: 1600, meters: 9_700, orders: [{ id: "SO-4817", outs: 2 }] },
  { id: "R4", reelMm: 1700, meters: 8_600, orders: [{ id: "SO-4820", outs: 3 }] },
  { id: "R5", reelMm: 1500, meters: 12_400, orders: [{ id: "SO-4821", outs: 3 }] },
  { id: "R6", reelMm: 1500, meters: 14_000, orders: [{ id: "SO-4824", outs: 4 }] },
  { id: "R7", reelMm: 1500, meters: 16_200, orders: [{ id: "SO-4826", outs: 2 }] },
  { id: "R8", reelMm: 1700, meters: 11_400, orders: [{ id: "SO-4829", outs: 2 }] },
];

/** UI timing. The header clock only shows minutes, so a 15 s tick is plenty. */
export const CLOCK_TICK_MS = 15_000;
