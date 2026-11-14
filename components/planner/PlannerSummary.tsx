import { CircleAlert, CircleCheck, Eye } from "lucide-react";
import { num, pct } from "@/lib/format";
import { fmtDuration, fmtH } from "@/lib/planner/calendar";
import type { Metrics } from "@/lib/planner/types";
import { cn } from "@/lib/utils";

type Tone = "good" | "watch" | "loss" | "neutral";
const INK: Record<Tone, string> = { good: "text-green", watch: "text-amber", loss: "text-red", neutral: "text-tx" };
const ICON = { good: CircleCheck, watch: Eye, loss: CircleAlert, neutral: null } as const;
const WORD = { good: "Good", watch: "Watch", loss: "Problem", neutral: "" } as const;
/** Utilization above this is tight; above 100% is impossible, so it reads as a problem elsewhere. */
const TIGHT = 0.9;
const LOW = 0.4;

/** The six numbers a planner reads first. */
export function PlannerSummary({ m, planStart }: { m: Metrics; planStart: number }) {
  const tiles: { label: string; value: string; note: string; tone: Tone }[] = [
    { label: "Orders scheduled", value: `${m.scheduled} of ${m.orders}`, note: m.unscheduled ? `${m.unscheduled} could not be scheduled` : "Every order has a machine and a slot", tone: m.unscheduled ? "loss" : "good" },
    { label: "Planned production", value: `${num(m.plannedBoxes)} boxes`, note: m.scheduled ? `Done ${fmtH(planStart, m.finishH)}` : "Nothing planned yet", tone: "neutral" },
    { label: "Machine utilization", value: pct(m.utilization * 100, 0), note: "Busy share of open hours until the last deadline", tone: m.utilization > TIGHT ? "watch" : m.utilization < LOW && m.orders > 0 ? "watch" : "neutral" },
    { label: "Changeover time", value: fmtDuration(m.changeoverH), note: "Grade, flute, print and size changes", tone: "neutral" },
    { label: "Orders at risk", value: String(m.atRisk + m.late), note: `${m.late} late · ${m.atRisk} with under 4 h to spare`, tone: m.late ? "loss" : m.atRisk ? "watch" : "good" },
    { label: "On-time delivery", value: pct(m.onTimeRate * 100, 0), note: "Estimated, from this schedule", tone: m.onTimeRate >= 0.95 ? "good" : m.onTimeRate >= 0.8 ? "watch" : "loss" },
  ];
  return (
    <ul className="col-span-12 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <li key={t.label} className="flex flex-col gap-2 rounded-3xl bg-s1 p-5 shadow-card">
            <p className="flex items-center justify-between gap-2 text-sm text-mu">
              {t.label}
              {Icon ? <span className={cn("flex items-center gap-1 text-xs", INK[t.tone])}><Icon aria-hidden="true" className="size-3.5" />{WORD[t.tone]}</span> : null}
            </p>
            <p className="text-xl text-tx tabular-nums">{t.value}</p>
            <p className="text-xs text-mu">{t.note}</p>
          </li>
        );
      })}
    </ul>
  );
}
