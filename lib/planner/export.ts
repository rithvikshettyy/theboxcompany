import { fmtDuration, fmtH, fmtMs } from "./calendar";
import { PRINTS, type Inputs, type Schedule } from "./types";

/** A CSV cell. Quotes are doubled, and a leading = + - or @ is defused so a spreadsheet cannot run it as a formula. */
export function cell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const HEADER = [
  "Order", "Customer", "Machine", "Start", "End", "Run hours", "Changeover min", "Changeover reason",
  "Quantity", "Flute", "Grade", "Print", "Deadline", "Priority", "Status", "Late by",
];

/** The schedule as CSV: one row per scheduled order, then one per order that could not be scheduled. */
export function scheduleToCsv(inputs: Inputs, s: Schedule): string {
  const order = new Map(inputs.orders.map((o) => [o.id, o]));
  const machine = new Map(inputs.machines.map((m) => [m.id, m.name]));
  const rows: (string | number)[][] = [];
  for (const p of s.placements) {
    const o = order.get(p.orderId);
    if (!o) continue;
    rows.push([
      o.id, o.customer, machine.get(p.machineId) ?? p.machineId, fmtH(inputs.planStart, p.startH), fmtH(inputs.planStart, p.endH),
      p.runH.toFixed(2), Math.round(p.changeoverMin), p.changeoverWhy.join("; "),
      o.qty, o.flute, o.grade, PRINTS[o.print].label, fmtMs(o.due), o.priority,
      p.status === "late" ? "Late" : p.status === "at-risk" ? "At risk" : "On time",
      p.lateH > 0 ? fmtDuration(p.lateH) : "",
    ]);
  }
  for (const u of s.unscheduled) {
    const o = order.get(u.orderId);
    if (!o) continue;
    rows.push([o.id, o.customer, "", "", "", "", "", u.reason, o.qty, o.flute, o.grade, PRINTS[o.print].label, fmtMs(o.due), o.priority, "Not scheduled", ""]);
  }
  return [HEADER, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
