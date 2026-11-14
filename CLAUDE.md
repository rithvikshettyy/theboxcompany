# CLAUDE.md · The Box Company

Claude Code reads this file automatically at the start of every session. It holds the rules for this project, and every task must follow them. If a request conflicts with a rule, say so before you write code.

---

## 1. Product context

**The Box Company** (renamed from FluteOps on 2026-11-13; code paths and the repo folder keep the old name) is an operational efficiency dashboard for a corrugated box plant (corrugator + converting line).

**Users**
| User | Device | Question they bring |
|---|---|---|
| Plant owner | Laptop, office, 9 AM | "Where did money leak and what do I fix first?" |
| Production manager | Desktop, office | "Which shift, machine and cause is hurting us?" |
| Shift supervisor | Phone or tablet, shop floor | "Am I on target right now?" |

**Two parts:** the public company website (`/`, `/about`, `/products`, `/careers`, `/contact`) and the plant dashboard (`/dashboard`), linked from the site header. Operations figures (₹ leak, causes, fixes) appear only on the dashboard.

**Core idea of the dashboard:** turn operational losses into ₹, find the real constraint and rank fixes by ₹ recovered per month.

**Reference:** `reference/v1.html` is the working v1 prototype. Its data model, ₹ math, copy and layout are the source of truth unless a prompt says otherwise. Port it; do not reinvent it.

---

## 2. Stack and structure

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- Motion (`motion/react`) for all UI animation; GSAP only for the optional scroll story; Anime.js only for the heatmap reveal
- Charts are hand-written React components: SVG for lines, HTML/CSS for bars and grids (they reflow better on phones). Do not add Recharts, Chart.js or D3 unless asked.
- Vitest for unit tests on the model

```
app/
  page.tsx                 company homepage: HomeHero (live GlimmerVale meadow), "How a box is made" (BoxIntro scroll story), what we do (services carousel), what we make, why us, careers teaser
  about/ products/ careers/ contact/   company site pages (content from lib/company.ts)
  dashboard/layout.tsx     header (views sub-nav, scope tabs on Overview and Production), providers
  dashboard/page.tsx       Overview: ₹ leak, waterfall, line flow, fix first, KPIs, causes, heatmap, deckle, orders, simulator
  dashboard/{production,materials,quality,orders}/   operations views: 4 headline stats, then 2 to 4 sections
  api/plant/route.ts       GET ?scope=A|B|C|today|7d|30d → PlantData JSON
components/
  brand/                   Brand, FluteWave (logo + divider), shared by home and dashboard
  charts/                  Waterfall, Pareto, DecklePlanner, Heatmap, Sparkline
  site/                    SitePage (header, theme blend, footer), Section, ContactForm, MobileMenu, home/ sections. No invented customers, figures or claims; placeholders live in lib/company.ts
  originkit/               vendored Originkit components (GlimmerVale), kept as shipped; excluded from source-style tests
  reactbits/               vendored React Bits components (FlexCarousel.jsx + .css, WebGL2 via ogl), kept as shipped; typed by FlexCarousel.d.ts
  intro/                   BoxIntro (box scroll story, section 2 of the homepage), HeroBackdrop (GlimmerVale meadow for HomeHero, lazy, mounted only while on screen), Box3D (CSS 3D box), useScrollProgress, boxMath (pure, tested)
  dashboard/               DashboardView, HeroLeak, FixFirst, LineFlow, KpiTile, OrderTable, Simulator, ScopeTabs
  copilot/                 Factory Copilot (/dashboard/copilot): Chat, KnowledgeBase, SourceCard. Talks to /api/copilot/*; shows demo mode until ANTHROPIC_API_KEY is set
  planner/                 Production Planner (/dashboard/planner): Timeline (Gantt, drag and drop), OrderTable, OrderForm, WhatIfPanel, PlannerInsights, ExportBar. UI only; all scheduling lives in lib/planner/
  ops/                     operations views (Stats: PageIntro, StatRow, Tag) and their parts
  ui/                      shadcn + copied library components (restyled)
lib/
  assumptions.ts           every constant (₹/m², speeds, rates). No magic numbers elsewhere.
  model.ts                 pure functions: build(scope), calc(params), recs(), trim optimiser
  format.ts                inr(), num(), pct()
  ops.ts                   production, materials, quality and orders figures (pure, tested)
  copilot/                 RAG: extract (PDF via unpdf, DOCX, TXT, CSV), chunk (overlap, page-exact), embed (local hash, or OpenAI if OPENAI_API_KEY), store (JSON file in .data/, swap for a vector DB), retrieve (top-k, threshold, doc filter), chat (stream, refusal sentence, Claude if ANTHROPIC_API_KEY). Documents are untrusted data: scanned, escaped, tagged. Tests in tests/copilot.test.ts
  planner/                 scheduling engine (engine.ts heuristic, calendar, rules, metrics, insights, whatif, moves, validate, export, store, sample demo data). Pure and tested (tests/planner.test.ts). A heuristic, not an optimiser; demo data is labelled as such
  records.ts               sample plant records: reel stock, vendors, tests, dispatch, quotes (replace with ERP data)
  viz.ts                   chart helpers (waterfall bars, Pareto 80%, plan clock, trends)
  types.ts
tests/model.test.ts
```

---

## 3. Design tokens (use these, never raw hex in components)

```css
--bg:#0c1d45; --s1:#112555; --s2:#172e63; --line:#24417d; --line2:#30528f;
--tx:#f5f8fc; --mu:#aebfdd; --mu2:#6c86b8;
--brand:#e6eefa; --brand2:#a3c6ff; --brand3:#4d70b4;
--red:#ff8370;  --amber:#f0b44a; --green:#7dd096; --blue:#7ab0ff;
```

Light theme (`[data-theme="light"]`, used on the homepage):

```css-light
--bg:#f4f6f9; --s1:#ffffff; --s2:#e9eef4; --line:#d6deea; --line2:#bfccdc;
--tx:#0c1d45; --mu:#465a80; --mu2:#8494ab;
--brand:#0c1d45; --brand2:#2457b3; --brand3:#9db2d4;
--red:#c03a25;  --amber:#94600a; --green:#1c7a43; --blue:#2560c4;
```

- **Themes:** the dashboard is light (`data-theme="light"`). The homepage hero is dark (GlimmerVale night meadow); the page then blends between light and dark as each section takes over the screen. The blend is tied to scroll position, not time: `.theme-mix` makes every token a `color-mix` of its light and dark value, and `components/home/ThemeScroll.tsx` sets `--dark` (0 to 1) across half a screen of scroll around each hand-over.

- **Palette:** dark blue and white (changed from kraft brown on 2026-11-13 at the owner's request; darks are a clear navy blue, never near-black). `--brand` is near-white for primary actions and neutral data, `--brand2` is the light blue for labels, links and focus, and `--brand3` is a deep blue for decoration only. PROMPTS.md was written before the change: read "kraft" there as these `brand` tokens.

- **Fonts:** Poppins for body, UI and every number (`.num` adds tabular figures; JetBrains Mono was dropped on 2026-11-13 to match the site). Archivo at 125% width for display headings (`.display`), a free stand-in for an expanded face like Akira Expanded; swap in Akira only with a licence. The logo is Helvetica (`font-logo`, system font, Arial where Helvetica is not installed).
- **Type scale:** 11 / 12 / 13 / 15 / 20 / 26 / 42 / 72 px. The company site uses plain sentence-case headings (`.display`), no eyebrow labels and no boxed cards. The dashboard (since 2026-11-13, at the owner's request, after a reference design) uses a blue sky gradient behind the header and hero (`.dash-sky`, white text via `.on-sky`), pill navigation, and large-radius white cards (`rounded-3xl bg-s1 shadow-card`) that overlap the sky; its one glass card is tinted dark so white text passes AA.
- **Spacing:** 4 px grid. Card padding is 16 to 18 px and the grid gap is 16 px.
- **Radius:** 14 px for cards, 10 to 12 px for inner panels, 6 to 8 px for chips and buttons.
- **Surfaces:** cards use a subtle vertical gradient from `--s1` to slightly darker with a 1 px `--line` border. Use one soft shadow at most. No glassmorphism over data.
- **Identity:** the logo is the name alone, "The Box Company" in Helvetica, with no icon. The flute-wave motif (sine wave) appears only in the intro machine. The dashboard uses the same header, type and hairline layout as the company site.

---

## 4. UX rules (non-negotiable)

**Hierarchy**
1. One screen, one question. The ₹ profit leak is the largest element on the page.
2. The 5-second test: a new viewer can say what is wrong and what to do within 5 seconds.
3. Read order is problem (₹ leak), then cause (waterfall, constraint), then action (Fix first), then detail.

**Numbers**
4. Lead with money, not percentages. Show ₹ first and the % second.
5. Every number has a unit and a comparison (target, previous period or baseline). A bare number is a bug.
6. Use Indian formatting: `₹2.36 L`, `₹1.84 Cr`, `2,23,327 m²` (`en-IN`).
7. Right-align numbers in tables and use monospace for them.

**Charts**
8. Every chart has an insight sentence under it that states the finding with a number. A chart without one gets cut.
9. Bars start at zero. No pie, donut, 3D or dual-axis charts.
10. Label data directly; use a legend only when direct labels don't fit.
11. Tooltips add detail but never hold the only copy of key information.
12. Pick the chart a practitioner would draw: a waterfall for loss bridges, a Pareto for causes, a heatmap for hour × day patterns.

**Color**
13. Red means loss or late, green means recovered or on target, amber means watch. Never use them decoratively.
14. Never rely on color alone. Pair it with a label, sign (+/−) or icon.
15. `--brand` (white) is the accent for neutral data and primary actions; `--brand2` (light blue) marks labels and focus.

**Interaction**
16. Scope tabs change every number on the page. Show the active scope in the hero label.
17. Every filter or selection can be cleared with one click and is shown in text ("Filtered to Boiler, click again to clear").
18. Every recommendation can be simulated, and its preset reproduces the ₹ on its card exactly.
19. Every state is designed: loading (skeletons shaped like the real content), empty, error (plain sentence + retry).
20. Touch targets are at least 44 × 44 px on mobile.

**Copy**
21. Use plain Indian-English and verbs: "Stage reels before Shift C starts", not "Reel logistics optimisation".
22. Put plant jargon (OEE, deckle, flute, SMED) in a tooltip the first time it appears.
23. No em dashes anywhere in UI copy. Use a period, comma or "·".
24. Write `₹` before the number, with no space.

---

## 5. Motion rules

- Motion must explain a change in the data. If removing an animation loses no information, remove it.
- **Durations:** 150 to 300 ms for UI and data transitions; at most 700 ms for the hero count-up. A timed intro is at most 2 s; the scroll intro is paced by the user, never autoplays and is always skippable.
- **Easing:** `[0.22, 1, 0.36, 1]` (ease-out-quint) for entering, `easeInOut` for re-layout and springs (`stiffness 300, damping 30`) for re-ranking.
- **Allowed motions:** number roll or count to a new value, bar grow and re-rank (`layout`), row re-sequence (`AnimatePresence` + `layout`), a single pulse on the constraint node, a staggered heatmap reveal, the card flip on recommendations, and a dialog morph into the simulator.
- **Banned motions:** animated backgrounds behind charts, scramble or glitch text on numbers, parallax, custom cursors, click sparks, autoplay loops longer than 3 s in the dashboard.
- `prefers-reduced-motion: reduce` turns off the intro, pulse, stagger and flip animations. Data still updates instantly.
- Animate only `transform` and `opacity`, plus SVG attributes on charts. The homepage theme blend is not an animation: colours follow scroll position directly. Cumulative layout shift must stay at 0.

---

## 6. Component library rules

Copy components in, then restyle them to the tokens. Do not ship the default look of any library.

| Need | Use | From |
|---|---|---|
| Sliding scope tabs | AnimatedBackground | Motion-Primitives |
| ₹ counters | AnimatedNumber / SlidingNumber | Motion-Primitives |
| Top recommendation highlight | BorderTrail (card #1 only) | Motion-Primitives |
| Recommendation to simulator | MorphingDialog | Motion-Primitives |
| Recommendation detail | Card Flip (front: action + ₹, back: the maths) | Kokonut UI |
| KPI hover | SpotlightCard | React Bits |
| Constraint pulse | Radar (small, scoped to one node) | React Bits |
| Intro background (optional) | Soft Aurora or a Unicorn Studio scene in deep blue tones | React Bits / Unicorn Studio |
| Intro headline | SplitText / TextEffect | React Bits / Motion-Primitives |
| Industrial texture | Dither or halftone image exported as static WebP | Ditther / ASCIInator |
| Heatmap reveal | `stagger` with grid option | Anime.js |

- Allow one "wow" effect per page, and only on the intro screen. Exception (owner request, 2026-11-14): the homepage services section uses React Bits FlexCarousel (`components/site/home/ServicesCarousel.tsx`), mounted only near the viewport, with a static grid fallback without WebGL2. Its drawings live in `public/services/` and hold no text; captions are DOM.
- Lazy-load WebGL with `next/dynamic` and `ssr:false`, and fall back to a static image if WebGL fails.
- Install a library component only when a prompt asks for it. No speculative installs.

---

## 7. Accessibility (WCAG 2.1 AA)

- Text contrast is at least 4.5:1 (check `--mu` on `--s1`) and large text at least 3:1.
- Every interactive element is reachable by keyboard and shows a visible `:focus-visible` ring in `--brand2`.
- Every chart SVG has `role="img"`, an `aria-label` that states the finding, and a visually hidden data table.
- Live values (simulator output, scope change) sit in an `aria-live="polite"` region.
- Never put meaningful text inside a canvas or WebGL layer.

---

## 8. Performance budget

- Lighthouse 90+ on performance and 95+ on accessibility, measured on the deployed URL.
- First-load JS for the dashboard route stays under 180 KB gzipped, with WebGL and GSAP excluded from it.
- Fonts load via `next/font` with `display: swap`.
- Animations hold 60 fps on a mid-range Android phone. If one stutters, simplify it.

---

## 9. Code rules

- Use TypeScript strict mode, no `any` and no non-null assertions without a comment.
- `lib/model.ts` is pure and deterministic (a seeded RNG), and every ₹ formula is unit-tested.
- Components stay under about 150 lines; split by responsibility.
- No hardcoded numbers in components. Import them from `lib/assumptions.ts`.
- Server components by default; use `"use client"` only where there is state or motion.
- After each task, run `npm run build`, `npm run lint` and `npx vitest run`. All of them must pass before you report done.

---

## 10. Definition of done (every task)

- [ ] It matches the tokens and rules above, with no default library styling left
- [ ] It works at 1440, 1024, 768 and 390 px with no horizontal scroll except the line flow
- [ ] It works by keyboard and has reduced-motion handling
- [ ] It has no console errors, and build, lint and tests pass
- [ ] Its ₹ numbers agree across the hero, waterfall, recommendations and simulator for the same scope
- [ ] It ends with a short summary: what changed, the files touched and anything left undone
