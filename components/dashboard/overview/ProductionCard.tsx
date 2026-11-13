"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OPS, SPARK_DAYS } from "@/lib/assumptions";
import { num, pct } from "@/lib/format";
import { dailyTonnes } from "@/lib/ops";
import { cn } from "@/lib/utils";
import { usePlant } from "../PlantProvider";

const TARGET_T = (OPS.dailyTargetM2 * OPS.boardKgPerM2) / 1000;

/**
 * Daily good board as thin bars from zero, today in dark with its figures in a callout. The target
 * is a dashed rule; the axis is labelled so no number lives only in a tooltip.
 */
export function ProductionCard({ className }: { className?: string }) {
  const plant = usePlant();
  const days = dailyTonnes(SPARK_DAYS);
  const today = days[days.length - 1];
  const top = Math.ceil((Math.max(TARGET_T, ...days.map((d) => d.tons)) * 1.15) / 50) * 50;
  const ticks = [top / 4, top / 2, (3 * top) / 4, top];
  const avg = days.reduce((s, d) => s + d.tons, 0) / days.length;

  return (
    <section aria-labelledby="prod-title" className={cn("flex flex-col gap-4 rounded-3xl bg-s1 p-5 shadow-card md:p-6", className)}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 id="prod-title" className="text-base text-mu">Production overview</h2>
          <p className="mt-1 text-xl text-tx tabular-nums">
            {num(today.tons)} t <span className="text-mu">made today</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 items-center rounded-full bg-s2 px-4 text-sm text-tx">Last {SPARK_DAYS} days</span>
          <Link href="/dashboard/production" aria-label="Open the production view" className="inline-flex size-11 items-center justify-center rounded-full bg-s2 text-tx hover:bg-line">
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </header>

      {plant.status === "ready" ? (
        <div className="grid grid-cols-[2.5rem_1fr] gap-2">
          <ol aria-hidden="true" className="relative h-56 text-2xs text-mu tabular-nums">
            {ticks.map((t) => (
              <li key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{num(t)} t</li>
            ))}
          </ol>
          <div className="relative h-56">
            <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-mu2" style={{ bottom: `${(TARGET_T / top) * 100}%` }} />
            <ol className="flex h-full items-end justify-between gap-1">
              {days.map((d, i) => {
                const isToday = i === days.length - 1;
                return (
                  <li key={d.label} className="relative flex h-full flex-1 items-end justify-center">
                    <span className={cn("w-1 rounded-full sm:w-1.5", isToday ? "bg-night" : "bg-line2")} style={{ height: `${(d.tons / top) * 100}%` }} />
                    {isToday ? (
                      <span className="absolute right-0 z-10 w-36 rounded-2xl bg-night p-3 text-paper shadow-card" style={{ bottom: `calc(${(d.tons / top) * 100}% + 0.75rem)` }}>
                        <span className="inline-block rounded-full bg-paper px-2 py-0.5 text-2xs text-night">{pct((d.tons / TARGET_T) * 100, 0)} of target</span>
                        <span className="mt-2 block text-base tabular-nums">{num(d.tons)} t made</span>
                        <span className="block text-xs opacity-80">Today, target {num(TARGET_T)} t</span>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
          <span />
          <ol aria-hidden="true" className="flex justify-between gap-1 text-2xs text-mu">
            {days.map((d, i) => (
              <li key={d.label} className="flex-1 text-center">{i % 3 === 0 || i === days.length - 1 ? d.label : ""}</li>
            ))}
          </ol>
        </div>
      ) : (
        <Skeleton className="h-56 w-full" />
      )}
      <p className="text-sm text-mu tabular-nums">
        Averaging {num(avg)} t a day against a {num(TARGET_T)} t target, the dashed line: {num(TARGET_T - avg)} t short a day.
      </p>
      <table className="sr-only">
        <caption>Good board by day, tonnes</caption>
        <tbody>{days.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{num(d.tons, 1)} t</td></tr>)}</tbody>
      </table>
    </section>
  );
}
