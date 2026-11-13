"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** Gap kept between the tooltip and the viewport edge, in px. Matches the 16px page gutter. */
const EDGE_GUTTER = 16;

type TermProps = { k: GlossaryKey; children: ReactNode };

/**
 * Plant jargon with a definition on hover, focus or tap. Esc dismisses it (WCAG 1.4.13).
 * The tooltip is display:none when closed, so it can never widen the page.
 */
export function Term({ k, children }: TermProps) {
  const tipId = useId();
  const tipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!open || !tip) return;
    const { left, right } = tip.getBoundingClientRect();
    // Layout can only be measured after render, so this effect sets state on purpose.
    setShift((prev) => {
      // Undo the previous shift so we measure the tooltip's natural position.
      const overflowRight = right - prev - (window.innerWidth - EDGE_GUTTER);
      const overflowLeft = EDGE_GUTTER - (left - prev);
      if (overflowRight > 0) return -overflowRight;
      if (overflowLeft > 0) return overflowLeft;
      return 0;
    });
  }, [open]);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={tipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="cursor-help rounded-sm [text-transform:inherit] underline decoration-mu decoration-dotted underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
      >
        {children}
      </button>
      <span
        ref={tipRef}
        id={tipId}
        role="tooltip"
        style={{ transform: `translateX(${shift}px)` }}
        className={cn(
          "absolute top-full left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-chip border border-line2 bg-s2 px-3 py-2",
          "text-left text-xs font-normal tracking-normal text-tx normal-case shadow-card",
          open ? "block" : "hidden",
        )}
      >
        {GLOSSARY[k]}
      </span>
    </span>
  );
}
