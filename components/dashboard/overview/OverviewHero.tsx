"use client";

import { useSyncExternalStore } from "react";
import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleCheck, ListChecks, SlidersHorizontal } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { inr, pct, wt } from "@/lib/format";
import { production } from "@/lib/ops";
import { greetingFor, plantClock } from "@/lib/plantTime";
import { SCOPE_LABEL } from "@/lib/scope";
import { leakStory } from "@/lib/story";
import { usePlant } from "../PlantProvider";
import { useScope } from "../ScopeProvider";
import { useSimulator } from "../SimulatorProvider";

/** Welcome line from the plant clock. Rendered after mount so server and client markup match. */
function Welcome({ name }: { name: string }) {
  const greeting = useSyncExternalStore(
    () => () => {},
    () => greetingFor(plantClock(Date.now()).hour),
    () => null,
  );
  return (
    <p className="min-h-6 text-lg font-medium text-tx">
      {greeting ? `${greeting}, welcome ${name}!` : null}
    </p>
  );
}

/** The plan card on the right of the hero: tinted glass, with two faded cards stacked behind. */
function PlanCard({ tons, target, ofTarget, shifts }: { tons: number; target: number; ofTarget: number; shifts: number }) {
  const onTrack = ofTarget >= 0.95;
  return (
    <div className="relative w-full max-w-md lg:ml-auto">
      <div aria-hidden="true" className="absolute inset-x-6 -top-4 h-full rounded-3xl bg-white/10" />
      <div aria-hidden="true" className="absolute inset-x-3 -top-2 h-full rounded-3xl bg-white/15" />
      <div className="relative flex flex-col gap-4 rounded-3xl border border-white/30 bg-[color-mix(in_srgb,var(--night)_28%,transparent)] p-6 backdrop-blur-md">
        <p className="flex items-baseline justify-between gap-4 text-sm">
          <span className="flex items-baseline gap-3">
            <span className="font-medium tracking-wide text-tx uppercase">Today&apos;s plan</span>
            <span className="text-mu tabular-nums">
              {shifts} {shifts === 1 ? "shift" : "shifts"}
            </span>
          </span>
          <span className="text-xl text-tx tabular-nums">{pct(ofTarget * 100, 0)}</span>
        </p>
        <p className="text-center text-2xl text-tx tabular-nums">
          {wt(tons)} <span className="text-mu">/ {wt(target)}</span>
        </p>
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs text-tx">
          {onTrack ? <CircleCheck aria-hidden="true" className="size-3.5" /> : <CircleAlert aria-hidden="true" className="size-3.5" />}
          {onTrack ? "On track" : `${wt(target - tons)} behind plan`}
        </p>
      </div>
    </div>
  );
}

/** Blue-sky hero: the ₹ leak as the headline, two actions, and the production plan card. */
export function OverviewHero({ className }: { className?: string }) {
  const plant = usePlant();
  const { scope } = useScope();
  const { apply } = useSimulator();
  const label = SCOPE_LABEL[scope].long;

  if (plant.status === "error") {
    return (
      <section className={className}>
        <ErrorState message={plant.message} onRetry={plant.retry} />
      </section>
    );
  }
  if (plant.status !== "ready") {
    return (
      <section aria-busy="true" className={className}>
        <Skeleton className="h-4 w-64 bg-white/20" />
        <Skeleton className="mt-4 h-12 w-80 bg-white/20" />
        <span className="sr-only">Loading the ₹ leak for {label}</span>
      </section>
    );
  }
  const d = plant.data;
  const story = leakStory(d);
  const p = production(d);
  const top = d.recs[0];
  const Arrow = story.worse ? ArrowUpRight : ArrowDownRight;

  return (
    <section aria-labelledby="hero-title" className={className}>
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <Welcome name="Rithvik" />
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-mu">
            Profit leak · {label}
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Arrow aria-hidden="true" className="size-3.5" />
              {inr(Math.abs(story.delta))} {story.comparison}
            </span>
          </p>
          <h1 id="hero-title" className="text-2xl font-medium tracking-tight text-tx tabular-nums md:text-3xl">
            {inr(d.totals.leak)} leaked
          </h1>
          <div className="flex flex-wrap gap-3 pt-2">
            {top ? (
              <button
                type="button"
                onClick={() => {
                  apply(top.preset);
                  document.getElementById("simulator")?.scrollIntoView({ block: "start" });
                }}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-night px-6 text-sm font-medium text-paper transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--night)_85%,white)]"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Simulate top fix
              </button>
            ) : null}
            <a
              href="#fix"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-sm font-medium text-night transition-colors duration-150 hover:bg-white"
            >
              <ListChecks aria-hidden="true" className="size-4" />
              See all {d.recs.length} fixes
            </a>
          </div>
        </div>
        <PlanCard tons={p.tons} target={p.targetTons} ofTarget={p.ofTarget} shifts={d.shifts} />
      </div>
    </section>
  );
}
