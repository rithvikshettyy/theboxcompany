"use client";

import { useSyncExternalStore } from "react";
import { PLANT } from "@/lib/assumptions";
import { msToNextMinute, plantClock, shiftAt } from "@/lib/plantTime";

/** Ticks on the minute, not every N seconds, so the display never lags the real clock by up to a tick. */
function subscribe(onTick: () => void) {
  let timer = 0;
  const arm = () => {
    timer = window.setTimeout(() => {
      onTick();
      arm();
    }, msToNextMinute(Date.now()) + 20);
  };
  arm();
  return () => window.clearTimeout(timer);
}

/** A string snapshot compares by value, so React only re-renders when the minute changes. */
const getSnapshot = () => plantClock(Date.now()).label;
/** No time on the server: avoids a hydration mismatch and keeps the prerendered shell static. */
const getServerSnapshot = () => null;

/** Plant time (always the plant's zone, not the viewer's) and the shift running now. */
export function LiveClock() {
  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const shift = time ? shiftAt(Number(time.slice(0, 2))) : null;
  return (
    <p className="num text-sm whitespace-nowrap text-mu">
      <span className="sr-only">Plant time </span>
      <span className="text-tx">{time ?? "--:--"}</span>
      {/* Phones drop the zone label to keep the header on one row; screen readers still get it. */}
      <span className="sr-only sm:not-sr-only"> {PLANT.timeZoneLabel}</span>
      {shift ? <span className="hidden sm:inline"> · Shift {shift}</span> : null}
    </p>
  );
}
