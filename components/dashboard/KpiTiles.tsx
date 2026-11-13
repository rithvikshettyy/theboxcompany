"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { Card } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { Term } from "@/components/ui/term";
import { SPARK_DAYS } from "@/lib/assumptions";
import { inr, num } from "@/lib/format";
import { PREVIOUS_LABEL } from "@/lib/story";
import { cn } from "@/lib/utils";
import { kpiTrend } from "@/lib/viz";
import type { Kpi, Scope, Status } from "@/lib/types";
import { usePlant } from "./PlantProvider";
import { useScope } from "./ScopeProvider";
import { WithPlant } from "./WithPlant";

const STATUS: Record<Status, { label: string; dot: string; ink: string }> = {
  good: { label: "On target", dot: "bg-green", ink: "text-green" },
  watch: { label: "Close", dot: "bg-amber", ink: "text-amber" },
  loss: { label: "Off target", dot: "bg-red", ink: "text-red" },
};

const value = (k: Kpi, v: number) => `${num(v, k.decimals)}${k.unit === "%" ? "%" : ""}`;
const unit = (k: Kpi) => (k.unit === "%" ? "" : ` ${k.unit}`);

function Tile({ k, scope }: { k: Kpi; scope: Scope }) {
  const s = STATUS[k.status];
  const t = kpiTrend(k);
  const Arrow = t.direction === "up" ? ArrowUpRight : t.direction === "down" ? ArrowDownRight : ArrowRight;
  return (
    <li className="flex flex-col gap-2 rounded-3xl bg-s1 p-5 shadow-card">
      <p className="flex items-center justify-between gap-2 text-sm text-mu">
        <span>{k.id === "oee" ? <Term k="oee">OEE</Term> : k.label}</span>
        <span className={cn("flex items-center gap-1.5 text-xs", s.ink)}>
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", s.dot)} />
          {s.label}
        </span>
      </p>
      <p className="text-xl text-tx tabular-nums">
        {value(k, k.value)}
        <span className="text-sm text-mu">{unit(k)}</span>
      </p>
      <p className="text-xs text-mu tabular-nums">
        Target {value(k, k.target)}
        {unit(k)}
      </p>
      <p
        className={cn(
          "flex items-center gap-1 text-xs tabular-nums",
          t.improving === null ? "text-mu" : t.improving ? "text-green" : "text-red",
        )}
      >
        <Arrow aria-hidden="true" className="size-3.5" />
        {t.direction === "flat" ? "No change" : `${t.delta > 0 ? "+" : "−"}${num(Math.abs(t.delta), k.decimals)}`}{" "}
        vs {PREVIOUS_LABEL[scope]}
      </p>
      <Sparkline values={k.spark} target={k.target} />
      <p className="text-xs text-mu tabular-nums">
        {inr(k.rupeesPerUnit)} a month {k.perUnit}
      </p>
    </li>
  );
}

/** Six KPIs, each with target, status, trend, a {SPARK_DAYS}-day line and the ₹ one unit is worth. */
export function KpiTiles({ className }: { className?: string }) {
  const plant = usePlant();
  const { scope } = useScope();
  return (
    <Card
      id="kpis"
      busy={plant.status === "loading"}
      surface={false}
      title="Shift KPIs"
      subtitle={
        <>
          <Term k="oee">OEE</Term> and the numbers behind it, each with its target, the last{" "}
          {SPARK_DAYS} working days and the ₹ one point is worth.
        </>
      }
      className={className}
    >
      <WithPlant plant={plant} fallback={<ChartSkeleton variant="tiles" />}>
        {(d) => (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {d.kpis.map((k) => (
              <Tile key={k.id} k={k} scope={scope} />
            ))}
          </ul>
        )}
      </WithPlant>
    </Card>
  );
}
