"use client";

import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { usePlant } from "@/components/dashboard/PlantProvider";
import { WithPlant } from "@/components/dashboard/WithPlant";
import { SHIFT_START_HOUR } from "@/lib/assumptions";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { hh, peakHour, shiftOfColumn } from "@/lib/viz";
import type { Heatmap } from "@/lib/types";

/** Column index (from 06:00) where each shift starts: dashed handover lines. */
const HANDOVER = new Set(Object.values(SHIFT_START_HOUR).map((h) => (h - SHIFT_START_HOUR.A + 24) % 24));

function story(h: Heatmap): string {
  const p = peakHour(h);
  const shift = shiftOfColumn((p.hour - SHIFT_START_HOUR.A + 24) % 24);
  const start = p.hour === SHIFT_START_HOUR[shift] ? `, the first hour of Shift ${shift}` : ` in Shift ${shift}`;
  return `Stops peak at ${hh(p.hour)}${start}: ${num(p.avg, 1)} min an hour on average, ${num(p.avg / p.overall, 1)}× the plant's usual rate.`;
}

/** Corrugator downtime by hour over the last 7 working days. Darker red is more minutes lost. */
export function HeatmapSection({ className }: { className?: string }) {
  const plant = usePlant();
  return (
    <Card
      id="heatmap"
      busy={plant.status === "loading"}
      title="When the line stops"
      subtitle="Corrugator downtime by hour over the last 7 working days. Dashed lines mark shift handovers."
      className={className}
    >
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="grid" className="h-64" />}>
        {(d) => {
          const h = d.heatmap;
          return (
            <>
              <div aria-hidden="true" className="grid grid-cols-[2.75rem_repeat(24,minmax(0,1fr))] gap-px text-2xs text-mu">
                <span />
                {h.hours.map((hour, i) => (
                  <span key={hour} className="text-center tabular-nums">
                    {i % 4 === 0 ? String(hour).padStart(2, "0") : ""}
                  </span>
                ))}
                {h.days.map((day) => (
                  <div key={day.label} className="contents">
                    <span className="self-center pr-1">{day.label}</span>
                    {day.cells.map((v, i) => (
                      <span
                        key={i}
                        title={`${day.label} ${hh(h.hours[i])}: ${num(v, 1)} min`}
                        className={cn(
                          "h-6 rounded-[2px]",
                          HANDOVER.has(i) && i > 0 && "border-l-2 border-dashed border-mu",
                          h.shift && shiftOfColumn(i) !== h.shift && "opacity-30",
                        )}
                        style={{ background: `color-mix(in oklab, var(--red) ${Math.round((v / h.max) * 100)}%, var(--s2))` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-2 text-xs text-mu">
                <span>0 min</span>
                <span className="h-2 w-24 rounded-full bg-gradient-to-r from-s2 to-red" />
                <span className="tabular-nums">{num(h.max, 0)} min an hour</span>
              </p>
              <table className="sr-only">
                <caption>Downtime minutes by day, per shift</caption>
                <tbody>
                  {h.days.map((day) => (
                    <tr key={day.label}>
                      <th scope="row">{day.label}</th>
                      {(["A", "B", "C"] as const).map((s) => (
                        <td key={s}>
                          Shift {s}: {num(day.cells.filter((_, i) => shiftOfColumn(i) === s).reduce((a, b) => a + b, 0))} min
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Insight tone="watch">{story(h)}</Insight>
            </>
          );
        }}
      </WithPlant>
    </Card>
  );
}
