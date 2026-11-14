"use client";

import { Fragment } from "react";
import { SCOPES, SCOPE_LABEL, SHIFT_SCOPE_COUNT } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { useScope } from "./ScopeProvider";

/**
 * Shift A/B/C, then Today / 7 days / 30 days. Plain toggle buttons for now;
 * Prompt 7 swaps the active fill for the sliding AnimatedBackground pill.
 */
export function ScopeTabs({ className }: { className?: string }) {
  const { scope, setScope } = useScope();

  return (
    <div className={className}>
      <div
        role="group"
        aria-label="Scope: every number on the page follows this"
        className="grid grid-cols-6 gap-1.5 md:inline-flex md:items-center md:gap-2"
      >
        {SCOPES.map((s, i) => {
          const active = s === scope;
          const { long, short } = SCOPE_LABEL[s];
          return (
            <Fragment key={s}>
              {i === SHIFT_SCOPE_COUNT ? (
                <span aria-hidden="true" className="mx-2 hidden h-5 w-px bg-line2 md:block" />
              ) : null}
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setScope(s)}
                className={cn(
                  "h-11 min-w-11 rounded-full px-2 text-sm transition-colors duration-150 md:h-9 md:px-4",
                  active ? "bg-brand font-medium text-bg" : "text-mu hover:text-tx",
                )}
              >
                <span className="md:hidden">{short}</span>
                <span className="hidden md:inline">{long}</span>
              </button>
            </Fragment>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        Showing {SCOPE_LABEL[scope].long}
      </p>
    </div>
  );
}
