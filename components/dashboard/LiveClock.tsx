"use client";

import { useSyncExternalStore } from "react";
import { CLOCK_TICK_MS, PLANT } from "@/lib/assumptions";

const fmt = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PLANT.timeZone,
});

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, CLOCK_TICK_MS);
  return () => window.clearInterval(id);
}

/** A string snapshot compares by value, so React only re-renders when the minute changes. */
const getSnapshot = () => fmt.format(Date.now());
/** No time on the server: avoids a hydration mismatch and keeps the prerendered shell static. */
const getServerSnapshot = () => null;

export function LiveClock() {
  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <p className="num text-sm whitespace-nowrap text-mu">
      <span className="sr-only">Plant time </span>
      <span className="text-tx">{time ?? "--:--"}</span>
      {/* Phones drop the zone label to keep the header on one row; screen readers still get it. */}
      <span className="sr-only sm:not-sr-only"> {PLANT.timeZoneLabel}</span>
    </p>
  );
}
