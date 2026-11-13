import { FLUTE_CHANGE_MIN, ORDERS, P, PLANNED_SEQUENCE, TIGHT_MIN } from "./assumptions";
import type { Order, OrderStatus, Schedule, ShiftParams } from "./types";

/**
 * Runs the order book through the corrugator in sequence. "planned" is the planner's
 * flute-grouped order; "due" is earliest due date first. Run time comes from the scope's
 * speed and trim; a flute change costs FLUTE_CHANGE_MIN.
 */
export function schedule(mode: "planned" | "due", base: ShiftParams): Schedule {
  const sequence: Order[] =
    mode === "due"
      ? [...ORDERS].sort((a, b) => a.dueH - b.dueH)
      : PLANNED_SEQUENCE.map((id) => {
          const found = ORDERS.find((o) => o.id === id);
          if (!found) throw new Error(`Planned order ${id} is not in ORDERS`);
          return found;
        });

  // Good board a minute while running: speed × width actually used.
  const m2PerMin = base.speed * (P.deckleMm / 1000) * (1 - base.trimPct / 100);
  let clock = 0;
  let fluteChanges = 0;
  const rows = sequence.map((o, i) => {
    const fluteChange = i > 0 && sequence[i - 1].flute !== o.flute;
    if (fluteChange) {
      clock += FLUTE_CHANGE_MIN;
      fluteChanges += 1;
    }
    const m2 = (o.qty * o.widthMm * o.lengthMm) / 1e6;
    const startMin = clock;
    clock += m2 / m2PerMin;
    const dueMin = o.dueH * 60;
    const slack = dueMin - clock;
    const status: OrderStatus = slack < 0 ? "late" : slack < TIGHT_MIN ? "tight" : "ok";
    return {
      id: o.id,
      customer: o.customer,
      flute: o.flute,
      startMin,
      endMin: clock,
      dueMin,
      status,
      fluteChange,
    };
  });
  return { rows, late: rows.filter((r) => r.status === "late").length, fluteChanges };
}
