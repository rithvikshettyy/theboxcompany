"use client";

import { useEffect } from "react";
import { inr, num, pct } from "@/lib/format";
import { SCOPE_LABEL } from "@/lib/scope";
import { setCopilotContext } from "@/lib/copilot/clientStore";
import { usePlant } from "./PlantProvider";
import { useScope } from "./ScopeProvider";

/** Hands the Copilot the numbers on screen: the plant's scope, ₹ leak, KPIs, top stop cause and top fix. Real values only. */
export function CopilotContextSync() {
  const plant = usePlant();
  const { scope } = useScope();
  const data = plant.status === "ready" ? plant.data : null;

  useEffect(() => {
    if (!data) return;
    const kpi = (id: string) => data.kpis.find((k) => k.id === id);
    const line = (id: string, text: string) => {
      const k = kpi(id);
      return k ? `${text}: ${num(k.value, k.decimals)} ${k.unit} (target ${num(k.target, k.decimals)})` : null;
    };
    const top = data.pareto.corrugator[0];
    const lines = [
      `Period: ${SCOPE_LABEL[scope].long} (${data.shifts} shifts)`,
      `Profit leak: ${inr(data.totals.leak)} of ${inr(data.totals.potential)} possible`,
      line("oee", "OEE"),
      line("availability", "Availability"),
      line("speed", "Running speed"),
      line("trimPct", "Trim"),
      line("rejectPct", "Rejects"),
      top ? `Biggest corrugator stop cause: ${top.label}, ${num(top.perShift, 1)} min per shift (${pct(top.share * 100, 0)} of corrugator downtime)` : null,
      data.recs[0] ? `Top fix: ${data.recs[0].title}` : null,
    ].filter((l): l is string => l !== null);
    setCopilotContext("plant", { label: `Plant dashboard, ${SCOPE_LABEL[scope].long}`, lines });
    return () => setCopilotContext("plant", null);
  }, [data, scope]);

  return null;
}
