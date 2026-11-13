"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { Term } from "@/components/ui/term";
import { cn } from "@/lib/utils";
import { planClock } from "@/lib/viz";
import type { OrderStatus, PlantData } from "@/lib/types";
import { usePlant } from "./PlantProvider";
import { WithPlant } from "./WithPlant";

type Mode = "planned" | "due";
const MODES: { id: Mode; label: string }[] = [
  { id: "planned", label: "Planned" },
  { id: "due", label: "By due date" },
];
const TAG: Record<OrderStatus, { label: string; icon: typeof Clock; ink: string }> = {
  late: { label: "Late", icon: CircleAlert, ink: "text-red" },
  tight: { label: "Tight", icon: Clock, ink: "text-amber" },
  ok: { label: "On time", icon: CircleCheck, ink: "text-green" },
};

function story(d: PlantData): string {
  const { planned, due } = d.orders;
  const saved = planned.late - due.late;
  const extra = due.fluteChanges - planned.fluteChanges;
  if (saved <= 0) {
    return `Both orders leave ${due.late} late, so keep the planned sequence: it needs ${extra} fewer flute changes.`;
  }
  return `The planned order needs ${planned.fluteChanges} flute changes but leaves ${planned.late} late. Running by due date gets ${saved} of them out on time for ${extra} more changes.`;
}

/** Today's order book through the corrugator, in the planner's order or by due date. */
export function OrderTable({ className }: { className?: string }) {
  const plant = usePlant();
  const [mode, setMode] = useState<Mode>("planned");
  return (
    <Card
      id="orders"
      busy={plant.status === "loading"}
      title="Order sequence"
      subtitle={
        <>
          Today&apos;s orders from 06:00. Fewer <Term k="flute">flute</Term> changes or fewer late
          orders: pick one.
        </>
      }
      actions={
        <div role="group" aria-label="Sequence" className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "h-11 rounded-chip px-3 text-sm font-medium transition-colors duration-150 md:h-9",
                mode === m.id ? "bg-brand text-bg" : "text-mu hover:text-tx",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
      className={className}
    >
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="table" className="h-56" />}>
        {(d) => (
          <>
            <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
              <table className="w-full min-w-[30rem] text-sm">
                <caption className="sr-only">Orders in {mode === "planned" ? "planned" : "due date"} sequence</caption>
                <thead>
                  <tr className="text-left text-xs text-mu">
                    <th scope="col" className="pb-2 font-normal">Order</th>
                    <th scope="col" className="pb-2 font-normal">Flute</th>
                    <th scope="col" className="pb-2 text-right font-normal">Done</th>
                    <th scope="col" className="pb-2 text-right font-normal">Due</th>
                    <th scope="col" className="pb-2 pl-4 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.orders[mode].rows.map((r) => {
                    const tag = TAG[r.status];
                    return (
                      <tr key={r.id} className="border-t border-line">
                        <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                          <span className="block text-tx">{r.customer}</span>
                          <span className="text-xs text-mu tabular-nums">{r.id}</span>
                        </th>
                        <td className={cn("py-2.5 tabular-nums", r.fluteChange ? "text-amber" : "text-tx")}>
                          {r.flute}
                          {r.fluteChange ? <span className="sr-only"> (flute change)</span> : null}
                        </td>
                        <td className="py-2.5 text-right text-tx tabular-nums">{planClock(r.endMin)}</td>
                        <td className="py-2.5 text-right text-mu tabular-nums">{planClock(r.dueMin)}</td>
                        <td className={cn("py-2.5 pl-4", tag.ink)}>
                          <span className="flex items-center gap-1.5">
                            <tag.icon aria-hidden="true" className="size-3.5" />
                            {tag.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Insight tone="watch">{story(d)}</Insight>
          </>
        )}
      </WithPlant>
    </Card>
  );
}
