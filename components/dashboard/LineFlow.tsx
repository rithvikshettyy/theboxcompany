"use client";

import { Fragment } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { Term } from "@/components/ui/term";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NodeStat, PlantData } from "@/lib/types";
import { usePlant } from "./PlantProvider";
import { WithPlant } from "./WithPlant";

function story(d: PlantData): string {
  const c = d.nodes.find((n) => n.isConstraint);
  const i = c ? d.nodes.indexOf(c) : -1;
  if (!c || i < 1) return "Every machine keeps up with the one before it.";
  const feed = Math.min(...d.nodes.slice(0, i).map((n) => n.effectivePerHour));
  return `The ${c.label.toLowerCase()} is the constraint at ${num(c.effectivePerHour)} boxes an hour, against ${num(feed)} arriving from the corrugator. About ${num(c.wipBefore ?? 0)} pallets pile up in front of it every shift.`;
}

function Machine({ n, feeders }: { n: NodeStat; feeders?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-40 shrink-0 snap-start flex-col gap-1 rounded-panel border p-3 xl:w-auto",
        n.isConstraint ? "border-red" : "border-line",
      )}
    >
      <p className="text-sm font-medium text-tx">{n.label}</p>
      <p className="text-lg text-tx tabular-nums">
        {num(n.effectivePerHour)}
        <span className="text-xs text-mu"> boxes/h</span>
      </p>
      <p className="text-xs text-mu tabular-nums">
        {pct(n.availability * 100, 0)} running, rated {num(n.ratedPerHour)}
      </p>
      {n.isConstraint ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red">
          <TriangleAlert aria-hidden="true" className="size-3.5" />
          Constraint
        </p>
      ) : null}
      {feeders ? <p className="mt-1 text-xs text-mu">{feeders}</p> : null}
    </div>
  );
}

/** Eight machines in flow order, what each really produces, and where work piles up. */
export function LineFlow({ className }: { className?: string }) {
  const plant = usePlant();
  return (
    <Card
      id="line"
      busy={plant.status === "loading"}
      title="Line flow"
      subtitle={
        <>
          The slowest machine, the <Term k="constraint">constraint</Term>, sets output for the whole
          plant. Rates are box equivalents an hour after stops and slow running.
        </>
      }
      className={className}
    >
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="flow" className="h-28" />}>
        {(d) => {
          const feeders = d.feeders.map((f) => `${f.label} ${num(f.lostMin)} min`).join(", ");
          return (
            <>
              <ol className="-mx-5 flex snap-x items-stretch gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0 xl:overflow-visible">
                {d.nodes.map((n, i) => (
                  <Fragment key={n.id}>
                    {i > 0 ? (
                      <li aria-hidden="true" className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 text-mu xl:w-12">
                        <ArrowRight className="size-4" />
                        {n.wipBefore !== null && n.wipBefore >= 0.5 ? (
                          <span className={cn("text-2xs tabular-nums", n.isConstraint && "text-red")}>
                            {num(n.wipBefore)} pallets
                          </span>
                        ) : null}
                      </li>
                    ) : null}
                    <li className="xl:min-w-0 xl:flex-1">
                      <Machine n={n} feeders={n.id === "sf" ? `Feeds: ${feeders} lost` : undefined} />
                    </li>
                  </Fragment>
                ))}
              </ol>
              <Insight tone="loss">{story(d)}</Insight>
            </>
          );
        }}
      </WithPlant>
    </Card>
  );
}
