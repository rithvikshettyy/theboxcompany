"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SCOPE } from "@/lib/scope";
import type { Scope } from "@/lib/types";

type ScopeState = { scope: Scope; setScope: (next: Scope) => void };

const ScopeContext = createContext<ScopeState | null>(null);

/** One scope drives every number on the page (CLAUDE.md §4 rule 16). */
export function ScopeProvider({
  children,
  initial = DEFAULT_SCOPE,
}: {
  children: ReactNode;
  initial?: Scope;
}) {
  const [scope, setScope] = useState<Scope>(initial);
  const value = useMemo(() => ({ scope, setScope }), [scope]);
  return <ScopeContext value={value}>{children}</ScopeContext>;
}

export function useScope(): ScopeState {
  const ctx = use(ScopeContext);
  if (!ctx) throw new Error("useScope must be used inside <ScopeProvider>");
  return ctx;
}
