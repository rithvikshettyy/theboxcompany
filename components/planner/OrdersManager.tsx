"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { schedule } from "@/lib/planner/engine";
import { metrics } from "@/lib/planner/metrics";
import { buildInputs, SAMPLE_IDS } from "@/lib/planner/sample";
import { planner, usePlannerState, type PlannerState } from "@/lib/planner/store";
import type { PlannerOrder } from "@/lib/planner/types";
import { ExportBar, PrintSheet } from "./ExportBar";
import { OrderForm } from "./OrderForm";
import { OrderTable } from "./OrderTable";

const ID_PREFIX = "PL-";
const FIRST_ID = 101;

/** The next free order id in the PL-nnn series. */
function nextId(ids: string[]): string {
  const used = ids.map((i) => (i.startsWith(ID_PREFIX) ? Number(i.slice(ID_PREFIX.length)) : NaN)).filter(Number.isFinite);
  return `${ID_PREFIX}${Math.max(FIRST_ID - 1, ...used) + 1}`;
}

type Form = { mode: "new" } | { mode: "edit"; id: string } | null;

function Manager({ state }: { state: PlannerState }) {
  const inputs = useMemo(() => buildInputs(state.planStart, state.orders), [state.planStart, state.orders]);
  const plan = useMemo(() => schedule(inputs, { sequences: state.manual ?? undefined }), [inputs, state.manual]);
  const m = useMemo(() => metrics(plan, inputs), [plan, inputs]);
  const [form, setForm] = useState<Form>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const editing = form?.mode === "edit" ? state.orders.find((o) => o.id === form.id) ?? null : null;
  const demo = state.orders.some((o) => SAMPLE_IDS.has(o.id));

  const save = (order: PlannerOrder, oldId: string | null) => {
    if (oldId) planner.update(oldId, order);
    else planner.add(order);
    setForm(null);
    setNotice(`${oldId ? "Saved" : "Added"} ${order.id}. The Planner schedule is recalculated.`);
  };

  return (
    <>
      <Card
        id="customer-orders"
        title="Customer orders"
        subtitle="Add, edit, duplicate or remove orders. The production schedule on the Planner page recalculates each time."
        className="no-print col-span-12"
        actions={<ExportBar inputs={inputs} schedule={plan} disabled={plan.placements.length === 0 && plan.unscheduled.length === 0} />}
      >
        <OrderTable
          inputs={inputs}
          schedule={plan}
          selectedId={selected}
          readOnly={false}
          onSelect={(id) => { setSelected(id); setForm({ mode: "edit", id }); }}
          onAdd={() => setForm({ mode: "new" })}
          onEdit={(id) => setForm({ mode: "edit", id })}
          onDuplicate={(id) => { planner.duplicate(id); setNotice(`Duplicated ${id}.`); }}
          onDelete={(id) => { planner.remove(id); if (selected === id) setSelected(null); setNotice(`Deleted ${id}.`); }}
          onImport={() => { planner.importSample(); setNotice("Sample orders added. They are demo data."); }}
        />
        <p role="status" aria-live="polite" className="min-h-5 text-xs text-mu">{notice}</p>
      </Card>

      <PrintSheet inputs={inputs} schedule={plan} m={m} demo={demo} />

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
    </>
  );
}

/** Order management for the Orders tab: the same saved orders the Planner schedules. Renders after load (they live in this browser). */
export function OrdersManager() {
  const state = usePlannerState();
  if (!state) return <Skeleton className="col-span-12 h-72" />;
  return <Manager state={state} />;
}
