import { Fragment } from "react";

/** ₹ amounts with L/Cr, plain counts, decimals and percents. */
const NUMBER = /([−+]?₹?\d[\d,]*(?:\.\d+)?(?: (?:L|Cr)\b)?%?)/;
/** Splits "₹2.57 L" into the figure and its unit. */
const UNIT = /^(.*?)( (?:L|Cr))?$/;

/**
 * Renders a sentence with every number in JetBrains Mono (CLAUDE.md §3), so generated copy such
 * as insight sentences keeps tabular figures without hand-written markup. The L / Cr unit stays
 * in the text face so the space before it is not a full monospace cell.
 */
export function NumText({ text }: { text: string }) {
  return text.split(NUMBER).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const [, figure, unit] = UNIT.exec(part) ?? [part, part, undefined];
    return (
      <Fragment key={i}>
        <span className="num">{figure}</span>
        {unit}
      </Fragment>
    );
  });
}
