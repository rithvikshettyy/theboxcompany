"use client";

import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { RupeeFigure } from "@/components/ui/rupee-figure";
import { inrSigned, num } from "@/lib/format";
import { simulate } from "@/lib/model";
import { cn } from "@/lib/utils";
import type { Lever, ShiftParams } from "@/lib/types";
import { usePlant } from "./PlantProvider";
import { useSimulator } from "./SimulatorProvider";

/** Slider ranges and steps. Steps are fine enough to hold any scope baseline exactly. */
const LEVERS: { id: Lever; label: string; unit: string; min: number; max: number; step: number; dp: number }[] = [
  { id: "downtimeMin", label: "Corrugator downtime", unit: "min a shift", min: 0, max: 200, step: 0.1, dp: 0 },
  { id: "speed", label: "Running speed", unit: "m/min", min: 80, max: 150, step: 0.1, dp: 0 },
  { id: "trimPct", label: "Trim", unit: "%", min: 1, max: 8, step: 0.01, dp: 1 },
  { id: "rejectPct", label: "Rejects", unit: "%", min: 0.5, max: 5, step: 0.01, dp: 1 },
  { id: "psChangeoverMin", label: "Printer-Slotter changeover", unit: "min a shift", min: 20, max: 160, step: 0.1, dp: 0 },
];
const shown = (v: number, dp: number, unit: string) => `${num(v, dp)}${unit === "%" ? "%" : ` ${unit}`}`;

function Outcome({ base, params }: { base: ShiftParams; params: ShiftParams }) {
  const sim = simulate(base, params);
  const max = Math.max(1, ...sim.byLever.map((l) => Math.abs(l.perMonth)));
  const good = sim.perMonth >= 0;
  return (
    <div aria-live="polite" className="flex flex-col gap-4 border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
      <p className="text-sm text-mu">Recovered a month against today&apos;s baseline</p>
      <RupeeFigure value={sim.perMonth} signed className={cn("text-2xl font-medium", good ? "text-green" : "text-red")} unitClassName="text-xl" />
      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div><dt className="text-mu">A year</dt><dd className="text-tx tabular-nums">{inrSigned(sim.perYear)}</dd></div>
        <div><dt className="text-mu">Extra board</dt><dd className="text-tx tabular-nums">{num(sim.extraM2PerMonth)} m²</dd></div>
        <div><dt className="text-mu">Truckloads</dt><dd className="text-tx tabular-nums">{num(sim.truckloads, 1)} a month</dd></div>
      </dl>
      <ul className="flex flex-col gap-2 text-xs">
        {sim.byLever.map((l) => (
          <li key={l.lever} className="grid grid-cols-[8rem_1fr_4.5rem] items-center gap-2">
            <span className="text-mu">{LEVERS.find((x) => x.id === l.lever)?.label}</span>
            <span className="h-1.5 rounded-full bg-s2">
              <span
                className={cn("block h-full rounded-full", l.perMonth >= 0 ? "bg-green" : "bg-red")}
                style={{ width: `${(Math.abs(l.perMonth) / max) * 100}%` }}
              />
            </span>
            <span className="text-right text-tx tabular-nums">{inrSigned(l.perMonth)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Five levers; the output is ₹ a month against the scope baseline, split by lever. */
export function Simulator({ className }: { className?: string }) {
  const plant = usePlant();
  const { base, params, set, reset } = useSimulator();
  return (
    <Card
      id="simulator"
      busy={plant.status === "loading"}
      title="What-if simulator"
      subtitle="Move a lever to see ₹ recovered a month against the baseline for this scope. Simulate on a fix loads its numbers here."
      actions={
        <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-chip px-3 text-sm text-mu hover:text-tx md:h-9">
          <RotateCcw aria-hidden="true" className="size-4" />
          Reset to baseline
        </button>
      }
      className={className}
    >
      {base && params ? (
        <div className="grid gap-10 lg:grid-cols-[1fr_26rem]">
          <ul className="flex flex-col gap-6">
            {LEVERS.map((l) => (
              <li key={l.id}>
                <label className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-tx">{l.label}</span>
                    <span className="text-tx tabular-nums">
                      {shown(params[l.id], l.dp, l.unit)}
                      <span className="ml-2 text-xs text-mu">now {shown(base[l.id], l.dp, l.unit)}</span>
                    </span>
                  </span>
                  <input
                    type="range"
                    min={l.min}
                    max={l.max}
                    step={l.step}
                    value={params[l.id]}
                    onChange={(e) => set({ ...params, [l.id]: Number(e.target.value) })}
                    className="h-11 w-full cursor-pointer accent-[var(--brand)] md:h-6"
                  />
                </label>
              </li>
            ))}
          </ul>
          <Outcome base={base} params={params} />
        </div>
      ) : (
        <ChartSkeleton variant="sliders" />
      )}
    </Card>
  );
}
