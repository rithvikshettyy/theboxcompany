"use client";

import { Download, Printer } from "lucide-react";
import { num } from "@/lib/format";
import { fmtDuration, fmtH, fmtMs } from "@/lib/planner/calendar";
import { scheduleToCsv } from "@/lib/planner/export";
import type { Inputs, Metrics, Schedule } from "@/lib/planner/types";

const btn = "inline-flex h-11 items-center gap-2 rounded-full border border-line2 px-5 text-sm text-tx hover:bg-s2 md:h-9";

/** CSV download and print. There is no PDF library in the project, so "Save as PDF" in the print dialog makes the PDF. */
export function ExportBar({ inputs, schedule, disabled }: { inputs: Inputs; schedule: Schedule; disabled: boolean }) {
  const csv = () => {
    const blob = new Blob(["﻿", scheduleToCsv(inputs, schedule)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `production-schedule-${new Date(inputs.planStart).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={csv} disabled={disabled} className={`${btn} disabled:opacity-50`}><Download aria-hidden="true" className="size-4" />Export CSV</button>
      <button type="button" onClick={() => window.print()} disabled={disabled} className={`${btn} disabled:opacity-50`}><Printer aria-hidden="true" className="size-4" />Print or save as PDF</button>
    </div>
  );
}

/** What comes out on paper: the whole schedule as one plain table. Hidden on screen. */
export function PrintSheet({ inputs, schedule, m, demo }: { inputs: Inputs; schedule: Schedule; m: Metrics; demo: boolean }) {
  const machine = (id: string) => inputs.machines.find((x) => x.id === id)?.name ?? id;
  const order = (id: string) => inputs.orders.find((o) => o.id === id);
  return (
    <section className="print-only text-black" aria-hidden="true">
      <h1 className="text-xl font-semibold">Production plan · The Box Company</h1>
      <p className="text-sm">Plan starts {fmtMs(inputs.planStart)} · {m.scheduled} of {m.orders} orders scheduled · {num(m.plannedBoxes)} boxes · on-time {Math.round(m.onTimeRate * 100)}% · changeover {fmtDuration(m.changeoverH)}</p>
      {demo ? <p className="text-sm font-semibold">Demo data: these orders are made up and are not live factory orders.</p> : null}
      <p className="text-xs">Heuristic schedule (earliest effective deadline, grouped by setup, earliest-finish machine). Not guaranteed optimal.</p>
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr>{["Machine", "Order", "Customer", "Boxes", "Start", "End", "Changeover", "Deadline", "Status"].map((h) => <th key={h} className="border-b border-black py-1 text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {inputs.machines.flatMap((mc) =>
            schedule.placements.filter((p) => p.machineId === mc.id).map((p) => (
              <tr key={p.orderId}>
                <td className="border-b border-gray-300 py-1">{machine(p.machineId)}</td>
                <td className="border-b border-gray-300 py-1">{p.orderId}</td>
                <td className="border-b border-gray-300 py-1">{order(p.orderId)?.customer}</td>
                <td className="border-b border-gray-300 py-1">{num(order(p.orderId)?.qty ?? 0)}</td>
                <td className="border-b border-gray-300 py-1">{fmtH(inputs.planStart, p.startH)}</td>
                <td className="border-b border-gray-300 py-1">{fmtH(inputs.planStart, p.endH)}</td>
                <td className="border-b border-gray-300 py-1">{Math.round(p.changeoverMin)} min</td>
                <td className="border-b border-gray-300 py-1">{fmtMs(order(p.orderId)?.due ?? 0)}</td>
                <td className="border-b border-gray-300 py-1">{p.status === "late" ? `Late by ${fmtDuration(p.lateH)}` : p.status === "at-risk" ? "At risk" : "On time"}</td>
              </tr>
            )),
          )}
          {schedule.unscheduled.map((u) => (
            <tr key={u.orderId}><td className="border-b border-gray-300 py-1" colSpan={9}>{u.orderId}: not scheduled. {u.reason}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
