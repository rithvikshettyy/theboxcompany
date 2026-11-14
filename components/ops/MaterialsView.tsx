import { Card } from "@/components/ui/card";
import { Insight } from "@/components/ui/insight";
import { OPS } from "@/lib/assumptions";
import { inr, num, pct, wt, wtParts } from "@/lib/format";
import { materials } from "@/lib/ops";
import { FINISHED_GOODS } from "@/lib/records";
import { cn } from "@/lib/utils";
import { PageIntro, StatRow, Tag, td, th, toneFor } from "./Stats";

const when = (days: number) => (days <= 1 ? "Tomorrow" : `In ${days} days`);

/** Materials view: reel stock against the booked load, what is in store, and who supplies it. */
export function MaterialsView() {
  const m = materials();
  const max = Math.max(...m.grades.flatMap((g) => [g.tonnes + g.incoming, g.load]));
  const worst = m.short[0];
  const vendor = worst ? m.vendors.find((v) => v.grade === worst.grade) : undefined;

  return (
    <main id="main" className="grid w-full grid-cols-12 gap-4 px-5 pt-4 pb-24 md:px-8 lg:gap-6 lg:px-10">
      <PageIntro title="Materials" lede="Paper on the reel stand against the orders booked ahead, what is in store, and the mills that supply it. As of 06:00 today." />
      <StatRow
        stats={[
          { label: "Reel stock", value: wtParts(m.stock).amount, unit: wtParts(m.stock).unit, note: `${num(m.coverDays, 1)} days of booked orders · ${inr(m.stockValue)} at cost` },
          { label: "Pending order load", value: wtParts(m.load).amount, unit: wtParts(m.load).unit, note: `Paper for the next ${OPS.bookedDays} booked days` },
          {
            label: "Grades short",
            value: m.short.length,
            tone: m.short.length ? "loss" : "good",
            note: m.short.length ? m.short.map((g) => `${g.name.split(",")[0]} ${wt(-g.gap)}`).join(" · ") : "Every grade covered",
          },
          {
            label: "Starch cover",
            value: num(m.consumables[0].coverDays, 1),
            unit: "days",
            tone: toneFor(m.consumables[0].coverDays, 5, "higher", 2),
            note: `${num(m.consumables[0].onHand)} kg on hand · ${num(m.consumables[0].perDay)} kg a day`,
          },
        ]}
      />

      <Card id="cover" title="Reel stock against order load" subtitle={`Tonnes by paper grade: in store plus deliveries due within ${OPS.bookedDays} days, against what the booked orders need.`} className="col-span-12">
        <ul className="flex flex-col">
          {m.grades.map((g) => (
            <li key={g.grade} className="grid gap-x-6 gap-y-2 border-t border-line py-4 first:border-t-0 md:grid-cols-[16rem_1fr_9rem]">
              <p className="text-sm text-tx">{g.name}<span className="block text-xs text-mu tabular-nums">{g.reels} reels · {num(g.coverDays, 1)} days cover</span></p>
              <div aria-hidden="true" className="flex flex-col justify-center gap-1.5">
                <span className="flex h-2 overflow-hidden rounded-full bg-s2">
                  <span className="bg-brand" style={{ width: `${(g.tonnes / max) * 100}%` }} />
                  <span className="bg-brand3" style={{ width: `${(g.incoming / max) * 100}%` }} />
                </span>
                <span className="block h-2 rounded-full bg-amber" style={{ width: `${(g.load / max) * 100}%` }} />
              </div>
              <p className="text-sm tabular-nums md:text-right">
                <span className="text-tx">{num(g.tonnes)} + {wt(g.incoming)}</span>
                <span className="text-mu"> vs {wt(g.load)}</span>
                <span className="block">
                  <Tag tone={g.gap < 0 ? "loss" : "good"}>{g.gap < 0 ? `Short ${wt(-g.gap)}` : `Spare ${wt(g.gap)}`}</Tag>
                </span>
              </p>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mu">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand" />In store</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand3" />Arriving</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-amber" />Needed by booked orders</span>
        </p>
        {worst && vendor ? (
          <Insight tone="loss">{`${worst.name.split(",")[0]} runs out first: ${num(worst.coverDays, 1)} days in store and nothing due from ${vendor.name} for ${vendor.nextIn} days (${pct(vendor.onTimePct, 0)} on time). Order ${wt(-worst.gap)} from a second mill this week.`}</Insight>
        ) : null}
      </Card>

      <Card id="inventory" title="Stock inventory" subtitle="Everything in store this morning." className="col-span-12 xl:col-span-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <table className="w-full text-sm">
            <caption className="pb-2 text-left text-sm text-tx">Finished goods</caption>
            <thead><tr><th scope="col" className={th}>Customer</th><th scope="col" className={cn(th, "text-right")}>Pallets</th><th scope="col" className={cn(th, "text-right")}>Value</th></tr></thead>
            <tbody>
              {FINISHED_GOODS.map((f) => (
                <tr key={f.customer}><th scope="row" className={cn(td, "text-left font-normal text-tx")}>{f.customer}</th><td className={cn(td, "text-right tabular-nums")}>{f.pallets}</td><td className={cn(td, "pr-0 text-right tabular-nums")}>{inr(f.value)}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-sm">
            <caption className="pb-2 text-left text-sm text-tx">Consumables</caption>
            <thead><tr><th scope="col" className={th}>Item</th><th scope="col" className={cn(th, "text-right")}>On hand</th><th scope="col" className={cn(th, "text-right")}>Cover</th></tr></thead>
            <tbody>
              {m.consumables.map((c) => (
                <tr key={c.name}><th scope="row" className={cn(td, "text-left font-normal text-tx")}>{c.name}</th><td className={cn(td, "text-right whitespace-nowrap tabular-nums")}>{num(c.onHand)} {c.unit}</td><td className={cn(td, "pr-0 text-right")}><Tag tone={toneFor(c.coverDays, 5, "higher", 2)}>{num(c.coverDays, 1)} d</Tag></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="vendors" title="Vendors" subtitle="Paper mills and suppliers, with their record over the last 90 days." className="col-span-12 xl:col-span-6">
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr><th scope="col" className={th}>Vendor</th><th scope="col" className={cn(th, "text-right")}>Lead time</th><th scope="col" className={cn(th, "text-right")}>On time</th><th scope="col" className={cn(th, "text-right")}>Rejects</th><th scope="col" className={cn(th, "text-right")}>Next delivery</th></tr></thead>
            <tbody>
              {m.vendors.map((v) => (
                <tr key={v.name}>
                  <th scope="row" className={cn(td, "text-left font-normal")}><span className="block text-tx">{v.name}</span><span className="text-xs text-mu">{v.supplies} · {v.city}</span></th>
                  <td className={cn(td, "text-right tabular-nums")}>{v.leadDays} d</td>
                  <td className={cn(td, "text-right")}><Tag tone={toneFor(v.onTimePct, 90, "higher", 5)}>{pct(v.onTimePct, 0)}</Tag></td>
                  <td className={cn(td, "text-right tabular-nums")}>{pct(v.rejectPct)}</td>
                  <td className={cn(td, "pr-0 text-right tabular-nums")}>{when(v.nextIn)}<span className="block text-xs text-mu">{wt(v.openPoTonnes)} on order</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
