import Link from "next/link";
import { BadgePercent, FlaskConical, Layers, PackageOpen, Truck, type LucideIcon } from "lucide-react";
import { OPS } from "@/lib/assumptions";
import { inr, num, pct } from "@/lib/format";
import { materials, orders, quality } from "@/lib/ops";
import { cn } from "@/lib/utils";

type Item = { icon: LucideIcon; title: string; sub: string; chip: string; level: "loss" | "watch"; value: string; href: string };

const CHIP = { loss: "bg-red/10 text-red", watch: "bg-amber/10 text-amber" };

function items(): Item[] {
  const q = quality();
  const m = materials();
  const o = orders();
  const out: Item[] = [];
  const fail = q.alerts.find((a) => a.level === "fail");
  if (fail) out.push({ icon: FlaskConical, title: `${q.fails} quality fails`, sub: `${fail.test} on ${fail.where.split(" · ")[1] ?? fail.where}`, chip: "Hold", level: "loss", value: fail.measured, href: "/dashboard/quality" });
  for (const g of m.short) out.push({ icon: Layers, title: `${g.name.split(",")[0]} running short`, sub: `${num(g.coverDays, 1)} days in store`, chip: "Reorder", level: "loss", value: `${num(-g.gap)} t`, href: "/dashboard/materials" });
  if (o.lowMargin[0]) out.push({ icon: BadgePercent, title: `${o.lowMargin.length} orders under ${OPS.marginFloorPct}% margin`, sub: `Worst: ${o.lowMargin[0].customer}`, chip: "Requote", level: "loss", value: pct(o.lowMargin[0].marginPct), href: "/dashboard/orders#margins" });
  const old = o.pending.filter((p) => p.days >= 4);
  if (old.length) out.push({ icon: PackageOpen, title: `${old.length} dispatches waiting 4+ days`, sub: `Oldest ${o.oldestDays} days`, chip: "Chase", level: "watch", value: inr(old.reduce((s, p) => s + p.value, 0)), href: "/dashboard/orders#aging" });
  const late = o.shipments.find((s) => s.status === "delayed");
  if (late) out.push({ icon: Truck, title: `Truck to ${late.to} delayed`, sub: `${late.customer} · ${late.vehicle}`, chip: "Delayed", level: "watch", value: `ETA ${late.eta}`, href: "/dashboard/orders#tracking" });
  return out;
}

/** What needs someone today, across quality, materials, margins and dispatch. Each row opens its view. */
export function AttentionCard({ className }: { className?: string }) {
  const list = items();
  return (
    <section aria-labelledby="attention-title" className={cn("flex flex-col gap-5 rounded-3xl bg-s1 p-5 shadow-card md:p-6", className)}>
      <header className="flex items-start justify-between gap-4">
        <h2 id="attention-title" className="text-base text-mu">Needs attention</h2>
        <span className="text-sm text-mu">{list.length} items · as of 06:00</span>
      </header>
      <ul className="flex flex-col gap-2">
        {list.map((it) => (
          <li key={it.title}>
            <Link href={it.href} className="flex items-center gap-4 rounded-2xl bg-s2/70 p-4 transition-colors duration-150 hover:bg-s2">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-s1 text-tx">
                <it.icon aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-tx">{it.title}</span>
                <span className="block truncate text-xs text-mu">{it.sub}</span>
              </span>
              <span className={cn("hidden rounded-full px-3 py-1 text-xs sm:inline-block", CHIP[it.level])}>{it.chip}</span>
              <span className="w-20 text-right text-sm text-tx tabular-nums">{it.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
