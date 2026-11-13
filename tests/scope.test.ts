import { describe, expect, it } from "vitest";
import { DEFAULT_SCOPE, SCOPES, SCOPE_LABEL, SHIFT_SCOPE_COUNT, isScope } from "@/lib/scope";

describe("scope", () => {
  it("accepts exactly the six API scopes", () => {
    for (const s of ["A", "B", "C", "today", "7d", "30d"]) expect(isScope(s)).toBe(true);
    for (const s of ["a", "D", "", "week", 7, null, undefined]) expect(isScope(s)).toBe(false);
  });

  it("labels every scope and defaults to one of them", () => {
    expect(SCOPES.every((s) => SCOPE_LABEL[s].long && SCOPE_LABEL[s].short)).toBe(true);
    expect(SCOPES).toContain(DEFAULT_SCOPE);
  });

  it("lists the three shifts before the periods", () => {
    expect(SCOPES.slice(0, SHIFT_SCOPE_COUNT)).toEqual(["A", "B", "C"]);
  });
});
