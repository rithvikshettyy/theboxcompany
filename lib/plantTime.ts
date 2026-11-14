import { PLANT, SHIFT_IDS, SHIFT_START_HOUR } from "./assumptions";
import type { ShiftId } from "./types";

const parts = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PLANT.timeZone,
});

/** Hour and minute on the plant clock for an instant (ms since epoch), whatever the viewer's own zone. */
export function plantClock(at: number): { hour: number; minute: number; label: string } {
  const get = (type: string) => Number(parts.formatToParts(at).find((p) => p.type === type)?.value ?? 0);
  const hour = get("hour") % 24;
  const minute = get("minute");
  return { hour, minute, label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

/** The shift running at a plant hour (A 06 to 14, B 14 to 22, C 22 to 06). */
export function shiftAt(hour: number): ShiftId {
  return [...SHIFT_IDS].reverse().find((s) => hour >= SHIFT_START_HOUR[s]) ?? "C";
}

/** Greeting for a plant hour. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

/** Milliseconds until the plant clock's next minute starts. */
export function msToNextMinute(at: number): number {
  return 60_000 - (at % 60_000);
}
