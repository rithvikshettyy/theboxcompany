"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { usePlant } from "@/components/dashboard/PlantProvider";
import { WithPlant } from "@/components/dashboard/WithPlant";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { vitalFew } from "@/lib/viz";
import type { ParetoRow, Section } from "@/lib/types";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "corrugator", label: "Corrugator" },
  { id: "converting", label: "Converting" },
];

function story(rows: ParetoRow[], section: Section): string {
  const few = vitalFew(rows);
  const share = pct((few[few.length - 1]?.cumulative ?? 0) * 100, 0);
  const names = few.map((r) => r.label.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `${few.length} of ${rows.length} causes make up ${share} of ${section} downtime: ${list}. Fix these first.`;
}

/** Minutes lost a shift by cause, largest first; the causes inside the 80% line are highlighted. */
export function ParetoSection({ className }: { className?: string }) {
  const plant = usePlant();
  const [section, setSection] = useState<Section>("corrugator");

  return (
    <Card
      id="pareto"
      busy={plant.status === "loading"}
      title="Downtime causes"
      subtitle="Minutes lost a shift by cause, largest first. Highlighted causes make up the first 80%."
      actions={
        <div role="group" aria-label="Machine section" className="flex gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={section === s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "h-11 rounded-chip px-3 text-sm font-medium transition-colors duration-150 md:h-9",
                section === s.id ? "bg-brand text-bg" : "text-mu hover:text-tx",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      }
      className={className}
    >
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="hbars" className="h-64" />}>
        {(d) => {
          const rows = d.pareto[section];
          const few = new Set(vitalFew(rows).map((r) => r.id));
          const max = Math.max(...rows.map((r) => r.perShift));
          return (
            <>
              <table className="w-full text-sm">
                <caption className="sr-only">{section} downtime by cause, minutes a shift</caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Cause</th>
                    <th scope="col">Bar</th>
                    <th scope="col">Minutes a shift</th>
                    <th scope="col">Cumulative share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-line first:border-t-0">
                      <th scope="row" className="py-3 pr-4 text-left font-normal whitespace-nowrap text-tx">
                        {r.label}
                      </th>
                      <td aria-hidden="true" className="w-full py-3">
                        <div
                          className={cn("h-2 rounded-full", few.has(r.id) ? "bg-brand" : "bg-brand3")}
                          style={{ width: `${(r.perShift / max) * 100}%` }}
                        />
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap text-tx tabular-nums">{num(r.perShift)} min</td>
                      <td className="w-14 py-3 pl-2 text-right text-mu tabular-nums">{pct(r.cumulative * 100, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Insight>{story(rows, section)}</Insight>
            </>
          );
        }}
      </WithPlant>
    </Card>
  );
}
