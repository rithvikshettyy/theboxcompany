import { OPS, P, PLANNER, SHIFT_START_HOUR, SH, TARGET } from "../assumptions";
import { rng } from "../model";
import { GRADES, VENDORS } from "../records";
import type { DocKind, Page } from "./types";

/**
 * SYNTHETIC KNOWLEDGE BASE for the demonstration plant. Every document below is made up so the
 * Copilot can be tried end to end: the procedures, limits, intervals, names and logs are invented
 * and are NOT real specifications for any machine or any real company. Numbers that exist in the
 * app (targets, grades, vendors, shifts) are imported so the documents agree with the dashboard.
 * Each page says so, and all of it can be deleted from the knowledge base.
 */
export type KbDoc = { name: string; kind?: DocKind; pages: Page[] };

const NOTE = "SYNTHETIC DEMO DOCUMENT. Invented for demonstration. Not a real specification or procedure.";
const page = (n: number, text: string): Page => ({ page: n, text });
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/* ── Breakdown log: generated once from a fixed seed, and the monthly report is computed from the same rows ── */

const MACHINES = [
  { name: "Reel stand", w: 9, causes: ["Splice failure", "Reel not staged", "Web break at unwind", "Brake fault"] },
  { name: "Single facer", w: 18, causes: ["Low steam pressure", "Glue viscosity off", "Fluting roll chip", "Pressure roll bearing noise"] },
  { name: "Double backer", w: 12, causes: ["Warp correction", "Delamination", "Hot plate temperature drift", "Belt tracking"] },
  { name: "Slitter-scorer", w: 4, causes: ["Knife wear", "Score wheel jam"] },
  { name: "Cut-off and stacker", w: 7, causes: ["Stacker jam", "Cut-off knife timing", "Order change delay"] },
  { name: "Printer-slotter", w: 22, causes: ["Changeover overrun", "Plate and ink wash", "Feeder misfeed", "Slotter knife change"] },
  { name: "Folder-gluer", w: 8, causes: ["Folder-gluer jam", "Glue gun blocked", "Belt slip"] },
  { name: "Bundler", w: 5, causes: ["Strapping wire break", "Strap head jam"] },
] as const;
const SHIFT_NAMES = ["A", "B", "C"] as const;
const MONTH = "October 2026";

type Event = { date: string; shift: string; machine: string; cause: string; minutes: number };

function events(): Event[] {
  const r = rng(20261001);
  const total = MACHINES.reduce((s, m) => s + m.w, 0);
  const out: Event[] = [];
  const days: number[] = [];
  for (let d = 1; d <= 31; d++) if (new Date(Date.UTC(2026, 9, d)).getUTCDay() !== 0) days.push(d);
  for (let i = 0; i < 85; i++) {
    let pick = r() * total;
    const m = MACHINES.find((x) => (pick -= x.w) < 0) ?? MACHINES[0];
    const day = days[Math.floor(r() * days.length)];
    out.push({
      date: `2026-10-${String(day).padStart(2, "0")}`,
      shift: SHIFT_NAMES[Math.floor(r() * 3)],
      machine: m.name,
      cause: m.causes[Math.floor(r() * m.causes.length)],
      minutes: 8 + Math.floor(r() * 70),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.shift.localeCompare(b.shift));
}

function logPages(list: Event[]): Page[] {
  const lines = list.map((e, i) => `Row ${i + 1}. Date: ${e.date}; Shift: ${e.shift}; Machine: ${e.machine}; Cause: ${e.cause}; Downtime minutes: ${e.minutes}.`);
  const pages: Page[] = [];
  for (let i = 0; i < lines.length; i += 40) pages.push(page(pages.length + 1, `${i === 0 ? `${NOTE}\nBreakdown log, ${MONTH}.\n` : ""}${lines.slice(i, i + 40).join("\n")}`));
  return pages;
}

function reportText(list: Event[]): string {
  const by = MACHINES.map((m) => {
    const rows = list.filter((e) => e.machine === m.name);
    const minutes = rows.reduce((s, e) => s + e.minutes, 0);
    const causes = new Map<string, number>();
    rows.forEach((e) => causes.set(e.cause, (causes.get(e.cause) ?? 0) + 1));
    const top = [...causes.entries()].sort((a, b) => b[1] - a[1])[0];
    return { name: m.name, count: rows.length, minutes, top: top ? `${top[0]} (${top[1]} times)` : "none" };
  }).sort((a, b) => b.count - a.count);
  const total = list.length;
  const lines = by.map((b, i) => `${i + 1}. ${b.name}: ${b.count} breakdowns, ${b.minutes} minutes lost, most common cause ${b.top}.`);
  return `${NOTE}\nMaintenance monthly report, ${MONTH}. Total breakdowns: ${total}. Total downtime: ${list.reduce((s, e) => s + e.minutes, 0)} minutes.\nWhich machine had the most breakdowns last month: ${by[0].name}, with ${by[0].count} breakdowns and ${by[0].minutes} minutes of downtime. The second was ${by[1].name} with ${by[1].count}.\nBreakdowns by machine, most first:\n${lines.join("\n")}`;
}

const LOG = events();

export const FACTORY_KB: KbDoc[] = [
  {
    name: "Sample - Plant and company profile.txt",
    pages: [
      page(1, `${NOTE}\n\nThe Box Company, plant profile. The Box Company is a demonstration corrugated box plant. It makes shipping cartons, printed cartons, die-cut boxes and trays, and corrugated sheets, from paper reels to stacked pallets, in one plant. Plant name: Plant 1. Line: corrugator plus converting.\nThe corrugator has a working width (deckle) of ${P.deckleMm} mm and is rated for ${P.ratedSpeed} m/min. The converting line is a Printer-slotter, a Folder-gluer and a Bundler. The Printer-slotter is the constraint machine, rated for ${P.psBoxesPerHour} boxes an hour, so its output sets the output of the whole plant.`),
      page(2, `Shifts. The plant runs ${P.shiftsPerDay} shifts of 8 hours: Shift A from ${hh(SHIFT_START_HOUR.A)} to ${hh(SHIFT_START_HOUR.B)}, Shift B from ${hh(SHIFT_START_HOUR.B)} to ${hh(SHIFT_START_HOUR.C)} and Shift C from ${hh(SHIFT_START_HOUR.C)} to ${hh(SHIFT_START_HOUR.A)}. Sunday is the weekly off, giving ${P.workingDaysPerMonth} working days a month.\nTypical running conditions by shift (demonstration averages): Shift A runs about ${SH.A.speed} m/min with trim near ${SH.A.trimPct}% and rejects near ${SH.A.rejectPct}%. Shift B runs about ${SH.B.speed} m/min with trim ${SH.B.trimPct}% and rejects ${SH.B.rejectPct}%. Shift C, the night shift, runs about ${SH.C.speed} m/min with trim ${SH.C.trimPct}% and rejects ${SH.C.rejectPct}%.`),
      page(3, `Departments. Stores: receives and stages paper reels, keeps starch, ink, wire and strapping. Corrugator: reel stand, single facer, double backer, slitter-scorer, cut-off and stacker. Converting: Printer-slotter, Folder-gluer and Bundler. Quality: incoming reel checks, board tests and first-off sign-off. Maintenance: preventive and breakdown work. Planning: combines orders across the deckle and sequences runs against due dates. Dispatch: packs, loads and tracks trucks.\nPlanning targets. The daily plan is ${OPS.dailyTargetM2.toLocaleString("en-IN")} m² of good board, which is rated output at the OEE target of ${TARGET.oee}%. The total waste target is ${OPS.wastageTargetPct}% of gross board.`),
    ],
  },
  {
    name: "Sample - Corrugator operating manual.txt",
    pages: [
      page(1, `${NOTE}\n\nCorrugator operating manual. Start-up. 1. Check the shift log for open faults and any held pallets. 2. Confirm lock-out and tag-out locks from the last shift are removed and all guards are fitted. 3. Confirm steam supply is on and the boiler pressure is in the normal range. 4. Warm the single facer rolls and the double backer hot plates to their set temperatures before feeding paper. 5. Load the reels for the first order and prepare the splice. 6. Run at low speed, check glue application and the first sheets, then raise speed in steps.`),
      page(2, `Normal operating values for the demonstration plant (invented, not manufacturer data). Boiler steam supply: 10 to 12 bar. Single facer roll surface temperature: 175 to 185 degrees C. Double backer hot plate temperature: 150 to 175 degrees C. Starch gel temperature: 52 to 58 degrees C. Glue viscosity: 30 to 40 seconds on the plant viscosity cup. Rated line speed: ${P.ratedSpeed} m/min. Target running speed: ${TARGET.speed} m/min. Recommended operating temperature for the single facer rolls is 175 to 185 degrees C; do not run the rolls above 190 degrees C.\nIf a value drifts outside its range, tell the shift supervisor and record it in the shift log before changing a setting.`),
      page(3, `Shut-down. Slow the line, run the last order out, and cut the web at the cut-off. Raise the pressure roll and open the glue gap. Switch off the steam to the single facer and double backer and let the rolls cool. Clear the stacker. Isolate the machine before any cleaning and apply lock-out and tag-out. Record counts, waste and any fault in the shift log.\nOrder changes. At the cut-off, change the slitter-scorer settings for the next order and confirm the order change target of ${OPS.orderChangeTargetMin} minutes. Do not enter the slitter-scorer area while the blades can move.`),
    ],
  },
  {
    name: "Sample - Corrugator troubleshooting guide - extended.txt",
    pages: [
      page(1, `${NOTE}\n\nExtended corrugator troubleshooting. Delamination or weak bonding: the layers pull apart. Possible causes: low steam pressure, glue viscosity too low or too high, glue gap wrong, line too fast for the heat available. Checks: boiler pressure, hot plate temperature, glue viscosity and the pin adhesion test. Recommended action: restore steam, adjust glue to the viscosity range in the operating manual, slow the line until a test passes. Safety: steam and hot plates cause severe burns.`),
      page(2, `Wash-boarding or poor flute formation: ridges on the liner or a flat flute. Possible causes: worn or chipped fluting rolls, low preheat on the medium, incorrect pressure roll setting. Checks: roll condition, medium moisture and preheater wrap, pressure roll gap. Recommended action: adjust the pressure roll in small steps, raise the medium preheat, and report worn rolls to Maintenance. Do not reach into the rolls while they turn.\nLow crush strength: board fails the edge crush test. Possible causes: wet or low-grade medium, flute crushed by too much pressure, wrong paper grade loaded. Checks: reel labels against the order, medium moisture, nip pressures.`),
      page(3, `Frequent stops at the cut-off and stacker: sheets jam at the stacker or are cut out of square. Possible causes: knife timing out, warped board, worn belts. Checks: knife timing, belt tension, board flatness. Recommended action: re-time the knife with Maintenance, correct warp at the double backer, replace worn belts. Clear jams only after lock-out and tag-out.`),
    ],
  },
  {
    name: "Sample - Double backer and slitter-scorer maintenance.txt",
    pages: [
      page(1, `${NOTE}\n\nDouble backer maintenance procedure. Required tools: lock-out and tag-out kit, heat-resistant gloves, infrared thermometer, feeler gauges, approved lubricant. Isolate steam and power, apply lock-out and tag-out, and let the hot plates cool before opening any cover.\nInspection steps: check hot plate surfaces for scoring and steam leaks, check belt condition and tracking, check the glue unit and doctor blade, check weights and rollers. Recommended procedure: clean the belts, lubricate bearings at the interval in the maintenance schedule, adjust belt tracking in small steps, and record all readings.`),
      page(2, `Slitter-scorer maintenance procedure. Required tools: lock-out and tag-out kit, cut-resistant gloves, knife handling tools, setting gauge. Blades are sharp. Only trained personnel may change knives. Inspect knife edges and score wheels at every change, rotate or replace worn knives, and check the setting gauge before restart. Never adjust a blade while the shaft can turn. Restore all guards before removing the lock-out.`),
    ],
  },
  {
    name: "Sample - Printer-slotter operation and changeover SOP.txt",
    pages: [
      page(1, `${NOTE}\n\nPrinter-slotter operation. The Printer-slotter is the constraint machine, rated for ${P.psBoxesPerHour} boxes an hour. Every minute it loses is a minute of box output lost for the whole plant, so changeovers are the biggest saving. The changeover target is ${TARGET.psChangeoverMin} minutes a shift in total.\nChangeover procedure (SMED). While the last order runs: mount the next plates on spare sleeves, mix the ink and check the colour, stage the slotter knives and the next order's blanks. When the order finishes: stop, apply lock-out and tag-out, swap the sleeves, set the slot positions, restart at low speed and check the first-off sample.`),
      page(2, `Troubleshooting. Feeder misfeed: check the feed wheels, vacuum and the sheet stack for warp. Plate and ink wash overruns: prepare wash solution and cloths before the stop. Registration drift: check plate mounting and the sheet squaring. Colour variation: check ink viscosity and anilox condition.\nSafety: ink and wash solvents need gloves and good ventilation. Never clear the feeder or slotter while the machine can move. Use lock-out and tag-out for all adjustments inside the guards.`),
    ],
  },
  {
    name: "Sample - Folder-gluer and bundler troubleshooting.txt",
    pages: [
      page(1, `${NOTE}\n\nFolder-gluer troubleshooting. Jams: check the blank for warp and size, belt speed matching and the fold bars. Poor glue bond: check the glue gun for blockage, glue level and viscosity, and the pressure section. Skewed boxes: check belt tension and the registration guides. Recommended action: clear jams only after stopping and applying lock-out and tag-out, then restart at low speed.`),
      page(2, `Bundler and strapping. Strapping wire or strap breaks: check the tension setting, the head for wear and the strap path for burrs. Frequent breaks on one strap roll point to a bad roll: set it aside and tell Stores. Pallet labels: check the label printer and the order reference before the pallet leaves. Keep hands clear of the strap head and turntable. Only authorised personnel may open the strapping head.`),
    ],
  },
  {
    name: "Sample - Quality control manual.txt",
    pages: [
      page(1, `${NOTE}\n\nQuality control manual. Tests and limits for the demonstration plant. Board moisture: 7 to 9%. Pin adhesion (bonding): 80 N/m minimum. Edge crush test (ECT): 5.5 kN/m minimum. Warp: 5 mm per metre maximum. Bursting strength: 12 kg/cm² minimum. Incoming reel moisture: 8% maximum.\nFirst-pass target: tests passed first time should be high; every fail needs a recorded cause and action.`),
      page(2, `Test frequency. Take a board sample at the start of every order, after every grade or flute change and at least every two hours of running. Test incoming reels on receipt: moisture, width and label against the purchase order. Print and score checks happen on the first-off from the Printer-slotter.\nWhen a test fails: hold the affected pallets, tell the shift supervisor, record the result, find the cause using the troubleshooting guide, and retest after the fix. Pallets stay on hold until a retest passes.`),
      page(3, `Reject handling. Rejected board goes to the reject stack and is counted as dry-end rejects. Trim and rejects are paid for and thrown away, so both are tracked per shift against the targets of ${TARGET.trimPct}% trim and ${TARGET.rejectPct}% rejects. Weak bonding is mostly traced to steam and glue; warp is mostly traced to moisture balance and uneven heat.`),
    ],
  },
  {
    name: "Sample - Safety manual.txt",
    pages: [
      page(1, `${NOTE}\n\nSafety manual. Lock-out and tag-out (LOTO): before any cleaning, clearing, inspection or repair inside the guards, stop the machine, isolate every energy source (electrical, steam, air, hydraulic), apply your personal lock and tag, and verify zero energy. Only the person who applied a lock removes it. Never bypass, disable or defeat a guard, interlock or emergency stop. If a guard is damaged, stop and report it.`),
      page(2, `Steam and hot surfaces. Steam lines, single facer rolls and double backer hot plates cause severe burns. Do not open a steam line or touch a hot surface. Work on steam systems is for qualified, authorised personnel only, after isolation and depressurising. Wear heat-resistant gloves near hot rolls.\nPersonal protective equipment: safety shoes, safety glasses and hearing protection in the plant; cut-resistant gloves at knives; chemical gloves and ventilation for ink and wash.`),
      page(3, `Reels and lifting. Reels are heavy. Use only the approved lifting equipment and only if trained. Keep clear of suspended loads. Forklifts: designated routes only, horn at corners, pedestrians have priority at crossings. Emergency: know the nearest emergency stop, fire extinguisher and assembly point. In a fire or injury, press the emergency stop, raise the alarm and call the shift supervisor.`),
    ],
  },
  {
    name: "Sample - Paper supplier specifications.txt",
    pages: [
      page(1, `${NOTE}\n\nPaper grades held on the reel stand. ${Object.entries(GRADES).map(([id, g]) => `${id}: ${g.name}, ${g.gsm} GSM.`).join(" ")}\nOn receipt, check the label (grade, GSM, width, weight), reel condition and moisture against the purchase order before the reel goes to stock.`),
      page(2, `Suppliers (demonstration records). ${VENDORS.map((v) => `${v.name}, ${v.city}, supplies ${v.supplies}. Lead time ${v.leadDays} days. On-time delivery ${v.onTimePct}%. Reject rate ${v.rejectPct}%.`).join(" ")}\nA supplier below 80% on-time delivery is reviewed; reels from a supplier with repeated moisture rejects are used last and reported.`),
    ],
  },
  {
    name: "Sample - Preventive maintenance schedule.txt",
    pages: [
      page(1, `${NOTE}\n\nPreventive maintenance schedule (demonstration intervals). Daily, by operators: clean glue rolls and doctor blades, check guards and emergency stops, check oil and air pressure, record any noise or leak. Weekly: inspect belts and tracking, lubricate listed bearings, check knife condition. Monthly: inspect fluting rolls for wear and chips, check steam traps and hoses, check pressure roll alignment, test interlocks.`),
      page(2, `Quarterly: service the double backer hot plates, check gearbox oil, calibrate temperature and pressure gauges. Yearly: full inspection of the single facer, boiler inspection by a qualified inspector, electrical safety check. Planned maintenance windows are scheduled in the Planner so orders avoid them. Every task needs lock-out and tag-out and a record of who did it and what was found.`),
    ],
  },
  {
    name: "Sample - Shift handover SOP.txt",
    pages: [
      page(1, `${NOTE}\n\nShift handover SOP. The outgoing supervisor and the incoming supervisor walk the line together at ${hh(SHIFT_START_HOUR.A)}, ${hh(SHIFT_START_HOUR.B)} and ${hh(SHIFT_START_HOUR.C)}. Hand over: the order in progress and the next three orders, open faults and held pallets, quality alerts, reel stock for the first three hours, steam and glue readings, and safety issues. The outgoing crew stages the first three hours of reels before the shift ends, because reels not staged is the biggest single cause of lost time at the start of Shift C.`),
    ],
  },
  {
    name: "Sample - KPI and targets handbook.txt",
    pages: [
      page(1, `${NOTE}\n\nKPI and targets handbook. OEE target ${TARGET.oee}%, made of availability ${TARGET.availability}%, running speed ${TARGET.speed} m/min against ${P.ratedSpeed} m/min rated, trim ${TARGET.trimPct}% and rejects ${TARGET.rejectPct}%. Printer-slotter changeover target ${TARGET.psChangeoverMin} minutes a shift. Reel-wait that staging cannot remove: ${TARGET.reelWaitMin} minutes a shift. Deckle use target ${OPS.deckleTargetPct}%.\nPlanner rules: first job set-up ${PLANNER.firstSetupMin} minutes; a grade change adds ${PLANNER.changeoverMin.grade} minutes, a flute change ${PLANNER.changeoverMin.flute}, a print colour change ${PLANNER.changeoverMin.printColour}, plates only ${PLANNER.changeoverMin.printPlates} and a blank size change ${PLANNER.changeoverMin.size}.`),
    ],
  },
  { name: "Sample - Breakdown log October 2026.csv", kind: "csv", pages: logPages(LOG) },
  { name: "Sample - Maintenance monthly report.txt", pages: [page(1, reportText(LOG))] },
];
