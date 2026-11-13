import { Card } from "@/components/ui/card";
import { Insight } from "@/components/ui/insight";
import { OPS } from "@/lib/assumptions";
import { inr, num, pct } from "@/lib/format";
import { orders } from "@/lib/ops";
import { STAGES } from "@/lib/records";
import { cn } from "@/lib/utils";
import { PageIntro, StatRow, Tag, td, th, toneFor } from "./Stats";

const SHIP: Record<string, { tone: "good" | "watch" | "loss"; label: string }> = {
  delivered: { tone: "good", label: "Delivered" },
  "on-time": { tone: "good", label: "On time" },
  delayed: { tone: "loss", label: "Delayed" },
};

/** Orders view: what ships today, what is waiting and for how long, trucks on the road, thin margins. */
export function OrdersView() {
  const o = orders();
  const late = o.shipments.filter((s) => s.status === "delayed").length;
  const onRoad = o.shipments.filter((s) => s.status !== "delivered").length;
  const old = o.aging.filter((b) => b.min >= 4);
  const maxValue = Math.max(...o.aging.map((b) => b.value));

  return (
    <main id="main" className="grid w-full grid-cols-12 gap-4 px-5 pt-4 pb-24 md:px-8 lg:gap-6 lg:px-10">
      <PageIntro title="Orders and dispatch" lede="What leaves today, what is waiting in the warehouse, trucks on the road, and orders that barely pay. As of 06:00 today." />
      <StatRow
        stats={[
          { label: "Dispatch readiness", value: pct(o.readyPct, 0), progress: o.readyPct / 100, tone: toneFor(o.readyPct, 90, "higher", 20), note: `${o.readyCount} of ${o.dispatch.length} orders due today are packed or loaded` },
          { label: "Pending dispatch", value: inr(o.pendingValue), tone: o.oldestDays > 7 ? "loss" : "watch", note: `${o.pending.length} orders · oldest ${o.oldestDays} days` },
          { label: "Trucks on the road", value: onRoad, tone: late ? "watch" : "good", note: late ? `${late} delayed` : "All on time" },
          { label: "Low-margin orders", value: o.lowMargin.length, tone: o.lowMargin.length ? "loss" : "good", note: `Below the ${OPS.marginFloorPct}% margin floor` },
        ]}
      />

      <Card id="ready" title="Dispatch readiness" subtitle="Orders due out today and how far each has got." className="col-span-12 xl:col-span-7">
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[32rem] text-sm">
            <thead><tr><th scope="col" className={th}>Order</th>{STAGES.map((s) => <th key={s.id} scope="col" className={cn(th, "text-center")}>{s.label}</th>)}</tr></thead>
            <tbody>
              {o.dispatch.map((d) => {
                const reached = d.stage ? STAGES.findIndex((s) => s.id === d.stage) : -1;
                return (
                  <tr key={d.order}>
                    <th scope="row" className={cn(td, "text-left font-normal")}><span className="block text-tx">{d.customer}</span><span className="text-xs text-mu tabular-nums">{d.order} · {d.pallets} pallets</span></th>
                    {STAGES.map((s, i) => (
                      <td key={s.id} className={cn(td, "relative text-center")}>
                        <span aria-hidden="true" className={cn("inline-block size-3 rounded-full", i <= reached ? "bg-green" : "border border-line2")} />
                        <span className="sr-only">{i <= reached ? "Done" : "Not yet"}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Insight tone="watch">{`${o.dispatch.length - o.readyCount} orders are not packed yet. ${o.dispatch.filter((d) => d.stage === null).map((d) => d.customer).join(", ")} is still on the line.`}</Insight>
      </Card>

      <Card id="aging" title="Pending dispatch age" subtitle="Made and invoiced, not yet shipped. Older stock ties up cash and floor space." className="col-span-12 xl:col-span-5">
        <ul className="flex flex-col gap-3">
          {o.aging.map((b) => (
            <li key={b.label} className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3 text-sm">
              <span className="text-mu">{b.label}</span>
              <span aria-hidden="true" className="h-2 rounded-full bg-s2"><span className={cn("block h-full rounded-full", b.min >= 8 ? "bg-red" : b.min >= 4 ? "bg-amber" : "bg-brand")} style={{ width: `${(b.value / maxValue) * 100}%` }} /></span>
              <span className="text-right text-tx tabular-nums">{inr(b.value)}<span className="block text-xs text-mu">{b.count} orders</span></span>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col text-sm">
          {o.pending.filter((p) => p.days >= 4).map((p) => (
            <li key={p.order} className="flex justify-between gap-4 border-t border-line py-2.5"><span><span className="text-tx">{p.customer}</span><span className="block text-xs text-mu">{p.reason}</span></span><span className="text-right text-tx tabular-nums">{p.days} days</span></li>
          ))}
        </ul>
        <Insight tone="loss">{`${inr(old.reduce((s, b) => s + b.value, 0))} has waited 4 days or more. Chase the two holds and the unpaid order before more stock piles up.`}</Insight>
      </Card>

      <Card id="tracking" title="Tracking" subtitle="Trucks that left since last night." className="col-span-12 xl:col-span-7">
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[32rem] text-sm">
            <thead><tr><th scope="col" className={th}>Truck</th><th scope="col" className={th}>Customer</th><th scope="col" className={cn(th, "text-right")}>Left</th><th scope="col" className={cn(th, "text-right")}>ETA</th><th scope="col" className={cn(th, "pl-4")}>Status</th></tr></thead>
            <tbody>
              {o.shipments.map((s) => (
                <tr key={s.vehicle}>
                  <th scope="row" className={cn(td, "text-left font-normal whitespace-nowrap text-tx tabular-nums")}>{s.vehicle}</th>
                  <td className={td}><span className="text-tx">{s.customer}</span><span className="block text-xs text-mu">{s.to}</span></td>
                  <td className={cn(td, "text-right tabular-nums")}>{s.left}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{s.eta}</td>
                  <td className={cn(td, "pr-0 pl-4")}><Tag tone={SHIP[s.status].tone}>{SHIP[s.status].label}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="margins" title="Low-margin warning" subtitle={`Today's orders by margin, thinnest first. Below ${OPS.marginFloorPct}% is flagged.`} className="col-span-12 xl:col-span-5">
        <ul className="flex flex-col text-sm">
          {o.margins.slice(0, 6).map((m) => (
            <li key={m.id} className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-line py-2.5 first:border-t-0">
              <span><span className="text-tx">{m.customer}</span><span className="block text-xs text-mu tabular-nums">{m.id} · ₹{num(m.price, 2)} a box, costs ₹{num(m.cost, 2)}</span>{m.note ? <span className="block text-xs text-mu">{m.note}</span> : null}</span>
              <span className="text-right"><Tag tone={m.marginPct < OPS.marginFloorPct ? "loss" : "good"}>{pct(m.marginPct)}</Tag></span>
            </li>
          ))}
        </ul>
        {o.lowMargin[0] ? (
          <Insight tone="loss">{`${o.lowMargin.length} orders earn under ${OPS.marginFloorPct}%. Requote ${o.lowMargin[0].customer} first at ${pct(o.lowMargin[0].marginPct)}${o.lowMargin[0].note ? `: ${o.lowMargin[0].note.toLowerCase()}` : ""}.`}</Insight>
        ) : (
          <Insight tone="good">{`Every order today earns at least ${OPS.marginFloorPct}%.`}</Insight>
        )}
      </Card>
    </main>
  );
}
