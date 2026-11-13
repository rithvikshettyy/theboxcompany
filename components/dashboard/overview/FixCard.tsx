"use client";

import { SlidersHorizontal } from "lucide-react";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { RupeeFigure } from "@/components/ui/rupee-figure";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlant } from "../PlantProvider";
import { useSimulator } from "../SimulatorProvider";

/** Fix first: the ranked fixes with their ₹ a month; Simulate loads each one's preset. */
export function FixCard({ className }: { className?: string }) {
  const plant = usePlant();
  const { apply } = useSimulator();
  return (
    <section id="fix" aria-labelledby="fix-title" className={cn("flex flex-col gap-5 rounded-3xl bg-s1 p-5 shadow-card md:p-6", className)}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 id="fix-title" className="text-base text-mu">Fix first</h2>
          {plant.status === "ready" && plant.data.recs[0] ? (
            <p className="mt-1 text-2xl text-tx">
              <RupeeFigure value={plant.data.recs[0].perMonth} signed className="text-green" />
              <span className="text-mu"> a month from the top fix</span>
            </p>
          ) : null}
        </div>
        <a href="#simulator" className="inline-flex min-h-11 items-center text-sm text-mu hover:text-tx">Open simulator</a>
      </header>
      {plant.status === "ready" ? (
        <ol className="flex flex-col gap-2">
          {plant.data.recs.slice(0, 3).map((r, i) => (
            <li key={r.id} className="flex items-center gap-4 rounded-2xl bg-s2/70 p-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-s1 text-sm text-tx tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-tx">{r.title}</span>
                <span className="text-xs text-mu">{r.owner}, {r.effort.toLowerCase()} effort</span>
              </span>
              <span className="text-right">
                <span className="block text-sm text-green tabular-nums">+{inr(r.perMonth)}</span>
                <button
                  type="button"
                  onClick={() => {
                    apply(r.preset);
                    document.getElementById("simulator")?.scrollIntoView({ block: "start" });
                  }}
                  className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs text-mu underline-offset-2 hover:text-tx hover:underline"
                >
                  <SlidersHorizontal aria-hidden="true" className="size-3" />
                  Simulate<span className="sr-only"> {r.title}</span>
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ChartSkeleton variant="rows" className="h-48" />
      )}
      <p className="text-xs text-mu">Each figure is what the simulator shows when you load that fix.</p>
    </section>
  );
}
