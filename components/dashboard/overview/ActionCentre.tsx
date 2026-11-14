"use client";

import { SlidersHorizontal } from "lucide-react";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { RupeeFigure } from "@/components/ui/rupee-figure";
import { actionCentre, type Priority } from "@/lib/actions";
import { inr, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlant } from "../PlantProvider";
import { useSimulator } from "../SimulatorProvider";
import { WithPlant } from "../WithPlant";

const PRIORITY: Record<Priority, string> = {
  High: "bg-red/10 text-red",
  Medium: "bg-amber/10 text-amber",
  Low: "bg-s2 text-mu",
};

/**
 * Executive action centre: the plant's top problems for the scope in view, each with what to do,
 * what it is worth a month, who owns it and how urgent it is. Simulate loads the fix.
 */
export function ActionCentre({ className }: { className?: string }) {
  const plant = usePlant();
  const { apply } = useSimulator();
  return (
    <section id="fix" aria-labelledby="actions-title" className={cn("flex flex-col gap-5 rounded-3xl bg-s1 p-5 shadow-card md:p-6", className)}>
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="rows" className="h-64" />}>
        {(d) => {
          const actions = actionCentre(d);
          const total = actions.reduce((s, a) => s + a.perMonth, 0);
          return (
            <>
              <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div>
                  <h2 id="actions-title" className="text-base text-mu">Action centre</h2>
                  <p className="mt-1 text-2xl text-tx">
                    <RupeeFigure value={total} signed className="text-green" />
                    <span className="text-mu"> a month if these {actions.length} are fixed</span>
                  </p>
                </div>
                <a href="#simulator" className="inline-flex min-h-11 items-center text-sm text-mu hover:text-tx">Open simulator</a>
              </header>
              <ol className="flex flex-col gap-2">
                {actions.map((a) => (
                  <li key={a.id} className="grid gap-x-5 gap-y-3 rounded-2xl bg-s2/70 p-4 lg:grid-cols-[2.5rem_minmax(0,1.3fr)_minmax(0,1.5fr)_9rem_8rem] lg:items-center">
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-s1 text-sm text-tx tabular-nums">{a.rank}</span>
                    <span className="min-w-0">
                      <span className="block text-xs text-mu">Problem</span>
                      <span className="block text-sm text-tx">{a.problem}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-mu">Do this</span>
                      <span className="block text-sm text-tx">{a.action}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mu">
                        <span>Owner: {a.owner}</span>
                        <span>{a.effort} effort</span>
                      </span>
                    </span>
                    <span>
                      <span className="block text-xs text-mu">Impact</span>
                      <span className="block text-base text-green tabular-nums">+{inr(a.perMonth)}</span>
                      <span className="block text-xs text-mu tabular-nums">{pct(a.shareOfLeak * 100, 0)} of the monthly leak</span>
                    </span>
                    <span className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
                      <span className={cn("rounded-full px-3 py-1 text-xs", PRIORITY[a.priority])}>{a.priority} priority</span>
                      <button
                        type="button"
                        onClick={() => {
                          apply(a.preset);
                          document.getElementById("simulator")?.scrollIntoView({ block: "start" });
                        }}
                        className="inline-flex min-h-11 items-center gap-1 text-xs text-mu underline-offset-2 hover:text-tx hover:underline"
                      >
                        <SlidersHorizontal aria-hidden="true" className="size-3" />
                        Simulate<span className="sr-only"> {a.action}</span>
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-mu">
                Ranked by ₹ a month. Each figure is what the simulator shows when you load that fix. Priority is the share of the monthly leak it wins back: High from 5%, Medium from 2%.
              </p>
            </>
          );
        }}
      </WithPlant>
    </section>
  );
}
