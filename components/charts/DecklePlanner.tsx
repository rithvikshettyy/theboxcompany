"use client";

import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { Term } from "@/components/ui/term";
import { usePlant } from "@/components/dashboard/PlantProvider";
import { WithPlant } from "@/components/dashboard/WithPlant";
import { ORDERS, P, TARGET, WASTE_PER_M2 } from "@/lib/assumptions";
import { inr, num, pct, wt } from "@/lib/format";
import { trimSavings } from "@/lib/trim";
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

/** Before and after for the plan's runs: trim, paper saved, ₹ recovered. */
function Outcome({ plan }: { plan: TrimPlan }) {
  const s = trimSavings(plan);
  const cells = [
    { label: "Trim, before", value: pct(plan.plannedPct), tone: trimTone(plan.plannedPct) },
    { label: "Trim, after", value: pct(plan.bestPct), tone: trimTone(plan.bestPct) },
    { label: "Paper saved", value: `${num(s.savedM2)} m²`, note: wt(s.savedKg / 1000, 1), tone: "text-tx" },
    { label: "₹ recovered a day", value: inr(s.rupeesPerDay), note: "on these runs", tone: "text-green" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-2xl bg-s2/70 p-4">
          <dt className="text-xs text-mu">{c.label}</dt>
          <dd className={cn("mt-1 text-xl tabular-nums", c.tone)}>{c.value}</dd>
          {c.note ? <dd className="text-xs text-mu tabular-nums">{c.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
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
            <Outcome plan={d.trim} />
            <ul className="flex flex-col">
              {d.trim.runs.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5 border-t border-line py-3 first:border-t-0">
                  <p className="flex justify-between text-xs text-mu tabular-nums">
                    <span className="text-tx">
                      {r.id} · {r.planned.orders.map((o) => customer.get(o.id)).join(", ")}
                    </span>
                    <span>
                      {num(r.meters)} m of board
                      {r.planned.trimMm - r.best.trimMm > 0 ? (
                        <span className="text-green"> · saves {num(((r.planned.trimMm - r.best.trimMm) / 1000) * r.meters)} m²</span>
                      ) : null}
                    </span>
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
            <p className="text-xs text-mu">
              Both plans run the same metres of board per run, so the saving is trim only. ₹ is margin never earned plus paper not won back as scrap, ₹{num(WASTE_PER_M2, 2)} per m². The Action centre prices the same idea across every run and shift.
            </p>
          </>
        )}
      </WithPlant>
    </Card>
  );
}
