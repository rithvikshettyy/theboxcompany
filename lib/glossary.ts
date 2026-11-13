import { P } from "./assumptions";

/** Plant jargon explained in a tooltip the first time it appears (CLAUDE.md §4 rule 22). */
export const GLOSSARY = {
  oee: "Overall equipment effectiveness: availability × performance × quality, as one %.",
  deckle: `Usable width of the corrugator, ${P.deckleMm.toLocaleString("en-IN")} mm. Orders are combined across it and the leftover strip is trim.`,
  trim: "The strip cut off the edge of the board because the orders did not fill the deckle. Paid for, then thrown away.",
  flute: "The wavy middle layer of corrugated board. Switching flute type (B, C, E) forces a changeover.",
  smed: "Single-minute exchange of die. Prepare everything before the machine stops so the changeover is short.",
  wip: "Work in progress: boards waiting between two machines.",
  constraint: "The slowest machine on the line. It sets the output of the whole plant.",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
