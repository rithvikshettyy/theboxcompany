"use client";

import { useState, type ReactNode } from "react";
import { pct } from "@/lib/format";
import { fmtDuration, fmtH } from "@/lib/planner/calendar";
import type { Inputs } from "@/lib/planner/types";
import { NO_SCENARIO, type Comparison, type Scenario } from "@/lib/planner/whatif";
import type { GradeId } from "@/lib/records";
import { GRADES } from "@/lib/records";
import { cn } from "@/lib/utils";

type Cfg = {
  urgent: { on: boolean; qty: number; dueInH: number };
  breakdown: { on: boolean; machineId: string; fromH: number; hours: number };
  slow: { on: boolean; machineId: string; pct: number };
  shift: { on: boolean; machineId: string };
  shortage: { on: boolean; grade: GradeId; pct: number };
  qty: { on: boolean; pct: number };
};

const toScenario = (c: Cfg): Scenario => ({
  urgentOrder: c.urgent.on ? { qty: c.urgent.qty, dueInH: c.urgent.dueInH } : null,
  breakdown: c.breakdown.on ? { machineId: c.breakdown.machineId, fromH: c.breakdown.fromH, hours: c.breakdown.hours } : null,
  slow: c.slow.on ? { machineId: c.slow.machineId, pct: c.slow.pct } : null,
  extraShift: c.shift.on ? { machineId: c.shift.machineId } : null,
  shortage: c.shortage.on ? { grade: c.shortage.grade, pct: c.shortage.pct } : null,
  qtyIncrease: c.qty.on ? { pct: c.qty.pct } : null,
});

const num = "h-11 w-24 rounded-xl border border-line2 bg-s1 px-3 text-sm text-tx md:h-9";
const sel = "h-11 rounded-xl border border-line2 bg-s1 px-3 text-sm text-tx md:h-9";

function Row({ on, onToggle, label, children }: { on: boolean; onToggle: (v: boolean) => void; label: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl p-3 transition-colors duration-150", on ? "bg-s2" : "bg-s2/40")}>
      <label className="flex min-h-11 items-center gap-3 text-sm text-tx">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} className="size-5 accent-[var(--brand2)]" />
        {label}
      </label>
      {on ? <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 pl-8 text-xs text-mu">{children}</div> : null}
    </div>
  );
}

const clamp = (v: string, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Number(v) || lo));

function Delta({ before, after, text, goodWhen }: { before: number; after: number; text: (v: number) => string; goodWhen: "higher" | "lower" }) {
  const same = Math.abs(after - before) < 1e-9;
  const better = goodWhen === "higher" ? after > before : after < before;
  return (
    <span className="tabular-nums">
      <span className="text-mu">{text(before)} → </span>
      <span className={same ? "text-tx" : better ? "text-green" : "text-red"}>{text(after)}</span>
      {same ? null : <span className="sr-only">{better ? " (better)" : " (worse)"}</span>}
    </span>
  );
}

type Props = {
  inputs: Inputs;
  scenario: Scenario;
  cmp: Comparison | null;
  onChange: (s: Scenario) => void;
  onTimeline: boolean;
  setOnTimeline: (v: boolean) => void;
};

/** Try a change on the plan and see what it does to deliveries, load and changeovers. Nothing here edits the plan. */
export function WhatIfPanel({ inputs, scenario, cmp, onChange, onTimeline, setOnTimeline }: Props) {
  const first = inputs.machines[0]?.id ?? "";
  const [cfg, setCfg] = useState<Cfg>({
    urgent: { on: false, qty: 20_000, dueInH: 24 },
    breakdown: { on: false, machineId: first, fromH: 8, hours: 8 },
    slow: { on: false, machineId: first, pct: 25 },
    shift: { on: false, machineId: inputs.machines[1]?.id ?? first },
    shortage: { on: false, grade: "L150", pct: 50 },
    qty: { on: false, pct: 20 },
  });
  const up = <K extends keyof Cfg>(k: K, patch: Partial<Cfg[K]>) => {
    const next = { ...cfg, [k]: { ...cfg[k], ...patch } };
    setCfg(next);
    onChange(toScenario(next));
  };
  const machines = (v: string, on: (id: string) => void) => (
    <select value={v} onChange={(e) => on(e.target.value)} aria-label="Machine" className={sel}>
      {inputs.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );
  const reset = () => {
    setCfg((c) => ({ urgent: { ...c.urgent, on: false }, breakdown: { ...c.breakdown, on: false }, slow: { ...c.slow, on: false }, shift: { ...c.shift, on: false }, shortage: { ...c.shortage, on: false }, qty: { ...c.qty, on: false } }));
    onChange(NO_SCENARIO);
    setOnTimeline(false);
  };

  const a = cmp?.baseMetrics;
  const b = cmp?.scenarioMetrics;
  return (
    <div className="flex flex-col gap-3">
      <Row on={cfg.urgent.on} onToggle={(v) => up("urgent", { on: v })} label="A new urgent order arrives">
        <label className="flex items-center gap-2">Boxes <input className={num} inputMode="numeric" value={cfg.urgent.qty} onChange={(e) => up("urgent", { qty: clamp(e.target.value, 1, 1_000_000) })} /></label>
        <label className="flex items-center gap-2">Due in (h) <input className={num} inputMode="numeric" value={cfg.urgent.dueInH} onChange={(e) => up("urgent", { dueInH: clamp(e.target.value, 1, 336) })} /></label>
      </Row>
      <Row on={cfg.breakdown.on} onToggle={(v) => up("breakdown", { on: v })} label="A machine breaks down">
        {machines(cfg.breakdown.machineId, (id) => up("breakdown", { machineId: id }))}
        <label className="flex items-center gap-2">After (h) <input className={num} inputMode="numeric" value={cfg.breakdown.fromH} onChange={(e) => up("breakdown", { fromH: clamp(e.target.value, 0, 336) })} /></label>
        <label className="flex items-center gap-2">For (h) <input className={num} inputMode="numeric" value={cfg.breakdown.hours} onChange={(e) => up("breakdown", { hours: clamp(e.target.value, 1, 168) })} /></label>
      </Row>
      <Row on={cfg.slow.on} onToggle={(v) => up("slow", { on: v })} label="A machine runs slower">
        {machines(cfg.slow.machineId, (id) => up("slow", { machineId: id }))}
        <label className="flex items-center gap-2">Slower by (%) <input className={num} inputMode="numeric" value={cfg.slow.pct} onChange={(e) => up("slow", { pct: clamp(e.target.value, 1, 90) })} /></label>
      </Row>
      <Row on={cfg.shift.on} onToggle={(v) => up("shift", { on: v })} label="A machine runs an extra shift">
        {machines(cfg.shift.machineId, (id) => up("shift", { machineId: id }))}
        <span>Adds the missing shift, or Sundays if it already runs all three.</span>
      </Row>
      <Row on={cfg.shortage.on} onToggle={(v) => up("shortage", { on: v })} label="Paper runs short">
        <select value={cfg.shortage.grade} onChange={(e) => up("shortage", { grade: e.target.value as GradeId })} aria-label="Paper grade" className={sel}>
          {Object.entries(GRADES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <label className="flex items-center gap-2">Short by (%) <input className={num} inputMode="numeric" value={cfg.shortage.pct} onChange={(e) => up("shortage", { pct: clamp(e.target.value, 1, 100) })} /></label>
      </Row>
      <Row on={cfg.qty.on} onToggle={(v) => up("qty", { on: v })} label="Order quantities grow">
        <label className="flex items-center gap-2">Every order up by (%) <input className={num} inputMode="numeric" value={cfg.qty.pct} onChange={(e) => up("qty", { pct: clamp(e.target.value, 1, 300) })} /></label>
      </Row>

      {cmp && a && b ? (
        <div aria-live="polite" className="rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm text-tx">Effect of the change</h3>
            <div className="flex items-center gap-3">
              <label className="flex min-h-11 items-center gap-2 text-xs text-mu"><input type="checkbox" checked={onTimeline} onChange={(e) => setOnTimeline(e.target.checked)} className="size-4 accent-[var(--brand2)]" />Show on the timeline</label>
              <button type="button" onClick={reset} className="h-11 text-xs text-mu underline underline-offset-2 hover:text-tx md:h-8">Reset</button>
            </div>
          </div>
          <p className="mt-1 text-xs text-mu">Both sides use the automatic scheduler, so manual moves are left out. Before → after.</p>
          <dl className="mt-3 grid gap-x-8 text-sm md:grid-cols-2">
            {[
              ["Delivery commitments met", <Delta key="a" before={a.onTimeRate} after={b.onTimeRate} text={(v) => pct(v * 100, 0)} goodWhen="higher" />],
              ["Late orders", <Delta key="b" before={a.late} after={b.late} text={(v) => String(v)} goodWhen="lower" />],
              ["Not scheduled", <Delta key="c" before={a.unscheduled} after={b.unscheduled} text={(v) => String(v)} goodWhen="lower" />],
              ["Machine utilization", <Delta key="d" before={a.utilization} after={b.utilization} text={(v) => pct(v * 100, 0)} goodWhen="lower" />],
              ["Changeover time", <Delta key="e" before={a.changeoverH} after={b.changeoverH} text={fmtDuration} goodWhen="lower" />],
              ["Production finished", <Delta key="f" before={a.finishH} after={b.finishH} text={(v) => fmtH(inputs.planStart, v)} goodWhen="lower" />],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-4 border-t border-line py-2"><dt className="text-mu">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <ul className="mt-3 flex flex-col gap-1 text-xs">
            {b.loads.map((l) => {
              const before = a.loads.find((x) => x.machineId === l.machineId)?.load ?? 0;
              return (
                <li key={l.machineId} className="flex justify-between gap-4">
                  <span className="text-mu">{inputs.machines.find((m) => m.id === l.machineId)?.name} load</span>
                  <Delta before={before} after={l.load} text={(v) => (Number.isFinite(v) ? pct(v * 100, 0) : "no open hours")} goodWhen="lower" />
                </li>
              );
            })}
          </ul>
          {cmp.newlyLate.length ? <p className="mt-3 rounded-xl bg-red/10 p-3 text-sm text-red">Newly delayed: {cmp.newlyLate.join(", ")}</p> : null}
          {cmp.recovered.length ? <p className="mt-2 rounded-xl bg-green/10 p-3 text-sm text-green">Back on time: {cmp.recovered.join(", ")}</p> : null}
          {!cmp.newlyLate.length && !cmp.recovered.length ? <p className="mt-3 text-sm text-mu">No order changes between on time and late.</p> : null}
        </div>
      ) : (
        <p className="rounded-2xl bg-s2/70 p-4 text-sm text-mu">Switch on a change above to see its effect. {Object.values(scenario).some(Boolean) ? "" : "The plan itself is not touched."}</p>
      )}
    </div>
  );
}
