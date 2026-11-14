"use client";

import { ArrowLeft, ArrowRight, Pencil, X } from "lucide-react";
import { fmtDuration, fmtH, fmtMs } from "@/lib/planner/calendar";
import { blankSize, compatible, materialNeed } from "@/lib/planner/rules";
import type { Inputs, Placement, PlannerOrder, Schedule } from "@/lib/planner/types";
import { PRINTS, STYLES } from "@/lib/planner/types";
import { num } from "@/lib/format";

type Props = {
  inputs: Inputs;
  schedule: Schedule;
  order: PlannerOrder;
  readOnly: boolean;
  onClose: () => void;
  onEdit: () => void;
  onReassign: (machineId: string) => void;
  onNudge: (delta: -1 | 1) => void;
};

const row = "flex justify-between gap-4 border-t border-line py-2 text-sm first:border-t-0";

/** One order's schedule, changeover, paper and the ways to move it. */
export function OrderDetail({ inputs, schedule, order, readOnly, onClose, onEdit, onReassign, onNudge }: Props) {
  const p: Placement | undefined = schedule.placements.find((x) => x.orderId === order.id);
  const why = schedule.unscheduled.find((u) => u.orderId === order.id);
  const blank = blankSize(order);
  const machine = inputs.machines.find((m) => m.id === p?.machineId);
  const options = inputs.machines.filter((m) => compatible(order, m));

  return (
    <aside aria-label={`Order ${order.id}`} className="rounded-2xl bg-s2/70 p-4 md:p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base text-tx">{order.id} · {order.customer}</h3>
          <p className="text-xs text-mu">{STYLES[order.style]}, {num(order.lengthMm)} × {num(order.widthMm)} × {num(order.heightMm)} mm, {num(order.qty)} boxes</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="inline-flex size-11 items-center justify-center rounded-full text-mu hover:bg-s1 hover:text-tx">
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>

      <div className="mt-3 grid gap-x-8 md:grid-cols-2">
        <dl>
          <div className={row}><dt className="text-mu">Machine</dt><dd className="text-tx">{machine?.name ?? "Not scheduled"}</dd></div>
          {p ? (
            <>
              <div className={row}><dt className="text-mu">Runs</dt><dd className="text-right text-tx tabular-nums">{fmtH(inputs.planStart, p.startH)} to {fmtH(inputs.planStart, p.endH)}</dd></div>
              <div className={row}><dt className="text-mu">Run time</dt><dd className="text-tx tabular-nums">{fmtDuration(p.runH)}</dd></div>
              <div className={row}><dt className="text-mu">Changeover</dt><dd className="text-right text-tx">{Math.round(p.changeoverMin)} min{p.changeoverWhy.length ? ` (${p.changeoverWhy.join(", ")})` : ""}</dd></div>
            </>
          ) : null}
          <div className={row}><dt className="text-mu">Deadline</dt><dd className="text-tx tabular-nums">{fmtMs(order.due)}</dd></div>
          {p ? (
            <div className={row}>
              <dt className="text-mu">Against deadline</dt>
              <dd className={p.status === "late" ? "text-red" : p.status === "at-risk" ? "text-amber" : "text-green"}>
                {p.status === "late" ? `Late by ${fmtDuration(p.lateH)}` : `${fmtDuration(p.slackH)} to spare${p.status === "at-risk" ? " (at risk)" : ""}`}
              </dd>
            </div>
          ) : null}
        </dl>
        <dl>
          <div className={row}><dt className="text-mu">Board</dt><dd className="text-tx">{order.grade} · {order.gsm} GSM · {order.flute} flute</dd></div>
          <div className={row}><dt className="text-mu">Print</dt><dd className="text-tx">{PRINTS[order.print].label}</dd></div>
          <div className={row}><dt className="text-mu">Blank</dt><dd className="text-tx tabular-nums">{num(blank.widthMm)} × {num(blank.lengthMm)} mm</dd></div>
          <div className={row}>
            <dt className="text-mu">Paper needed</dt>
            <dd className="text-right text-tx tabular-nums">{Object.entries(materialNeed(order)).map(([g, t]) => `${g} ${t.toFixed(1)} t`).join(" · ")}</dd>
          </div>
          {p && p.materialWaitH > 0.1 ? <div className={row}><dt className="text-mu">Waiting for paper</dt><dd className="text-amber tabular-nums">{fmtDuration(p.materialWaitH)}</dd></div> : null}
        </dl>
      </div>

      {why ? <p role="alert" className="mt-3 rounded-xl bg-red/10 p-3 text-sm text-red">Not scheduled: {why.reason}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!readOnly && p ? (
          <>
            <label className="flex items-center gap-2 text-sm text-mu">
              Machine
              <select
                value={p.machineId}
                onChange={(e) => onReassign(e.target.value)}
                className="h-11 rounded-xl border border-line2 bg-s1 px-3 text-sm text-tx md:h-9"
              >
                {options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => onNudge(-1)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-s1 px-4 text-sm text-tx hover:bg-line md:h-9"><ArrowLeft aria-hidden="true" className="size-3.5" />Earlier</button>
            <button type="button" onClick={() => onNudge(1)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-s1 px-4 text-sm text-tx hover:bg-line md:h-9">Later<ArrowRight aria-hidden="true" className="size-3.5" /></button>
          </>
        ) : null}
        {!readOnly ? (
          <button type="button" onClick={onEdit} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-s1 px-4 text-sm text-tx hover:bg-line md:h-9"><Pencil aria-hidden="true" className="size-3.5" />Edit order</button>
        ) : null}
      </div>
    </aside>
  );
}
