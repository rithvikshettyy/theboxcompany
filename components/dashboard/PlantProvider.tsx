"use client";

import { createContext, use, useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { SCOPE_LABEL } from "@/lib/scope";
import type { PlantData, Scope } from "@/lib/types";
import { useScope } from "./ScopeProvider";

export type PlantEntry =
  | { status: "loading" }
  | { status: "ready"; data: PlantData }
  | { status: "error"; message: string };

/** One cache per tab: each scope is fetched once, then switching back is instant. */
const entries = new Map<Scope, PlantEntry>();
const listeners = new Set<() => void>();
const LOADING: PlantEntry = { status: "loading" };

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function put(scope: Scope, entry: PlantEntry) {
  entries.set(scope, entry);
  listeners.forEach((l) => l());
}

async function load(scope: Scope) {
  put(scope, LOADING);
  try {
    const res = await fetch(`/api/plant?scope=${scope}`);
    if (!res.ok) throw new Error(String(res.status));
    put(scope, { status: "ready", data: (await res.json()) as PlantData });
  } catch {
    put(scope, {
      status: "error",
      message: `Could not load ${SCOPE_LABEL[scope].long}. Check the connection and try again.`,
    });
  }
}

const InitialContext = createContext<PlantData | null>(null);

/** Seeds the page with the scope the server already rendered, so first paint has real numbers. */
export function PlantProvider({ initial, children }: { initial: PlantData; children: ReactNode }) {
  return <InitialContext value={initial}>{children}</InitialContext>;
}

/** Data for the active scope, with a retry for the error state. */
export function usePlant(): PlantEntry & { retry: () => void } {
  const { scope } = useScope();
  const initial = use(InitialContext);
  const seeded = useMemo<PlantEntry | null>(
    () => (initial && initial.scope === scope ? { status: "ready", data: initial } : null),
    [initial, scope],
  );
  const read = useCallback(() => entries.get(scope) ?? seeded ?? LOADING, [scope, seeded]);
  const entry = useSyncExternalStore(subscribe, read, read);

  useEffect(() => {
    if (!entries.has(scope) && !seeded) void load(scope);
  }, [scope, seeded]);

  const retry = useCallback(() => void load(scope), [scope]);
  return { ...entry, retry };
}
