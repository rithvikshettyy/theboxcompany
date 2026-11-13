import { BRAND, P } from "./assumptions";

/**
 * Company website content in one place. Replace the placeholders with real details before going
 * live. The email addresses use the reserved `.example` domain so they can never reach a stranger.
 */
export const COMPANY = {
  name: BRAND.name,
  tagline: "Corrugated boxes, made from the reel up.",
  summary:
    "We make corrugated boxes and sheets in one plant, from paper reels to stacked pallets, and plan every shift by the numbers so orders leave on time.",
  /** PLACEHOLDER: replace with the real enquiries address. */
  email: "hello@theboxcompany.example",
  /** PLACEHOLDER: replace with the real careers address. */
  careersEmail: "careers@theboxcompany.example",
} as const;

export type Product = { name: string; body: string; spec: string };

/** What the plant makes. Specs follow the line in lib/assumptions.ts. */
export const PRODUCTS: readonly Product[] = [
  {
    name: "Shipping cartons",
    body: "The everyday regular slotted carton: four flaps, glued or stitched, sized to your product.",
    spec: "3, 5 or 7 ply",
  },
  {
    name: "Printed cartons",
    body: "Flexo printed on the box line in up to four colours, for retail-ready and branded packs.",
    spec: "Up to 4 colours",
  },
  {
    name: "Die-cut boxes and trays",
    body: "Shaped boxes, trays and inserts cut to your drawing, for e-commerce and display.",
    spec: "Cut to your drawing",
  },
  {
    name: "Corrugated sheets",
    body: "Board sold flat and cut to size, for converters and in-house packing lines.",
    spec: `Up to ${P.deckleMm.toLocaleString("en-IN")} mm wide`,
  },
];

/** Flute guide for the products page. Heights are typical industry values. */
export const FLUTES = [
  { flute: "E", height: "about 1.5 mm", use: "Fine print and small retail packs." },
  { flute: "B", height: "about 3 mm", use: "A flat surface for print, good crush strength." },
  { flute: "C", height: "about 4 mm", use: "More cushioning for heavier or fragile goods." },
  { flute: "BC", height: "about 7 mm", use: "Double wall for heavy loads and export." },
] as const;

/** How the plant is run, for the about page. */
export const VALUES = [
  {
    title: "Measured, not guessed",
    body: "Every stop, slow minute and strip of trim on the line is priced in rupees on our own dashboard, so we fix what costs most first.",
  },
  {
    title: "Built to the spec",
    body: "Board grade, flute and print are checked at the start of every shift, not at the end of the order.",
  },
  {
    title: "One plant, one team",
    body: "Reels, corrugator, printing and gluing sit under one roof, so nothing waits on a supplier between steps.",
  },
] as const;

export type Role = { title: string; team: string; shift: string; body: string };

/** PLACEHOLDER: typical roles for a box plant. Replace with the real openings. */
export const ROLES: readonly Role[] = [
  {
    title: "Corrugator operator",
    team: "Corrugator",
    shift: "Rotating shifts",
    body: "Run the single facer and double backer, splice reels and keep board quality in spec.",
  },
  {
    title: "Printer-slotter operator",
    team: "Converting",
    shift: "Rotating shifts",
    body: "Set up plates and ink, run changeovers fast and keep the box line moving.",
  },
  {
    title: "Quality inspector",
    team: "Quality",
    shift: "Day shift",
    body: "Test board strength and print, sign off first-off samples and trace rejects to their cause.",
  },
  {
    title: "Production planner",
    team: "Planning",
    shift: "Day shift",
    body: "Combine orders across the deckle, sequence runs against due dates and keep trim low.",
  },
];

/** Plant rhythm from the model, for the careers page. */
export const SHIFT_PATTERN = `${P.shiftsPerDay} shifts a day, ${P.workingDaysPerMonth} working days a month`;

export type Service = { title: string; body: string; image: string; alt: string };

/**
 * PLACEHOLDER: what the company does for a customer beyond making the box, for the homepage
 * carousel. Confirm each one is offered before going live. Images are drawings, not photos.
 */
export const SERVICES: readonly Service[] = [
  {
    title: "Box design and sampling",
    body: "We size the box to your product and cut a sample before the run.",
    image: "/services/design.jpg",
    alt: "A box drawing with fold lines, and the sample box cut from it",
  },
  {
    title: "Board selection and testing",
    body: "We pick the flute and paper grade for your load, then crush-test it.",
    image: "/services/testing.jpg",
    alt: "Five-ply corrugated board between the plates of a compression tester",
  },
  {
    title: "Flexo printing",
    body: "Your artwork printed on the box line in up to four colours.",
    image: "/services/printing.jpg",
    alt: "Print rollers inking a sheet, and a printed carton",
  },
  {
    title: "Die-cutting",
    body: "Trays, inserts and shaped boxes cut to your drawing.",
    image: "/services/diecut.jpg",
    alt: "A flat blank with cut lines, and the tray it folds into",
  },
  {
    title: "Stock and call-off",
    body: "We hold finished boxes and send them when you call for them.",
    image: "/services/stock.jpg",
    alt: "A rack of finished cartons held in stock",
  },
  {
    title: "Palletised delivery",
    body: "Strapped and labelled pallets, sent to your dock.",
    image: "/services/delivery.jpg",
    alt: "A strapped and labelled pallet of cartons",
  },
];
