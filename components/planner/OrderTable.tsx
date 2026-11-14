"use client";

import { useState } from "react";
import { Copy, FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { num } from "@/lib/format";
import { fmtDuration, fmtH, fmtMs } from "@/lib/planner/calendar";
import { FLUTES, PRIORITIES, type Inputs, type PlannerOrder, type Schedule } from "@/lib/planner/types";
import { cn } from "@/lib/utils";

type Status = "all" | "on-time" | "at-risk" | "late" | "unscheduled";

const th = "pb-2 text-left text-xs font-normal text-mu";
const td = "border-t border-line py-3 pr-3 align-top";
const select = "h-11 rounded-xl border border-line2 bg-s1 px-3 text-sm text-tx md:h-9";
const CHIP = {
  "on-time": "bg-green/10 text-green",
  "at-risk": "bg-amber/10 text-amber",
  late: "bg-red/10 text-red",
  unscheduled: "bg-red/10 text-red",
} as const;
const WORD = { "on-time": "On time", "at-risk": "At risk", late: "Late", unscheduled: "Not scheduled" } as const;

type Props = {
  inputs: Inputs;
  schedule: Schedule;
  selectedId: string | null;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: () => void;
};

/** Every order with search and filters, its place in the plan, and add / edit / duplicate / delete. */
export function OrderTable({ inputs, schedule, selectedId, readOnly, onSelect, onAdd, onEdit, onDuplicate, onDelete, onImport }: Props) {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [machine, setMachine] = useState("all");
  const [flute, setFlute] = useState("all");
  const [confirm, setConfirm] = useState<string | null>(null);

  const placement = (id: string) => schedule.placements.find((p) => p.orderId === id);
  const statusOf = (o: PlannerOrder): Exclude<Status, "all"> => placement(o.id)?.status ?? "unscheduled";
  const rows = inputs.orders.filter((o) => {
    const text = `${o.id} ${o.customer} ${o.style}`.toLowerCase();
    return (
      text.includes(q.trim().toLowerCase()) &&
      (priority === "all" || o.priority === priority) &&
      (status === "all" || statusOf(o) === status) &&
      (machine === "all" || placement(o.id)?.machineId === machine) &&
      (flute === "all" || o.flute === flute)
    );
  });
  const filtered = q !== "" || priority !== "all" || status !== "all" || machine !== "all" || flute !== "all";
  const clear = () => {
    setQ("");
    setPriority("all");
    setStatus("all");
    setMachine("all");
    setFlute("all");
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-mu">
          Search orders
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, customer or style" className={cn(select, "w-full")} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mu">Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={select}>
            <option value="all">All</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mu">Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={select}>
            <option value="all">All</option>{(Object.keys(WORD) as (keyof typeof WORD)[]).map((s) => <option key={s} value={s}>{WORD[s]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mu">Machine
          <select value={machine} onChange={(e) => setMachine(e.target.value)} className={select}>
            <option value="all">All</option>{inputs.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mu">Flute
          <select value={flute} onChange={(e) => setFlute(e.target.value)} className={select}>
            <option value="all">All</option>{FLUTES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        {filtered ? <button type="button" onClick={clear} className="h-11 px-2 text-sm text-mu underline underline-offset-2 hover:text-tx md:h-9">Clear filters</button> : null}
        {!readOnly ? (
          <button type="button" onClick={onAdd} className="ml-auto inline-flex h-11 items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-paper hover:bg-[color-mix(in_srgb,var(--night)_85%,white)] md:h-9">
            <Plus aria-hidden="true" className="size-4" />Add order
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-mu" aria-live="polite">
        {filtered ? `Showing ${rows.length} of ${inputs.orders.length} orders` : `${inputs.orders.length} orders`}
      </p>

      {inputs.orders.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-s2/70 p-6 text-center">
          <p className="text-base text-tx">No orders yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-mu">Add an order to see a schedule, or load the sample orders to try the planner. Sample orders are made up and are not live factory orders.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onAdd} className="inline-flex h-11 items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-paper"><Plus aria-hidden="true" className="size-4" />Add an order</button>
            <button type="button" onClick={onImport} className="inline-flex h-11 items-center gap-2 rounded-full border border-line2 px-5 text-sm text-tx hover:bg-s2"><FileDown aria-hidden="true" className="size-4" />Import sample orders</button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-s2/70 p-5 text-sm text-mu">No orders match. <button type="button" onClick={clear} className="text-tx underline underline-offset-2">Clear filters</button></p>
      ) : (
        <div className="relative -mx-5 mt-3 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[58rem] text-sm">
            <thead>
              <tr>
                {["Order", "Customer", "Box", "Quantity", "Board", "Priority", "Deadline", "Plan", "Status", ""].map((h) => <th key={h} scope="col" className={cn(th, h === "Quantity" && "text-right")}>{h || <span className="sr-only">Actions</span>}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const p = placement(o.id);
                const s = statusOf(o);
                return (
                  <tr key={o.id} className={cn("transition-colors duration-150 hover:bg-s2/50", selectedId === o.id && "bg-s2/70")}>
                    <td className={td}>
                      <button type="button" onClick={() => onSelect(o.id)} className="text-tx underline-offset-2 hover:underline">{o.id}</button>
                    </td>
                    <td className={cn(td, "text-tx")}>{o.customer}</td>
                    <td className={cn(td, "text-mu")}>{o.style}<span className="block text-xs tabular-nums">{o.lengthMm}×{o.widthMm}×{o.heightMm}</span></td>
                    <td className={cn(td, "text-right text-tx tabular-nums")}>{num(o.qty)}</td>
                    <td className={cn(td, "text-mu")}>{o.flute} · {o.grade}<span className="block text-xs">{o.print === "none" ? "Plain" : o.print}</span></td>
                    <td className={cn(td, "text-mu capitalize")}>{o.priority}</td>
                    <td className={cn(td, "text-mu tabular-nums")}>{fmtMs(o.due)}</td>
                    <td className={cn(td, "text-mu tabular-nums")}>
                      {p ? <>{inputs.machines.find((m) => m.id === p.machineId)?.name}<span className="block text-xs">{fmtH(inputs.planStart, p.startH)} to {fmtH(inputs.planStart, p.endH)}</span></> : "Not placed"}
                    </td>
                    <td className={td}>
                      <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs", CHIP[s])}>{WORD[s]}</span>
                      {p && p.lateH > 0 ? <span className="mt-0.5 block text-xs text-red tabular-nums">by {fmtDuration(p.lateH)}</span> : null}
                    </td>
                    <td className={cn(td, "pr-0")}>
                      {!readOnly ? (
                        <span className="flex justify-end gap-1">
                          {confirm === o.id ? (
                            <>
                              <button type="button" onClick={() => { onDelete(o.id); setConfirm(null); }} className="h-11 rounded-full bg-red/10 px-3 text-xs text-red md:h-8">Delete {o.id}</button>
                              <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-full px-3 text-xs text-mu md:h-8">Keep</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => onEdit(o.id)} aria-label={`Edit ${o.id}`} className="inline-flex size-11 items-center justify-center rounded-full text-mu hover:bg-s2 hover:text-tx md:size-8"><Pencil aria-hidden="true" className="size-3.5" /></button>
                              <button type="button" onClick={() => onDuplicate(o.id)} aria-label={`Duplicate ${o.id}`} className="inline-flex size-11 items-center justify-center rounded-full text-mu hover:bg-s2 hover:text-tx md:size-8"><Copy aria-hidden="true" className="size-3.5" /></button>
                              <button type="button" onClick={() => setConfirm(o.id)} aria-label={`Delete ${o.id}`} className="inline-flex size-11 items-center justify-center rounded-full text-mu hover:bg-red/10 hover:text-red md:size-8"><Trash2 aria-hidden="true" className="size-3.5" /></button>
                            </>
                          )}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
