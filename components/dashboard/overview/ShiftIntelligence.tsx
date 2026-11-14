"use client";

import { useMemo } from "react";
import { RupeeFigure } from "@/components/ui/rupee-figure";
import { TARGET } from "@/lib/assumptions";
import { inr, num, pct } from "@/lib/format";
import { shiftIntel } from "@/lib/shifts";
import { cn } from "@/lib/utils";
import { useScope } from "../ScopeProvider";

const PERIOD = { today: "today", "7d": "the last 7 days", "30d": "the last 30 days" } as const;

/** Shifts A, B and C side by side for the period in view, which one trails, and the causes of the gap. */
export function ShiftIntelligence({ className }: { className?: string }) {
  const { scope } = useScope();
  const intel = useMemo(() => shiftIntel(scope), [scope]);
  const { rows, weakest, best, causes } = intel;
  const single = scope === "A" || scope === "B" || scope === "C";
  return (
    <section aria-labelledby="shifts-title" className={cn("flex flex-col gap-5 rounded-3xl bg-s1 p-5 shadow-card md:p-6", className)}>
      <header>
        <h2 id="shifts-title" className="text-base text-mu">Shift comparison</h2>
        <p className="mt-1 text-2xl text-tx">
          Shift {weakest.id}{" "}
          <span className="text-mu">
            is the weakest, {intel.oeeGap.toFixed(1)} OEE points behind Shift {best.id}
          </span>
        </p>
        <p className="mt-1 text-xs text-mu">
          {single ? "One shift has nothing to compare with, so this shows all three for today. " : ""}
          Comparing {PERIOD[intel.period]}. OEE target {TARGET.oee}%.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">OEE, speed, downtime and ₹ leaked for each shift</caption>
          <thead>
            <tr className="text-left text-xs text-mu">
              <th scope="col" className="pb-2 font-normal">Shift</th>
              <th scope="col" className="pb-2 font-normal">OEE</th>
              <th scope="col" className="pb-2 text-right font-normal">Speed</th>
              <th scope="col" className="pb-2 text-right font-normal">Downtime</th>
              <th scope="col" className="pb-2 text-right font-normal">Leaked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isWeak = r.id === weakest.id;
              return (
                <tr key={r.id} className="border-t border-line">
                  <th scope="row" className="py-3 pr-3 text-left font-normal whitespace-nowrap text-tx">
                    Shift {r.id}
                    {isWeak ? <span className="ml-2 rounded-full bg-red/10 px-2 py-0.5 text-xs text-red">Weakest</span> : null}
                    {r.id === best.id ? <span className="ml-2 rounded-full bg-green/10 px-2 py-0.5 text-xs text-green">Best</span> : null}
                  </th>
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="relative block h-1.5 w-20 rounded-full bg-s2">
                        <span className={cn("block h-full rounded-full", isWeak ? "bg-red" : "bg-brand")} style={{ width: `${Math.min(100, r.oee)}%` }} />
                      </span>
                      <span className="text-tx tabular-nums">{pct(r.oee)}</span>
                    </span>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap text-tx tabular-nums">{num(r.speed)} m/min</td>
                  <td className="py-3 text-right whitespace-nowrap text-tx tabular-nums">{num(r.downtimeMin)} min</td>
                  <td className="py-3 text-right whitespace-nowrap text-tx tabular-nums">{inr(r.leak)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm text-tx">
          Why Shift {weakest.id} trails Shift {best.id}
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {causes.map((c) => (
            <li key={c.label} className="flex items-start justify-between gap-4 rounded-2xl bg-s2/70 p-4">
              <span className="min-w-0">
                <span className="block text-sm text-tx">{c.label}</span>
                <span className="block text-xs text-mu">{c.detail}</span>
              </span>
              <span className="text-right text-sm whitespace-nowrap text-green tabular-nums">
                <RupeeFigure value={c.perMonth} signed /> <span className="text-xs text-mu">a month</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-mu">
          Each cause is what Shift {weakest.id} would gain a month by matching Shift {best.id} on that one thing. They overlap a little, so do not add them up.
        </p>
      </div>
    </section>
  );
}
