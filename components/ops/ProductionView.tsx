"use client";

import { usePlant } from "@/components/dashboard/PlantProvider";
import { useScope } from "@/components/dashboard/ScopeProvider";
import { WithPlant } from "@/components/dashboard/WithPlant";
import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Insight } from "@/components/ui/insight";
import { Term } from "@/components/ui/term";
import { OPS, P } from "@/lib/assumptions";
import { inr, num, pct } from "@/lib/format";
import { dailyTonnes, production, type Production } from "@/lib/ops";
import { SCOPE_LABEL } from "@/lib/scope";
import { PREVIOUS_LABEL } from "@/lib/story";
import type { PlantData } from "@/lib/types";
import { DailyChart, Changeovers, WasteSplit } from "./ProductionParts";
import { PageIntro, StatRow, toneFor, type Stat } from "./Stats";

function stats(p: Production, d: PlantData, prev: string): Stat[] {
  const waste = p.trimPct + p.dryEndPct;
  return [
    {
      label: "Production",
      value: num(p.tons),
      unit: "t",
      progress: p.ofTarget,
      tone: toneFor(p.ofTarget * 100, 100, "higher", 5),
      note: `${num(p.goodM2)} m² · ${pct(p.ofTarget * 100, 0)} of ${num(p.targetTons)} t target · ${num(p.tons - p.previousTons, 1)} t vs ${prev}`,
    },
    {
      label: "Wastage",
      value: pct(waste),
      tone: toneFor(waste, p.wastageTarget, "lower", 1),
      note: `Side trim ${pct(p.trimPct)} + dry end ${pct(p.dryEndPct)} · target ${pct(p.wastageTarget)}`,
    },
    {
      label: "Avg running speed",
      value: num(p.speed),
      unit: "m/min",
      tone: toneFor(p.speed, p.speedTarget, "higher", 10),
      note: `Target ${p.speedTarget} · rated ${P.ratedSpeed} m/min`,
    },
    {
      label: "Deckle utilisation",
      value: pct(p.deckleUsePct),
      tone: toneFor(p.deckleUsePct, OPS.deckleTargetPct, "higher", 5),
      note: `Best pairing ${pct(p.deckleBestPct)} · target ${pct(OPS.deckleTargetPct, 0)} · ₹ lost to trim ${inr(d.totals.loss.trim)}`,
    },
  ];
}

/** Production view: output against target, where the waste goes, and changeover time. */
export function ProductionView() {
  const plant = usePlant();
  const { scope } = useScope();
  const label = SCOPE_LABEL[scope].long;
  return (
    <main id="main" className="grid w-full grid-cols-12 gap-4 px-5 pt-4 pb-24 md:px-8 lg:gap-6 lg:px-10">
      <PageIntro
        title={`Production · ${label}`}
        lede="Good board made against plan, the paper that never became board, and how long the line stands still between orders."
      />
      <WithPlant plant={plant} fallback={<div className="col-span-12"><ChartSkeleton variant="tiles" /></div>}>
        {(d) => {
          const p = production(d);
          const days = dailyTonnes();
          return (
            <>
              <StatRow stats={stats(p, d, PREVIOUS_LABEL[scope])} />
              <Card id="daily" title="Production against target" subtitle={`Good board a day in tonnes, last ${days.length} working days, against the daily target.`} className="col-span-12 xl:col-span-7">
                <DailyChart days={days} target={(OPS.dailyTargetM2 * OPS.boardKgPerM2) / 1000} />
              </Card>
              <Card id="waste" title="Where the waste goes" subtitle={<>Paper paid for that never became good board: side <Term k="trim">trim</Term> at the corrugator and dry-end rejects at the stacker.</>} className="col-span-12 xl:col-span-5">
                <WasteSplit p={p} d={d} />
              </Card>
              <Card id="changeovers" title="Changeover time" subtitle="Average minutes the line stands still per change, against target." className="col-span-12">
                <Changeovers p={p} />
                <Insight tone={p.psChangeMin > OPS.psChangeTargetMin ? "loss" : "good"}>
                  {`Printer-Slotter changeovers take ${num(p.psChangeMin)} min each against ${num(OPS.psChangeTargetMin, 1)}. At ${OPS.psChangeoversPerShift} a shift that is ${num((p.psChangeMin - OPS.psChangeTargetMin) * OPS.psChangeoversPerShift)} min of the constraint lost every shift.`}
                </Insight>
              </Card>
            </>
          );
        }}
      </WithPlant>
    </main>
  );
}
