"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { P, TARGET } from "@/lib/assumptions";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlant } from "./PlantProvider";

/** Average corrugator running speed for the scope, against target, coloured by status. */
export function SpeedPill() {
  const plant = usePlant();
  const speed = plant.status === "ready" ? plant.data.base.speed : null;
  const onTarget = speed !== null && speed >= TARGET.speed;

  return (
    <div
      aria-busy={speed === null || undefined}
      className="inline-flex h-8 items-center gap-1.5 text-xs sm:gap-2 sm:text-sm"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          speed === null ? "bg-brand" : onTarget ? "bg-green" : "bg-amber",
        )}
      />
      <span className="text-mu">
        <span className="sm:hidden">Speed</span>
        <span className="hidden sm:inline">Corrugator speed</span>
      </span>
      {speed === null ? (
        <>
          <Skeleton className="h-3 w-10" />
          <span className="sr-only">loading</span>
        </>
      ) : (
        <span className="num text-tx">{num(speed)}</span>
      )}
      <span className="num text-mu">
        <span className="hidden sm:inline">/ {TARGET.speed} </span>m/min
      </span>
      <span className="sr-only">
        {onTarget ? "on target" : "below target"}, rated {P.ratedSpeed} m/min
      </span>
    </div>
  );
}
