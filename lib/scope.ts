import type { Scope, ScopeLabel } from "./types";

export const SCOPES = ["A", "B", "C", "today", "7d", "30d"] as const satisfies readonly Scope[];

/** Shifts first, then periods. The tabs draw a divider at this index. */
export const SHIFT_SCOPE_COUNT = 3;

export const DEFAULT_SCOPE: Scope = "today";

export const SCOPE_LABEL: Record<Scope, ScopeLabel> = {
  A: { long: "Shift A", short: "A" },
  B: { long: "Shift B", short: "B" },
  C: { long: "Shift C", short: "C" },
  today: { long: "Today", short: "Today" },
  "7d": { long: "Last 7 days", short: "7d" },
  "30d": { long: "Last 30 days", short: "30d" },
};

export function isScope(value: unknown): value is Scope {
  return typeof value === "string" && (SCOPES as readonly string[]).includes(value);
}
