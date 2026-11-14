"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageIntro } from "@/components/ops/Stats";
import { setCopilotContext } from "@/lib/copilot/clientStore";
import { fmtDuration, fmtH, fmtMs, fromInputValue, toInputValue } from "@/lib/planner/calendar";
import { schedule } from "@/lib/planner/engine";
import { insights } from "@/lib/planner/insights";
import { metrics } from "@/lib/planner/metrics";
import { indexAt, moveInSequences, nudge, sequencesOf, suggestedIndex } from "@/lib/planner/moves";
import { incompatibility } from "@/lib/planner/rules";
import { buildInputs } from "@/lib/planner/sample";
import { planner, usePlannerState, type PlannerState } from "@/lib/planner/store";
import type { Insight, PlannerOrder } from "@/lib/planner/types";
import { compare, isActive, NO_SCENARIO, type Scenario } from "@/lib/planner/whatif";
import { OrderDetail } from "./OrderDetail";
import { OrderForm } from "./OrderForm";
import { PlannerInsights } from "./PlannerInsights";
import { PlannerSummary } from "./PlannerSummary";
import { Timeline } from "./Timeline";
import { WhatIfPanel } from "./WhatIfPanel";

const ID_PREFIX = "PL-";
const FIRST_ID = 101;

/** The next free order id in the PL-nnn series. */
function nextId(ids: string[]): string {
  const used = ids.map((i) => (i.startsWith(ID_PREFIX) ? Number(i.slice(ID_PREFIX.length)) : NaN)).filter(Number.isFinite);
  return `${ID_PREFIX}${Math.max(FIRST_ID - 1, ...used) + 1}`;
}

type Form = { mode: "new" } | { mode: "edit"; id: string } | null;

function Planner({ state }: { state: PlannerState }) {
  const base = useMemo(() => buildInputs(state.planStart, state.orders), [state.planStart, state.orders]);
  const [scenario, setScenario] = useState<Scenario>(NO_SCENARIO);
  const [onTimeline, setOnTimeline] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [notice, setNotice] = useState("");

  const cmp = useMemo(() => (isActive(scenario) ? compare(base, scenario) : null), [base, scenario]);
  const viewing = onTimeline && cmp ? cmp : null;
  const inputs = viewing ? viewing.inputs : base;
  const plan = useMemo(() => (viewing ? viewing.scenario : schedule(base, { sequences: state.manual ?? undefined })), [viewing, base, state.manual]);
  const m = useMemo(() => metrics(plan, inputs), [plan, inputs]);
  const list = useMemo(() => insights(inputs, plan), [inputs, plan]);
  const readOnly = viewing !== null;
  const sel = selected ? inputs.orders.find((o) => o.id === selected) : undefined;
  const editing = form?.mode === "edit" ? state.orders.find((o) => o.id === form.id) ?? null : null;

  // Tell the Copilot what the planner shows: the selected order and the plan's real numbers.
  useEffect(() => {
    const p = sel ? plan.placements.find((x) => x.orderId === sel.id) : undefined;
    const lines = [
      `Plan: ${m.scheduled} of ${m.orders} orders scheduled, ${m.late} late, ${m.atRisk} at risk`,
      ...(sel ? [
        `Order ${sel.id} for ${sel.customer}: ${sel.qty} boxes, ${sel.flute} flute, ${sel.grade}, print ${sel.print}, priority ${sel.priority}, deadline ${fmtMs(sel.due)}`,
        p ? `Scheduled on ${inputs.machines.find((x) => x.id === p.machineId)?.name} ${fmtH(inputs.planStart, p.startH)} to ${fmtH(inputs.planStart, p.endH)}, ${p.status === "late" ? `late by ${fmtDuration(p.lateH)}` : p.status}` : "Not scheduled",
      ] : []),
    ];
    setCopilotContext("planner", { label: sel ? `Planner, order ${sel.id}` : "Planner", lines });
    return () => setCopilotContext("planner", null);
  }, [sel, plan, m, inputs]);
  const machineName = (id: string) => inputs.machines.find((x) => x.id === id)?.name ?? id;

  const place = (orderId: string, machineId: string, index: number, how: string) => {
    const order = inputs.orders.find((o) => o.id === orderId);
    const target = inputs.machines.find((x) => x.id === machineId);
    const why = order && target ? incompatibility(order, target)[0] : undefined;
    if (why) {
      setNotice(`${orderId} cannot go on ${target?.name}: it ${why}. Nothing was changed.`);
      return;
    }
    planner.setManual(moveInSequences(sequencesOf(plan), orderId, machineId, index));
    setNotice(`${how} ${orderId} on ${machineName(machineId)}. Schedule recalculated.`);
  };
  const onMove = (id: string, machineId: string, atH: number) => place(id, machineId, indexAt(plan, machineId, id, atH), "Moved");
  const apply = (i: Insight) => {
    if (!i.action) return;
    place(i.action.orderId, i.action.machineId, suggestedIndex(plan, i.action.orderId, i.action.machineId), "Moved");
    setSelected(i.action.orderId);
  };
  const save = (order: PlannerOrder, oldId: string | null) => {
    if (oldId) planner.update(oldId, order);
    else planner.add(order);
    setSelected(order.id);
    setForm(null);
    setNotice(`${oldId ? "Saved" : "Added"} ${order.id}. Schedule recalculated.`);
  };

  return (
    <main id="main" className="grid w-full grid-cols-12 gap-4 px-5 pt-4 pb-24 md:px-8 lg:gap-6 lg:px-10">
      <div className="no-print col-span-12">
        <PageIntro title="Production planner" lede="Enter orders and get a schedule across the converting machines, built from capacity, deadlines, paper and changeovers." />
      </div>

      <div className="no-print col-span-12"><PlannerSummary m={m} planStart={inputs.planStart} /></div>

      <Card
        id="timeline"
        title="Production schedule"
        subtitle={readOnly ? "What-if plan, read-only. Turn off “Show on the timeline” to get back to the real plan." : `Plan starts ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(inputs.planStart)} plant time.`}
        className="no-print col-span-12"
        actions={
          <span className="flex flex-wrap items-center gap-3">
            {state.manual && !readOnly ? (
              <button type="button" onClick={() => { planner.setManual(null); setNotice("Back to the automatic schedule."); }} className="inline-flex h-11 items-center gap-2 rounded-full border border-line2 px-4 text-sm text-tx hover:bg-s2 md:h-9">
                <RotateCcw aria-hidden="true" className="size-3.5" />Re-optimise (drop manual moves)
              </button>
            ) : null}
            <label className="flex items-center gap-2 text-xs text-mu">
              Plan starts
              <input
                type="datetime-local"
                value={toInputValue(state.planStart)}
                onChange={(e) => { const v = fromInputValue(e.target.value); if (Number.isFinite(v)) planner.setPlanStart(v); }}
                className="h-11 rounded-xl border border-line2 bg-s1 px-3 text-sm text-tx md:h-9"
              />
            </label>
          </span>
        }
      >
        {inputs.orders.length === 0 ? (
          <p className="rounded-2xl bg-s2/70 p-6 text-center text-sm text-mu">Nothing to schedule. Add orders on the <Link href="/dashboard/orders" className="underline underline-offset-2 hover:text-tx">Orders tab</Link>, or import the sample orders there.</p>
        ) : (
          <Timeline inputs={inputs} schedule={plan} selectedId={selected} onSelect={setSelected} onMove={readOnly ? undefined : onMove} />
        )}
        <p role="status" aria-live="polite" className="min-h-5 text-xs text-mu">{notice}</p>
        {sel ? (
          <OrderDetail
            inputs={inputs}
            schedule={plan}
            order={sel}
            readOnly={readOnly}
            onClose={() => setSelected(null)}
            onEdit={() => setForm({ mode: "edit", id: sel.id })}
            onReassign={(mid) => place(sel.id, mid, suggestedIndex(plan, sel.id, mid), "Moved")}
            onNudge={(d) => { planner.setManual(nudge(plan, sel.id, d)); setNotice(`Moved ${sel.id} ${d < 0 ? "earlier" : "later"}. Schedule recalculated.`); }}
          />
        ) : null}
        <details className="rounded-2xl bg-s2/50 p-4 text-sm text-mu">
          <summary className="cursor-pointer text-tx">How the schedule is built</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Orders are ranked by deadline, pulled earlier for urgent and high priority and pushed later for low.</li>
            <li>Each order goes on the compatible machine that finishes it soonest, using only the hours that machine is open (shifts, Sundays, maintenance, breakdowns).</li>
            <li>Later orders with the same grade, flute and print are pulled in behind it to save changeovers, unless that would make a more urgent order late.</li>
            <li>Paper is handed out in the same order from stock, then open purchase orders. An order waits for its paper.</li>
          </ol>
          <p className="mt-2">This is a fast rule-based heuristic. It gives a sensible, repeatable plan but does not prove it is the best possible one.</p>
        </details>
      </Card>

      <Card id="insights" title="Recommendations" subtitle="Worked out from the schedule above. Moves are tried on the real plan before they are suggested." className="no-print col-span-12 xl:col-span-5">
        <PlannerInsights list={list} readOnly={readOnly} onApply={apply} />
      </Card>

      <Card id="whatif" title="What-if planning" subtitle="Try a change and compare. The real plan is not touched." className="no-print col-span-12 xl:col-span-7">
        <WhatIfPanel inputs={base} scenario={scenario} cmp={cmp} onChange={setScenario} onTimeline={onTimeline} setOnTimeline={setOnTimeline} />
      </Card>


      {form ? (
        <OrderForm
          key={form.mode === "edit" ? form.id : "new"}
          editing={editing}
          takenIds={state.orders.map((o) => o.id)}
          suggestId={nextId(state.orders.map((o) => o.id))}
          planStart={state.planStart}
          onSave={save}
          onClose={() => setForm(null)}
        />
      ) : null}
    </main>
  );
}

/** Production planner: orders in, schedule out. Saved in this browser, so it renders after load. */
export function PlannerView() {
  const state = usePlannerState();
  if (!state) {
    return (
      <main id="main" aria-busy="true" className="grid w-full grid-cols-12 gap-4 px-5 pt-4 pb-24 md:px-8 lg:px-10">
        <div className="on-sky col-span-12 pt-4 pb-6"><h1 className="text-2xl font-medium tracking-tight text-tx">Production planner</h1></div>
        <Skeleton className="col-span-12 h-32" />
        <Skeleton className="col-span-12 h-72" />
      </main>
    );
  }
  return <Planner state={state} />;
}
