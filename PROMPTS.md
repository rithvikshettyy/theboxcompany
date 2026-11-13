# PROMPTS.md · FluteOps v2 build prompts for Claude Code

Run these prompts in order, one per Claude Code message. Each one is self-contained and relies on `CLAUDE.md` for the rules. Deploy after prompts 3, 6 and 9 so a working version is always live.

**Setup before Prompt 1**
```bash
npx create-next-app@latest fluteops --ts --tailwind --app --eslint
cd fluteops && mkdir reference
# copy v1 index.html → reference/v1.html, and CLAUDE.md → project root
claude
```

---

## Prompt 1 · Foundation and tokens

```
Read CLAUDE.md and reference/v1.html fully before writing code.

Set up the foundation for FluteOps v2:
1. Init shadcn/ui (dark only). Install motion, vitest, @vitejs/plugin-react.
2. Put the design tokens from CLAUDE.md §3 into globals.css as CSS variables and map them in tailwind config (bg, s1, s2, line, line2, tx, mu, mu2, kraft, kraft2, kraft3, red, amber, green, blue).
3. Load Space Grotesk and JetBrains Mono with next/font. Make the mono font the default for any element with class "num" and apply tabular-nums.
4. Build the page shell: header (logo with flute-wave SVG, plant name, scope tabs placeholder, live speed pill, clock), flute-wave divider, and the 12-column grid with the same section placement as v1. Use empty Card components with correct titles and subtitles.
5. Create a reusable <Card> with title, subtitle, actions slot and an <Insight> component (left border, icon, sentence).

Do not port data or charts yet. Run build and lint. Show me a summary and the file tree.
```

## Prompt 2 · Data model, API and tests

```
Port the v1 data model from reference/v1.html into typed TypeScript:
- lib/assumptions.ts: every constant from v1 (P, SH, REASONS, NODES, ORDERS, PLAN_RUNS, REELS, EDGE), with a comment explaining each business assumption.
- lib/model.ts: pure functions rng, shiftParams, calc, build(scope), trim optimiser (fitRun, planRun, bestFor), recsCalc, schedule, nodeStats. Keep the math identical to v1.
- lib/format.ts: inr(), num(), k() with en-IN formatting.
- lib/types.ts: Scope, ShiftParams, PlantData, Rec, Order, etc.
- app/api/plant/route.ts: GET ?scope= returns build(scope) plus recs, trim and orders as JSON. Validate scope and return 400 for unknown values.

Write tests in tests/model.test.ts:
- calc() reproduces the v1 numbers for Shift B baseline params
- OEE equals availability × performance × quality within 1e-9
- the trim optimiser never returns trim < EDGE and never exceeds the 1800 mm deckle
- each rec's simulate preset, run through the simulator math, returns that rec's ₹ within 5%
- inr(698000) === "₹6.98 L" and inr(18400000) === "₹1.84 Cr"

Run vitest and fix any failures. Report the test output.
```

## Prompt 3 · Hero and waterfall

```
Build the hero section using data from /api/plant (client fetch with SWR or a small hook, keyed by scope):
- HeroLeak: kicker "Profit leak · {scope label}", the ₹ leak in 72px --red, the lede sentence generated exactly like v1.
- Waterfall chart as an SVG React component (components/charts/Waterfall.tsx): rated capacity, then downtime, slow running, trim and rejects, then good board. Use gradients and labels as in v1, a ₹ label above each loss bar and the % under each label.
- Loss bars are buttons: click or Enter scrolls smoothly to the related section (#pareto, #heatmap, #trim).
- Add role="img", an aria-label that states the finding and a visually hidden <table> of the values.
- Add a skeleton loading state shaped like the chart, and an error state with a retry button.

No animation yet. Make it pixel-faithful to v1 at 1440px and readable at 390px (stack the labels, keep the ₹ visible).
Then deploy to Vercel and give me the URL.
```

## Prompt 4 · Fix first, line flow and KPI tiles

```
Build three sections from v1, faithful to its copy and math:
1. FixFirst: 3 recommendation cards sorted by ₹/month, each with title, explanation, ₹/month in --green mono, owner chip, effort chip and a "Simulate" button (wire it later).
2. LineFlow: 8 machine nodes plus WIP links, with Boiler and Glue Kitchen feeder chips on Single Facer. The Printer-Slotter gets the red "Constraint" badge. Clicking a node sets a shared `selectedMachine` (use a small Zustand store or React context) and shows the pressed state. Add the red insight banner from v1. On mobile the row scrolls horizontally with scroll-snap and a fade at the edges.
3. KpiTile ×6: label, status, value + unit, target, trend, sparkline (SVG) and the "₹ per point" footer. Fix the v1 bug where trend direction must come from the data, not be hardcoded.

Every number comes from the API data. Run build, lint and tests.
```

## Prompt 5 · Pareto, deckle planner, heatmap and orders

```
Port the remaining four charts as React SVG components, faithful to v1:
1. Pareto (components/charts/Pareto.tsx): Corrugator/Converting toggle, cumulative %, bars behind 80% highlighted in kraft, dimming driven by `selectedMachine`, and an insight sentence.
2. DecklePlanner: plan vs best rows per run, with order segments in kraft/blue, trim in red, a reel marker and trim % colored by threshold. Hovering a segment shows order details.
3. Heatmap: 7 days × 24 hours, shift-handover dashed lines, a color legend, and a tooltip per cell. Each cell is focusable with an aria-label.
4. OrderTable: Planned / By due date toggle, status tags (Late / Tight / OK), and the trade-off insight (late count vs extra flute changes).

Each chart gets an <Insight> sentence computed from the data, not hardcoded. Check each at 390px. Run build, lint and tests.
```

## Prompt 6 · Simulator and the recommendation link

```
Build the What-if simulator:
- 5 sliders (downtime, trim, rejects, running speed, P-S changeover) using shadcn Slider restyled to tokens, each showing its value, unit and baseline.
- Output panel: ₹ recovered per month (big, green or red by sign), ₹ per year, extra m² per month, truckloads, and a breakdown bar per lever.
- The baseline equals the scope average and shows +₹0. "Reset to baseline" restores it.
- Wire the "Simulate" buttons in FixFirst: apply that rec's preset and scroll to the simulator. The output must match the card's ₹ (the test from Prompt 2 guards this).
- Add an "Assumptions" disclosure listing every constant from lib/assumptions.ts, generated from the file rather than typed by hand.
- Put the output in an aria-live="polite" region.

Deploy and give me the URL. This is the safe submission version.
```

## Prompt 7 · Motion layer

```
Add motion following CLAUDE.md §5 exactly. Install only the components listed here.
1. ScopeTabs: Motion-Primitives AnimatedBackground (sliding kraft pill).
2. Hero ₹, KPI values and simulator ₹: Motion-Primitives AnimatedNumber (or SlidingNumber for the simulator), 600ms, ease-out-quint, formatted with inr().
3. Waterfall: bars grow from the baseline with a 60ms stagger on first load; on scope change they tween height and y only.
4. Pareto: rows re-rank with `layout` springs when scope or section changes.
5. OrderTable: rows re-sequence with AnimatePresence + layout when toggling Planned / By due date, and status tags crossfade.
6. Heatmap: Anime.js grid stagger reveal from the handover columns outward, once, when it enters the viewport.

Add a useReducedMotion guard so every one of these becomes instant. Confirm CLS stays 0 and there are no hydration warnings.
```

## Prompt 8 · Signature components

```
Add the signature pieces, restyled to kraft tokens with no default library look:
1. FixFirst cards → Kokonut UI Card Flip. Front: title, ₹/month, chips, Simulate. Back: the exact formula and inputs that produced the ₹ (e.g. "54 min × 5,200 boxes/h × ₹1.6 × 78 shifts"). The flip happens on a button ("How we got this"), not on hover, so it works on touch.
2. Card #1 only → Motion-Primitives BorderTrail in --kraft2, slow (6s).
3. Printer-Slotter node → a small React Bits Radar pulse behind the node only (opacity ≤ 0.35), off with reduced motion.
4. "Simulate" → Motion-Primitives MorphingDialog: the card morphs into a dialog with the simulator preset applied. Keep the inline simulator section as well.
5. KPI tiles → React Bits SpotlightCard hover glow in kraft at low intensity.

Check keyboard access for the flip and the dialog (focus trap, Esc closes, focus returns to the trigger).
```

## Prompt 9 · Intro screen (optional, skip if behind)

```
Build an optional intro overlay that shows once per session:
- Background: React Bits Soft Aurora tuned to kraft and amber at low saturation, lazy-loaded with next/dynamic ssr:false. If WebGL is unavailable, fall back to a static gradient plus the dither texture image in /public/texture-corrugator.webp.
- Headline: SplitText reveal of "₹{leak} leaked today." using live data, then the subline "Here is where, and what to fix first."
- An "Enter dashboard" button plus auto-dismiss after 2.5s. Esc skips it. Remember dismissal in sessionStorage inside try/catch.
- Reduced motion: no intro, go straight to the dashboard.

The dashboard below must not render late or shift layout because of this. Deploy and give me the URL.
```

## Prompt 10 · Responsive, accessibility and performance pass

```
Do a full quality pass against CLAUDE.md §4, §7, §8 and §10:
1. Check every section at 1440, 1280, 1024, 768 and 390px. Fix overflow, clipped labels and tap targets under 44px.
2. Run an axe check (install @axe-core/playwright as a dev dependency), fix every violation, and verify the contrast of --mu and --mu2 text.
3. Run Lighthouse on a production build. Report the scores, then fix the top issues until performance ≥ 90 and accessibility ≥ 95.
4. Confirm the first-load JS size for "/" from the build output is under 180 KB, and code-split anything heavier.
5. Search the codebase for em dashes in UI strings and replace them.

Give me a table of what you found and what you fixed.
```

## Prompt 11 · Adversarial review (fresh eyes)

```
Act as a demanding product designer and a factory owner reviewing this dashboard for the first time. Do not defend existing choices.
1. Run the 5-second test: what does the page say first? Is that the right message?
2. For each section: does it lead to a decision? What would you cut?
3. Check every ₹ figure against lib/model.ts for one scope (Today) and list any mismatch between the hero, waterfall, recs, KPI tiles and simulator.
4. List the 10 highest-impact issues ranked by severity, with file and line.
Then fix the top 5 and report what changed.
```

## Prompt 12 · Submission README

```
Write README.md for reviewers:
- One-line pitch and the live URL
- "The problem": 3 sentences on why corrugation plants leak money
- "What makes it different": 6 bullets (₹-first waterfall, constraint detection, deckle optimiser, sequencing trade-off, what-if simulator, ₹ per KPI point)
- "How the numbers work": link to lib/assumptions.ts and a short formula list
- "Tech": stack, architecture diagram as a Mermaid code block (UI → /api/plant → model), and how to swap in a real MES/ERP feed
- "Quality": Lighthouse scores, test count, a11y notes
- "Run locally" commands
No em dashes. Keep it under 120 lines.
```

---

## Utility prompts (use any time)

**Bug hunt**
```
Something is wrong: <describe what you see, the scope and the screen size>.
Reproduce it first, find the root cause, explain it in two sentences, fix it, add a test if it is model logic, and confirm build, lint and tests pass.
```

**Design critique of one section**
```
Screenshot the <section> at 1440 and 390px with Playwright and look at it. Critique it against CLAUDE.md §3 to §5 as a senior product designer: hierarchy, spacing, alignment, contrast, copy. List the issues, then fix them.
```

**Keep it on track**
```
Before writing code, restate the task in 3 bullets, list the files you will touch, and flag anything in the request that conflicts with CLAUDE.md.
```
