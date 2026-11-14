"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { num } from "@/lib/format";
import { fmtDuration, toInputValue } from "@/lib/planner/calendar";
import { blankSize, compatible, materialNeed, runHours } from "@/lib/planner/rules";
import { MACHINES } from "@/lib/planner/sample";
import { FLUTES, PRINTS, PRIORITIES, STYLES, type PlannerOrder } from "@/lib/planner/types";
import { DIM_MAX_MM, DIM_MIN_MM, parseOrder, type Draft } from "@/lib/planner/validate";
import { GRADES } from "@/lib/records";

const DEFAULT_DUE_H = 72;
const DEFAULT_QTY = "10000";

const input = "h-11 w-full rounded-xl border border-line2 bg-s1 px-3 text-sm text-tx md:h-10 aria-[invalid=true]:border-red";

function Field({ label, error, children, id }: { label: string; error?: string; children: ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-mu">{label}</label>
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="text-xs text-red">{error}</p> : null}
    </div>
  );
}

function toDraft(o: PlannerOrder | null, suggestId: string, planStart: number): Draft {
  if (o) {
    return {
      id: o.id, customer: o.customer, style: o.style, lengthMm: String(o.lengthMm), widthMm: String(o.widthMm), heightMm: String(o.heightMm),
      qty: String(o.qty), grade: o.grade, flute: o.flute, print: o.print, due: toInputValue(o.due), priority: o.priority,
    };
  }
  return {
    id: suggestId, customer: "", style: "RSC", lengthMm: "", widthMm: "", heightMm: "", qty: DEFAULT_QTY, grade: "L150", flute: "B", print: "none",
    due: toInputValue(planStart + DEFAULT_DUE_H * 3_600_000), priority: "normal",
  };
}

type Props = {
  editing: PlannerOrder | null;
  takenIds: string[];
  suggestId: string;
  planStart: number;
  onSave: (order: PlannerOrder, oldId: string | null) => void;
  onClose: () => void;
};

/** Add or edit an order. Every field is checked on save and all the problems are shown together. */
export function OrderForm({ editing, takenIds, suggestId, planStart, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Draft>(() => toDraft(editing, suggestId, planStart));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));
  const err = (k: keyof Draft) => errors[k];
  const props = (k: keyof Draft) => ({ id: `of-${k}`, value: d[k], onChange: set(k), "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `of-${k}-err` : undefined });

  const preview = useMemo(() => {
    const r = parseOrder({ ...d, id: "PREVIEW", due: d.due || "2999-01-01T00:00" }, [], 0);
    if (!r.order) return null;
    const o = r.order;
    const fits = MACHINES.filter((m) => compatible(o, m));
    const best = fits.map((m) => runHours(o, m)).sort((a, b) => a - b)[0];
    return { blank: blankSize(o), fits, best, paper: materialNeed(o) };
  }, [d]);

  const submit = () => {
    const ids = takenIds.filter((t) => t !== editing?.id);
    const r = parseOrder(d, ids, planStart);
    setErrors(r.errors);
    if (r.order) onSave(r.order, editing?.id ?? null);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="of-title"
      className="m-auto w-[min(46rem,calc(100vw-1.5rem))] max-h-[92dvh] overflow-y-auto rounded-3xl bg-s1 p-0 text-tx shadow-card backdrop:bg-night/50"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-5 p-5 md:p-7"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="of-title" className="text-xl">{editing ? `Edit ${editing.id}` : "Add an order"}</h2>
            <p className="text-xs text-mu">Box sizes are the finished box in mm. GSM follows the board grade.</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="inline-flex size-11 items-center justify-center rounded-full text-mu hover:bg-s2 hover:text-tx">
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Order ID" id="of-id" error={err("id")}><input {...props("id")} className={input} autoComplete="off" /></Field>
          <Field label="Customer" id="of-customer" error={err("customer")}><input {...props("customer")} className={input} autoComplete="off" /></Field>
          <Field label="Box style" id="of-style" error={err("style")}>
            <select {...props("style")} className={input}>{Object.entries(STYLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
          <Field label="Quantity (boxes)" id="of-qty" error={err("qty")}><input {...props("qty")} inputMode="numeric" className={input} /></Field>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Field label="Length (mm)" id="of-lengthMm" error={err("lengthMm")}><input {...props("lengthMm")} inputMode="numeric" placeholder={String(DIM_MIN_MM)} className={input} /></Field>
            <Field label="Width (mm)" id="of-widthMm" error={err("widthMm")}><input {...props("widthMm")} inputMode="numeric" className={input} /></Field>
            <Field label="Height (mm)" id="of-heightMm" error={err("heightMm")}><input {...props("heightMm")} inputMode="numeric" placeholder={String(DIM_MAX_MM)} className={input} /></Field>
          </div>
          <Field label="Board grade (liner)" id="of-grade" error={err("grade")}>
            <select {...props("grade")} className={input}>{Object.entries(GRADES).filter(([k]) => k.startsWith("L") || k.startsWith("D")).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
          </Field>
          <Field label="Flute" id="of-flute" error={err("flute")}>
            <select {...props("flute")} className={input}>{FLUTES.map((f) => <option key={f} value={f}>{f}</option>)}</select>
          </Field>
          <Field label="Printing" id="of-print" error={err("print")}>
            <select {...props("print")} className={input}>{Object.entries(PRINTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </Field>
          <Field label="Priority" id="of-priority" error={err("priority")}>
            <select {...props("priority")} className={input}>{PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select>
          </Field>
          <Field label="Delivery deadline (plant time)" id="of-due" error={err("due")}><input {...props("due")} type="datetime-local" className={input} /></Field>
        </div>

        <div aria-live="polite" className="rounded-2xl bg-s2/70 p-4 text-sm">
          <p className="text-xs text-mu">Worked out from the fields above</p>
          {preview ? (
            <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <li><span className="text-mu">Blank: </span>{num(preview.blank.widthMm)} × {num(preview.blank.lengthMm)} mm</li>
              <li><span className="text-mu">Paper: </span>{Object.entries(preview.paper).map(([g, t]) => `${g} ${t.toFixed(1)} t`).join(" · ")}</li>
              <li className="sm:col-span-2">
                <span className="text-mu">Can run on: </span>
                {preview.fits.length ? `${preview.fits.map((m) => m.name).join(", ")} (fastest ${fmtDuration(preview.best)})` : <span className="text-red">No machine. It will not be scheduled.</span>}
              </li>
            </ul>
          ) : <p className="mt-1 text-mu">Fill in the sizes and quantity to see the blank, paper and machines.</p>}
        </div>

        <footer className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => ref.current?.close()} className="inline-flex h-11 items-center rounded-full border border-line2 px-6 text-sm text-tx hover:bg-s2">Cancel</button>
          <button type="submit" className="inline-flex h-11 items-center rounded-full bg-night px-6 text-sm font-medium text-paper hover:bg-[color-mix(in_srgb,var(--night)_85%,white)]">{editing ? "Save changes" : "Add order"}</button>
        </footer>
      </form>
    </dialog>
  );
}
