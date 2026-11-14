import { GRADES, type GradeId } from "../records";
import { fromInputValue } from "./calendar";
import { FLUTES, PRINTS, PRIORITIES, STYLES, type PlannerFlute, type PlannerOrder, type Priority, type PrintSpec, type StyleId } from "./types";

/** The order form's fields exactly as typed: numbers and the deadline are still text. */
export type Draft = {
  id: string;
  customer: string;
  style: string;
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  qty: string;
  grade: string;
  flute: string;
  print: string;
  due: string;
  priority: string;
};

export type DraftErrors = Partial<Record<keyof Draft, string>>;

export const DIM_MIN_MM = 50;
export const DIM_MAX_MM = 2500;
export const QTY_MAX = 5_000_000;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/;

const whole = (v: string): number => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);

/**
 * Check a draft and turn it into an order. Returns every problem at once, so the form can show them
 * all. `takenIds` are the ids already in use (leave out the one being edited).
 */
export function parseOrder(d: Draft, takenIds: readonly string[], planStart: number): { order: PlannerOrder | null; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const id = d.id.trim();
  if (!ID_PATTERN.test(id)) errors.id = "Use 2 to 20 letters, numbers or dashes.";
  else if (takenIds.some((t) => t.toLowerCase() === id.toLowerCase())) errors.id = "That order ID is already in use.";

  const customer = d.customer.trim();
  if (customer.length < 2 || customer.length > 60) errors.customer = "Enter the customer name (2 to 60 characters).";

  if (!(d.style in STYLES)) errors.style = "Pick a box style.";
  if (!(d.grade in GRADES)) errors.grade = "Pick a board grade.";
  if (!(FLUTES as readonly string[]).includes(d.flute)) errors.flute = "Pick a flute.";
  if (!(d.print in PRINTS)) errors.print = "Pick a print requirement.";
  if (!(PRIORITIES as readonly string[]).includes(d.priority)) errors.priority = "Pick a priority.";

  const dim = (key: "lengthMm" | "widthMm" | "heightMm", label: string): number => {
    const v = whole(d[key]);
    if (!Number.isFinite(v) || v < DIM_MIN_MM || v > DIM_MAX_MM) errors[key] = `${label} must be a whole number from ${DIM_MIN_MM} to ${DIM_MAX_MM} mm.`;
    return v;
  };
  const lengthMm = dim("lengthMm", "Length");
  const widthMm = dim("widthMm", "Width");
  const heightMm = dim("heightMm", "Height");

  const qty = whole(d.qty);
  if (!Number.isFinite(qty) || qty < 1 || qty > QTY_MAX) errors.qty = `Quantity must be a whole number from 1 to ${QTY_MAX.toLocaleString("en-IN")}.`;

  const due = fromInputValue(d.due);
  if (!Number.isFinite(due)) errors.due = "Enter the delivery deadline.";
  else if (due <= planStart) errors.due = "The deadline is before the plan starts.";

  if (Object.keys(errors).length > 0) return { order: null, errors };
  const grade = d.grade as GradeId;
  return {
    order: {
      id,
      customer,
      style: d.style as StyleId,
      lengthMm,
      widthMm,
      heightMm,
      qty,
      grade,
      gsm: GRADES[grade].gsm,
      flute: d.flute as PlannerFlute,
      print: d.print as PrintSpec,
      due,
      priority: d.priority as Priority,
    },
    errors,
  };
}

/** Whether something read back from storage is a usable order. Anything else is dropped. */
export function isOrder(v: unknown): v is PlannerOrder {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  return (
    typeof o.id === "string" && typeof o.customer === "string" &&
    typeof o.style === "string" && o.style in STYLES &&
    num(o.lengthMm) && num(o.widthMm) && num(o.heightMm) && num(o.qty) && (o.qty as number) > 0 &&
    typeof o.grade === "string" && o.grade in GRADES && num(o.gsm) &&
    typeof o.flute === "string" && (FLUTES as readonly string[]).includes(o.flute) &&
    typeof o.print === "string" && o.print in PRINTS &&
    num(o.due) &&
    typeof o.priority === "string" && (PRIORITIES as readonly string[]).includes(o.priority)
  );
}
