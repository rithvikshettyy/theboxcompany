"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import type { Scope, ShiftParams } from "@/lib/types";
import { usePlant } from "./PlantProvider";
import { useScope } from "./ScopeProvider";

type SimState = {
  /** Scope baseline; null while loading. */
  base: ShiftParams | null;
  /** What the sliders are set to; equals `base` until moved. */
  params: ShiftParams | null;
  set: (next: ShiftParams) => void;
  /** Applies a fix's preset on top of the baseline (Fix first → Simulate). */
  apply: (preset: Partial<ShiftParams>) => void;
  reset: () => void;
};

const SimContext = createContext<SimState | null>(null);

/** Slider settings shared by the simulator and the Fix first cards. A new scope starts at its baseline. */
export function SimulatorProvider({ children }: { children: ReactNode }) {
  const plant = usePlant();
  const { scope } = useScope();
  const base = plant.status === "ready" ? plant.data.base : null;
  const [moved, setMoved] = useState<{ scope: Scope; params: ShiftParams } | null>(null);
  const params = moved && moved.scope === scope ? moved.params : base;

  const value = useMemo<SimState>(
    () => ({
      base,
      params,
      set: (next) => setMoved({ scope, params: next }),
      apply: (preset) => base && setMoved({ scope, params: { ...base, ...preset } }),
      reset: () => setMoved(null),
    }),
    [base, params, scope],
  );
  return <SimContext value={value}>{children}</SimContext>;
}

export function useSimulator(): SimState {
  const ctx = use(SimContext);
  if (!ctx) throw new Error("useSimulator must be used inside <SimulatorProvider>");
  return ctx;
}
