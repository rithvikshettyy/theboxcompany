import { ArrowRightLeft, CircleAlert, Eye, Info } from "lucide-react";
import type { Insight } from "@/lib/planner/types";
import { cn } from "@/lib/utils";

const TONE = {
  high: { icon: CircleAlert, ink: "text-red", chip: "bg-red/10 text-red", word: "Act now" },
  medium: { icon: Eye, ink: "text-amber", chip: "bg-amber/10 text-amber", word: "Watch" },
  info: { icon: Info, ink: "text-mu", chip: "bg-s2 text-mu", word: "Note" },
} as const;

/** Recommendations read off the schedule. A move with a button can be applied in one click. */
export function PlannerInsights({ list, readOnly, onApply }: { list: Insight[]; readOnly: boolean; onApply: (i: Insight) => void }) {
  if (list.length === 0) {
    return <p className="rounded-2xl bg-s2/70 p-4 text-sm text-mu">No issues found. Every order is scheduled with time to spare and no machine is overloaded.</p>;
  }
  return (
    <ul className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-1">
      {list.map((i) => {
        const t = TONE[i.severity];
        const Icon = t.icon;
        return (
          <li key={i.id} className="flex items-start gap-3 rounded-2xl bg-s2/70 p-4">
            <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-s1", t.ink)}>
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-tx">{i.title}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-2xs", t.chip)}>{t.word}</span>
              </span>
              <span className="mt-0.5 block text-xs text-mu">{i.detail}</span>
              {i.action && !readOnly ? (
                <button
                  type="button"
                  onClick={() => onApply(i)}
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-s1 px-4 text-xs text-tx hover:bg-line md:min-h-8"
                >
                  <ArrowRightLeft aria-hidden="true" className="size-3.5" />
                  {i.action.label}
                </button>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
