"use client";

import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { Term } from "@/components/ui/term";
import { usePlant } from "@/components/dashboard/PlantProvider";
import { WithPlant } from "@/components/dashboard/WithPlant";
import { ORDERS, P, TARGET } from "@/lib/assumptions";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Combo, TrimPlan } from "@/lib/types";

const customer = new Map(ORDERS.map((o) => [o.id, o.customer]));
const share = (mm: number) => `${(mm / P.deckleMm) * 100}%`;
const trimTone = (p: number) => (p <= TARGET.trimPct ? "text-green" : p <= TARGET.trimPct + 1 ? "text-amber" : "text-red");

/** One run across the deckle: each out a segment, trim in red, unused deckle left blank. */
function Run({ label, combo }: { label: string; combo: Combo }) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3">
      <span className="text-xs text-mu">{label}</span>
      <div className="flex h-5 overflow-hidden rounded-sm bg-s2/60">
        {combo.orders.flatMap((o, oi) =>
          Array.from({ length: o.outs }, (_, k) => (
            <span
              key={`${o.id}-${k}`}
              title={`${o.id} ${customer.get(o.id) ?? ""}: ${o.outs} outs × ${num(o.widthMm)} mm`}
              className={cn("h-full border-r border-bg", oi === 0 ? "bg-brand" : "bg-blue")}
              style={{ width: share(o.widthMm) }}
            />
          )),
        )}
        <span title={`Trim ${num(combo.trimMm)} mm`} className="h-full bg-red" style={{ width: share(combo.trimMm) }} />
      </div>
      <span className={cn("text-right text-xs tabular-nums", trimTone(combo.trimPct))}>{pct(combo.trimPct)}</span>
    </div>
  );
}

function story(t: TrimPlan): string {
  return `Re-pairing orders cuts trim from ${pct(t.plannedPct)} to ${pct(t.bestPct)} of the paper on today's runs. The biggest wins are runs that use one order alone on a wide reel.`;
}

/** The planner's run against the best combination, run by run. */
export function DecklePlanner({ className }: { className?: string }) {
  const plant = usePlant();
  return (
    <Card
      id="trim"
      busy={plant.status === "loading"}
      title={
        <>
          <Term k="deckle">Deckle</Term> planner
        </>
      }
      subtitle={
        <>
          Today&apos;s runs across the {num(P.deckleMm)} mm deckle: the plan, then the best pairing.
          Red is <Term k="trim">trim</Term> you pay for and throw away.
        </>
      }
      className={className}
    >
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="rows" className="h-56" />}>
        {(d) => (
          <>
            <ul className="flex flex-col">
              {d.trim.runs.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5 border-t border-line py-3 first:border-t-0">
                  <p className="flex justify-between text-xs text-mu tabular-nums">
                    <span className="text-tx">
                      {r.id} · {r.planned.orders.map((o) => customer.get(o.id)).join(", ")}
                    </span>
                    <span>{num(r.meters)} m of board</span>
                  </p>
                  <Run label="Plan" combo={r.planned} />
                  <Run label="Best" combo={r.best} />
                </li>
              ))}
            </ul>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mu">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand" />Main order</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-blue" />Paired order</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-red" />Trim</span>
            </p>
            <Insight tone="good">{story(d.trim)}</Insight>
          </>
        )}
      </WithPlant>
    </Card>
  );
}
