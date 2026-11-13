"use client";

import Link from "next/link";
import { Factory, Layers, Scissors, Truck, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OPS } from "@/lib/assumptions";
import { num, pct } from "@/lib/format";
import { materials, orders, production } from "@/lib/ops";
import { cn } from "@/lib/utils";
import type { PlantData } from "@/lib/types";
import { usePlant } from "../PlantProvider";

type Focus = {
  title: [string, string];
  icon: LucideIcon;
  value: string;
  of: string;
  status: string;
  good: boolean;
  rest: string;
  href: string;
};

function focus(d: PlantData): Focus[] {
  const p = production(d);
  const m = materials();
  const o = orders();
  const waste = p.trimPct + p.dryEndPct;
  return [
    { title: ["Production", "& target"], icon: Factory, value: `${num(p.tons)} t`, of: `${num(p.targetTons)} t`, good: p.ofTarget >= 0.95, status: `${pct(p.ofTarget * 100, 0)} of plan`, rest: `${num(p.goodM2)} m²`, href: "/dashboard/production" },
    { title: ["Wastage", "trim + dry end"], icon: Scissors, value: pct(waste), of: pct(OPS.wastageTargetPct), good: waste <= OPS.wastageTargetPct, status: `${pct(waste - OPS.wastageTargetPct)} over`, rest: `trim ${pct(p.trimPct)}`, href: "/dashboard/production#waste" },
    { title: ["Reel stock", "& order load"], icon: Layers, value: `${num(m.stock)} t`, of: `${num(m.load)} t`, good: m.short.length === 0, status: m.short.length ? `${m.short.length} grade short` : "All grades covered", rest: `${num(m.coverDays, 1)} days cover`, href: "/dashboard/materials" },
    { title: ["Dispatch", "readiness"], icon: Truck, value: `${o.readyCount}`, of: `${o.dispatch.length} orders`, good: o.readyPct >= 90, status: `${pct(o.readyPct, 0)} ready`, rest: "due today", href: "/dashboard/orders" },
  ];
}

/** Four focus cards, two by two: value against target, with a status line in words and colour. */
export function FocusCards({ className }: { className?: string }) {
  const plant = usePlant();
  return (
    <ul className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      {plant.status === "ready"
        ? focus(plant.data).map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="flex h-full flex-col gap-6 rounded-3xl bg-s1 p-5 shadow-card transition-shadow duration-150 hover:shadow-lg md:p-6">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-base leading-snug text-tx">
                    {f.title[0]}
                    <span className="block">{f.title[1]}</span>
                  </span>
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-s2 text-tx">
                    <f.icon aria-hidden="true" className="size-4" />
                  </span>
                </span>
                <span className="mt-auto flex flex-col gap-1">
                  <span className="text-xl whitespace-nowrap text-tx tabular-nums">
                    {f.value} <span className="text-mu">/ {f.of}</span>
                  </span>
                  <span className="text-xs tabular-nums">
                    <span className={f.good ? "text-green" : "text-red"}>{f.status}</span>
                    <span className="text-mu"> · {f.rest}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))
        : Array.from({ length: 4 }, (_, i) => (
            <li key={i} aria-hidden="true" className="flex h-44 flex-col justify-between rounded-3xl bg-s1 p-6 shadow-card">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-3/4" />
            </li>
          ))}
    </ul>
  );
}
