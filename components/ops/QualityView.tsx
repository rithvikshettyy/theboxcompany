import { Card } from "@/components/ui/card";
import { Insight } from "@/components/ui/insight";
import { pct } from "@/lib/format";
import { quality } from "@/lib/ops";
import { PageIntro, StatRow, Tag, toneFor } from "./Stats";

const FIRST_PASS_TARGET = 95;

/** Quality view: today's board test alerts, worst first, each with the action to take. */
export function QualityView() {
  const q = quality();
  const alerts = [...q.alerts].sort((a, b) => (a.level === b.level ? 0 : a.level === "fail" ? -1 : 1));
  return (
    <main id="main" className="grid w-full grid-cols-12 gap-4 px-5 pt-4 pb-24 md:px-8 lg:gap-6 lg:px-10">
      <PageIntro title="Quality" lede="Lab tests on board and incoming reels since 22:00 yesterday that missed or nearly missed spec." />
      <StatRow
        stats={[
          { label: "Failed tests", value: q.fails, tone: q.fails ? "loss" : "good", note: "Out of spec: hold or rework" },
          { label: "Watch", value: q.watches, tone: q.watches ? "watch" : "good", note: "In spec but close to the limit" },
          {
            label: "First-pass yield",
            value: pct(q.firstPassPct),
            tone: toneFor(q.firstPassPct, FIRST_PASS_TARGET, "higher", 3),
            progress: q.firstPassPct / FIRST_PASS_TARGET,
            note: `Target ${FIRST_PASS_TARGET}%`,
          },
          { label: "Tests run", value: q.tests, note: "Moisture, ECT, burst, bonding, warp" },
        ]}
      />
      <Card id="alerts" title="Board quality alerts" subtitle="Failures first, then results close to the limit. Each with what to do next." className="col-span-12">
        <ol className="flex flex-col">
          {alerts.map((a) => (
            <li key={`${a.time}-${a.test}`} className="grid gap-x-8 gap-y-2 border-t border-line py-5 first:border-t-0 md:grid-cols-[8rem_1fr_16rem]">
              <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-1">
                <Tag tone={a.level === "fail" ? "loss" : "watch"}>{a.level === "fail" ? "Failed" : "Watch"}</Tag>
                <span className="text-xs text-mu tabular-nums">{a.time}</span>
              </div>
              <div>
                <p className="text-base text-tx">{a.test}</p>
                <p className="text-sm text-mu">{a.where}</p>
                <p className="mt-2 text-sm text-tx">{a.action}</p>
              </div>
              <p className="text-sm tabular-nums md:text-right">
                <span className={a.level === "fail" ? "text-red" : "text-amber"}>{a.measured}</span>
                <span className="block text-xs text-mu">Spec {a.spec}</span>
              </p>
            </li>
          ))}
        </ol>
        <Insight tone="loss">
          {`${q.fails} runs failed overnight, two of them on the double backer (bonding and warp). Check steam and glue settings at the 06:00 handover before the next run starts.`}
        </Insight>
      </Card>
    </main>
  );
}
