"use client";

import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { usePlant } from "@/components/dashboard/PlantProvider";
import { WithPlant } from "@/components/dashboard/WithPlant";
import { inr, num, pct } from "@/lib/format";
import { leakStory } from "@/lib/story";
import { cn } from "@/lib/utils";
import { waterfallBars } from "@/lib/viz";
import type { WaterfallStep } from "@/lib/types";

/** Where each loss bar leads: the section that explains it. */
const CAUSE: Partial<Record<WaterfallStep["key"], { href: string; name: string }>> = {
  downtime: { href: "#heatmap", name: "when the line stops" },
  slow: { href: "#line", name: "line flow" },
  trim: { href: "#trim", name: "the deckle planner" },
  rejects: { href: "#kpis", name: "the KPIs" },
};

/** Rated capacity down to good board in ₹: each loss floats below the running total. */
export function WaterfallSection({ className }: { className?: string }) {
  const plant = usePlant();
  return (
    <Card
      id="waterfall"
      busy={plant.status === "loading"}
      title="Where the money went"
      subtitle="Rated capacity down to good board, in ₹. Click a loss to see its cause."
      className={className}
    >
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="bars" className="h-64" />}>
        {(d) => {
          const bars = waterfallBars(d.waterfall);
          return (
            <>
              <div className="grid h-72 grid-cols-6 gap-2 pt-8 sm:gap-4">
                {bars.map((b) => {
                  const cause = CAUSE[b.key];
                  const bar = (
                    <span
                      className={cn(
                        "absolute inset-x-0 rounded-t-sm",
                        b.kind === "loss" ? "bg-red" : b.key === "earned" ? "bg-brand2" : "bg-brand",
                      )}
                      style={{ bottom: `${b.from * 100}%`, height: `${(b.to - b.from) * 100}%` }}
                    />
                  );
                  return (
                    <div key={b.key} className="relative h-full">
                      <span
                        className="absolute inset-x-0 mb-1 text-center text-2xs whitespace-nowrap text-tx tabular-nums sm:text-xs"
                        style={{ bottom: `${b.to * 100}%` }}
                      >
                        {b.kind === "loss" ? "−" : ""}
                        {inr(b.rupees)}
                      </span>
                      {cause ? (
                        <a
                          href={cause.href}
                          aria-label={`${b.label}: ${inr(b.rupees)} lost, ${pct(b.share * 100)} of rated. Go to ${cause.name}.`}
                          className="absolute inset-0 block rounded-t-sm hover:opacity-80"
                        >
                          {bar}
                        </a>
                      ) : (
                        bar
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-6 gap-2 border-t border-line pt-2 sm:gap-4">
                {bars.map((b) => (
                  <p key={b.key} className="text-center text-2xs leading-tight text-mu sm:text-xs">
                    <span className="block text-tx">{b.label}</span>
                    <span className="tabular-nums">{pct(b.share * 100, 0)}</span>
                  </p>
                ))}
              </div>
              <table className="sr-only">
                <caption>Rated capacity to good board, in ₹ and m²</caption>
                <tbody>
                  {d.waterfall.map((s) => (
                    <tr key={s.key}>
                      <th scope="row">{s.label}</th>
                      <td>{inr(s.rupees)}</td>
                      <td>{num(s.m2)} m²</td>
                      <td>{pct(s.share * 100)} of rated</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Insight tone="loss">{leakStory(d).lede}</Insight>
            </>
          );
        }}
      </WithPlant>
    </Card>
  );
}
