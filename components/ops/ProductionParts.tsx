import { Insight } from "@/components/ui/insight";
import { OPS } from "@/lib/assumptions";
import { inr, num, pct } from "@/lib/format";
import type { Production } from "@/lib/ops";
import { cn } from "@/lib/utils";
import type { PlantData } from "@/lib/types";
import { Tag, toneFor } from "./Stats";

/** Daily good tonnes as bars from zero, the target as a dashed line, labels on the bars. */
export function DailyChart({ days, target }: { days: { label: string; tons: number }[]; target: number }) {
  const top = Math.max(target, ...days.map((d) => d.tons)) * 1.1;
  const hit = days.filter((d) => d.tons >= target).length;
  const avg = days.reduce((s, d) => s + d.tons, 0) / days.length;
  return (
    <>
      <div className="relative h-56">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 border-t-2 border-dashed border-mu"
          style={{ bottom: `${(target / top) * 100}%` }}
        >
          <span className="absolute -top-5 right-0 text-xs text-mu tabular-nums">Target {num(target)} t</span>
        </span>
        <ol className="flex h-full items-end gap-1 sm:gap-2">
          {days.map((d) => (
            <li key={d.label} className="flex h-full flex-1 flex-col justify-end">
              <span
                title={`${d.label}: ${num(d.tons, 1)} t`}
                className={cn("block rounded-t-sm", d.tons >= target ? "bg-green" : "bg-brand")}
                style={{ height: `${(d.tons / top) * 100}%` }}
              />
            </li>
          ))}
        </ol>
      </div>
      <ol aria-hidden="true" className="flex gap-1 text-center text-2xs text-mu sm:gap-2">
        {days.map((d, i) => (
          <li key={d.label} className="flex-1 truncate">
            {i % 2 === days.length % 2 || d.label === "Today" ? d.label : ""}
          </li>
        ))}
      </ol>
      <table className="sr-only">
        <caption>Good board by day, tonnes</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{num(d.tons, 1)} t</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Insight tone={hit === 0 ? "loss" : "watch"}>
        {`The plant hit its ${num(target)} t target on ${hit} of the last ${days.length} days, averaging ${num(avg)} t: ${num(target - avg)} t a day short.`}
      </Insight>
    </>
  );
}

/** Side trim and dry end side by side: share of gross board, tonnes and ₹. */
export function WasteSplit({ p, d }: { p: Production; d: PlantData }) {
  const rows = [
    { label: "Side trim", note: "Cut off at the slitter", pctValue: p.trimPct, tons: p.trimTons, rupees: d.totals.loss.trim },
    { label: "Dry end", note: "Rejected at the stacker", pctValue: p.dryEndPct, tons: p.dryEndTons, rupees: d.totals.loss.rejects },
  ];
  const total = p.trimPct + p.dryEndPct;
  return (
    <>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-line py-4 first:border-t-0">
            <p className="text-base text-tx">
              {r.label}
              <span className="block text-xs text-mu">{r.note}</span>
            </p>
            <p className="text-right text-xl text-tx tabular-nums">{pct(r.pctValue)}</p>
            <span aria-hidden="true" className="col-span-2 block h-1.5 rounded-full bg-s2">
              <span className="block h-full rounded-full bg-red" style={{ width: `${(r.pctValue / total) * 100}%` }} />
            </span>
            <p className="col-span-2 text-xs text-mu tabular-nums">
              {num(r.tons, 1)} t of board · {inr(r.rupees)} lost
            </p>
          </li>
        ))}
      </ul>
      <Insight tone={total > p.wastageTarget ? "loss" : "good"}>
        {`Total waste is ${pct(total)} against a ${pct(p.wastageTarget)} target. Side trim is ${pct((p.trimPct / total) * 100, 0)} of it, so the deckle plan is the bigger lever.`}
      </Insight>
    </>
  );
}

/** Corrugator order change and Printer-Slotter changeover against target. */
export function Changeovers({ p }: { p: Production }) {
  const rows = [
    { label: "Corrugator order change", each: p.orderChangeMin, target: OPS.orderChangeTargetMin, perShift: OPS.orderChangesPerShift },
    { label: "Printer-Slotter changeover", each: p.psChangeMin, target: OPS.psChangeTargetMin, perShift: OPS.psChangeoversPerShift },
  ];
  return (
    <ul className="grid gap-x-10 gap-y-6 md:grid-cols-2">
      {rows.map((r) => {
        const tone = toneFor(r.each, r.target, "lower", r.target * 0.25);
        return (
          <li key={r.label} className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="flex justify-between gap-3 text-sm text-mu">
              {r.label}
              <Tag tone={tone}>{tone === "good" ? "On target" : tone === "watch" ? "Close" : "Slow"}</Tag>
            </p>
            <p className="text-xl text-tx tabular-nums">
              {num(r.each, 1)} <span className="text-base text-mu">min each</span>
            </p>
            <p className="text-xs text-mu tabular-nums">
              Target {num(r.target, 1)} min · about {r.perShift} a shift · {num(r.each * r.perShift)} min a shift in all
            </p>
          </li>
        );
      })}
    </ul>
  );
}
