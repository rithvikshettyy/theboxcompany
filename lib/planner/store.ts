"use client";

import { useSyncExternalStore } from "react";
import { nextPlanStart } from "./calendar";
import { sampleOrders } from "./sample";
import { isOrder } from "./validate";
import type { PlannerOrder } from "./types";

/** What the planner remembers between visits. Kept in this browser (localStorage): there is no server for it yet. */
export type PlannerState = {
  planStart: number;
  orders: PlannerOrder[];
  /** Hand-set order of jobs per machine, or null for the automatic plan. */
  manual: Record<string, string[]> | null;
};

const KEY = "boxco.planner.v1";
const listeners = new Set<() => void>();
let state: PlannerState | null = null;

function fresh(): PlannerState {
  const planStart = nextPlanStart(Date.now());
  return { planStart, orders: sampleOrders(planStart), manual: null };
}

function read(): PlannerState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fresh();
    const v = JSON.parse(raw) as Partial<PlannerState>;
    if (typeof v.planStart !== "number" || !Number.isFinite(v.planStart) || !Array.isArray(v.orders)) return fresh();
    const manual =
      v.manual && typeof v.manual === "object" && Object.values(v.manual).every((l) => Array.isArray(l) && l.every((x) => typeof x === "string"))
        ? v.manual
        : null;
    return { planStart: v.planStart, orders: v.orders.filter(isOrder), manual };
  } catch {
    return fresh();
  }
}

function set(next: PlannerState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the planner still works for this visit.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = (): PlannerState => (state ??= read());
const getServerSnapshot = (): PlannerState | null => null;

/** The planner's saved state. Null on the server and during the first client render. */
export function usePlannerState(): PlannerState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const current = (): PlannerState => (state ??= read());

/** Keep manual sequences free of orders that no longer exist. */
const prune = (manual: PlannerState["manual"], ids: Set<string>): PlannerState["manual"] =>
  manual ? Object.fromEntries(Object.entries(manual).map(([m, list]) => [m, list.filter((id) => ids.has(id))])) : null;

export const planner = {
  add(order: PlannerOrder) {
    const s = current();
    set({ ...s, orders: [...s.orders, order] });
  },
  update(oldId: string, order: PlannerOrder) {
    const s = current();
    const manual =
      s.manual && oldId !== order.id
        ? Object.fromEntries(Object.entries(s.manual).map(([m, list]) => [m, list.map((id) => (id === oldId ? order.id : id))]))
        : s.manual;
    set({ ...s, orders: s.orders.map((o) => (o.id === oldId ? order : o)), manual });
  },
  remove(id: string) {
    const s = current();
    const orders = s.orders.filter((o) => o.id !== id);
    set({ ...s, orders, manual: prune(s.manual, new Set(orders.map((o) => o.id))) });
  },
  duplicate(id: string) {
    const s = current();
    const src = s.orders.find((o) => o.id === id);
    if (!src) return;
    const taken = new Set(s.orders.map((o) => o.id));
    let n = 1;
    let next = `${src.id}-COPY`;
    while (taken.has(next)) next = `${src.id}-COPY${++n}`;
    set({ ...s, orders: [...s.orders, { ...src, id: next }] });
  },
  /** Add the demo orders that are not already there. */
  importSample() {
    const s = current();
    const have = new Set(s.orders.map((o) => o.id));
    set({ ...s, orders: [...s.orders, ...sampleOrders(s.planStart).filter((o) => !have.has(o.id))] });
  },
  clear() {
    set({ ...current(), orders: [], manual: null });
  },
  setManual(manual: PlannerState["manual"]) {
    set({ ...current(), manual });
  },
  setPlanStart(planStart: number) {
    set({ ...current(), planStart });
  },
  reset() {
    set(fresh());
  },
};
