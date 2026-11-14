import { OPS, P, PLANNER, SHIFT_START_HOUR, TARGET, WASTE_PER_M2 } from "../assumptions";
import { COMPANY, FLUTES, PRODUCTS, ROLES, SERVICES, SHIFT_PATTERN, VALUES } from "../company";
import { GLOSSARY } from "../glossary";
import { chunkPages } from "./chunk";
import { localEmbed } from "./embed";
import { scanForInjection } from "./prompt";
import type { Chunk, DocRecord, Page } from "./types";

/**
 * The website's own documentation, searched by the "Ask" button on every dashboard page. It is
 * built from the app's real content and constants (so it cannot drift from what the app does) plus
 * short written guides. It is separate from the knowledge base of uploaded factory documents, and
 * it works with no API key.
 */
type Doc = { name: string; pages: Page[] };

const p = (text: string[]): Page[] => text.map((t, i) => ({ page: i + 1, text: t }));
const rupee = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;

export const SITE_DOCS: Doc[] = [
  {
    name: "About The Box Company",
    pages: p([
      `${COMPANY.name}. ${COMPANY.tagline} ${COMPANY.summary}\nEnquiries: ${COMPANY.email}. Careers: ${COMPANY.careersEmail}. These addresses are placeholders until the real ones are set.`,
      `How the plant is run. ${VALUES.map((v) => `${v.title}: ${v.body}`).join("\n")}`,
      `What the company does for a customer. ${SERVICES.map((s) => `${s.title}: ${s.body}`).join("\n")}`,
    ]),
  },
  {
    name: "Products and flute guide",
    pages: p([
      `What the plant makes. ${PRODUCTS.map((x) => `${x.name}: ${x.body} (${x.spec}).`).join("\n")}`,
      `Flute guide. ${FLUTES.map((f) => `${f.flute} flute, ${f.height}: ${f.use}`).join("\n")}\nB flute is finer and flatter, so it prints well. C flute is taller, so it cushions and stacks better. BC is double wall for heavy loads and export.`,
    ]),
  },
  {
    name: "Plant and machines overview",
    pages: p([
      `The demonstration plant (synthetic). One plant, one line: a corrugator (reel stand, single facer, double backer, slitter-scorer, cut-off and stacker) feeding a converting line (Printer-slotter, Folder-gluer, Bundler). The corrugator works across a ${P.deckleMm} mm deckle at a rated ${P.ratedSpeed} m/min. The Printer-slotter, rated ${P.psBoxesPerHour} boxes an hour, is the constraint machine. The plant runs ${SHIFT_PATTERN}. The factory manuals, SOPs, quality limits, safety rules, supplier specifications and the October breakdown log are in the Factory Copilot knowledge base: use "Add demo documents" there, then ask about them.`,
    ]),
  },
  {
    name: "Careers",
    pages: p([`Jobs and careers at The Box Company. Which job roles are open: these vacancies are placeholders until the real openings are set. ${ROLES.map((r) => `${r.title}, ${r.team}, ${r.shift}: ${r.body}`).join("\n")}\nThe plant runs ${SHIFT_PATTERN}.`]),
  },
  {
    name: "Dashboard guide: overview",
    pages: p([
      `The Overview page answers where money leaks and what to fix first. At the top is the profit leak in rupees for the period you pick with the tabs: Shift A, Shift B, Shift C, Today, Last 7 days or Last 30 days. Every number on the page follows that choice. Next to it is today's plan: tonnes made against the plan.`,
      `Below that: four focus cards (production, materials, quality, orders), a production chart for the last 14 days, the Action centre, a shift comparison, a Needs attention list, the waterfall from rated capacity to good board, a Pareto of stop causes, the line flow with the constraint machine, six KPI tiles, a downtime heatmap by hour and day, today's order sequence, the deckle planner and the simulator.`,
      `Action centre: the top four fixes ranked by rupees a month, each with the problem, the action, an owner, the effort and a priority. High priority means the fix wins back 5% or more of the monthly leak, Medium means 2% or more. The Simulate button loads that fix into the simulator, which shows the same rupee figure.`,
      `Shift comparison: Shift A, B and C side by side over the period, with OEE, speed, downtime and rupees leaked. It names the weakest shift and lists what separates it from the best, each priced as what it would gain a month by matching the best shift on that one thing. The causes overlap a little, so do not add them up.`,
    ]),
  },
  {
    name: "Dashboard guide: how the numbers work",
    pages: p([
      `Profit leak. The leak is the margin the line could have earned at rated speed and did not. It has four parts: downtime (corrugator stopped), slow running (below the rated ${P.ratedSpeed} m/min), trim (edge strip cut off) and rejects. Stopped and slow board loses the margin of ${rupee(P.marginPerM2)} per m². Trim and rejects cost ${rupee(WASTE_PER_M2)} per m²: the margin never earned plus the paper not won back as scrap.`,
      `OEE is availability × performance × quality. Availability is the share of the shift the corrugator runs. Performance is running speed over the rated speed of ${P.ratedSpeed} m/min. Quality is the board left after trim and rejects. The targets are availability ${TARGET.availability}%, speed ${TARGET.speed} m/min, trim ${TARGET.trimPct}% and rejects ${TARGET.rejectPct}%, which together give an OEE target of ${TARGET.oee}%. The daily plan is rated output at that OEE target: ${OPS.dailyTargetM2.toLocaleString("en-IN")} m² a day.`,
      `Plant jargon. OEE: ${GLOSSARY.oee} Deckle: ${GLOSSARY.deckle} Trim: ${GLOSSARY.trim} Flute: ${GLOSSARY.flute} SMED: ${GLOSSARY.smed} WIP: ${GLOSSARY.wip} Constraint: ${GLOSSARY.constraint}`,
      `The constraint. The Printer-Slotter is the slowest machine, so it sets the output of the whole plant. Its changeover time is the biggest single saving, and the fix for it is priced from the box margin per box. That saving is not part of the leak figure, which covers corrugator losses.`,
      `Shifts. Shift A runs ${hour(SHIFT_START_HOUR.A)} to ${hour(SHIFT_START_HOUR.B)}, Shift B ${hour(SHIFT_START_HOUR.B)} to ${hour(SHIFT_START_HOUR.C)} and Shift C ${hour(SHIFT_START_HOUR.C)} to ${hour(SHIFT_START_HOUR.A)}. Sunday is the weekly off, so a month has ${P.workingDaysPerMonth} working days.`,
    ]),
  },
  {
    name: "Dashboard guide: other pages",
    pages: p([
      `Production page: output in tonnes against the plan, waste split between side trim and dry-end rejects, running speed, deckle use and the time for order changes and Printer-Slotter changeovers.`,
      `Materials page: paper reel stock against the booked orders by grade, cover in days, which grades are short, the paper mills and their on-time record, and consumables such as starch, ink and wire.`,
      `Quality page: lab results that failed or nearly failed spec, the first-pass rate, and what to do about each one.`,
      `Orders page: what ships today and how far each order has got, finished orders waiting for dispatch and for how long, trucks on the road, and orders below the margin floor of ${OPS.marginFloorPct}%.`,
    ]),
  },
  {
    name: "Dashboard guide: production planner",
    pages: p([
      `The Planner page builds a production schedule from the orders you enter. Add, edit, duplicate or delete orders: customer, order ID, box style, size, quantity, board grade, flute, printing, deadline and priority. Import sample orders to try it. The sample orders are made up, are not live factory orders, and are labelled as demo data. Changes are saved in your browser only.`,
      `How the schedule is built. It is a rule-based heuristic and does not claim to be the best possible plan. Orders are ranked by deadline, pulled earlier for urgent (${PLANNER.priorityBiasH.urgent} h) and high (${PLANNER.priorityBiasH.high} h) priority and pushed later for low. Each goes on the compatible machine that finishes it soonest, using only the hours the machine is open. Later orders with the same grade, flute and print are pulled in behind it to save changeovers unless that would make a more urgent order late. Paper is handed out from stock and then open purchase orders.`,
      `Changeover times. First job on a machine ${PLANNER.firstSetupMin} min. A grade change adds ${PLANNER.changeoverMin.grade} min, a flute change ${PLANNER.changeoverMin.flute} min, a print colour change ${PLANNER.changeoverMin.printColour} min, plates only ${PLANNER.changeoverMin.printPlates} min and a blank size change ${PLANNER.changeoverMin.size} min. An order finishing within ${PLANNER.riskBufferH} hours of its deadline is at risk.`,
      `Timeline and what-if. The timeline has a lane per machine. Drag an order to another lane to reassign it or sideways to change its place. A machine that cannot run the order refuses the drop and says why. What-if planning tries an urgent order, a breakdown, a slower machine, an extra shift, a paper shortage or larger quantities, and compares delivery, load and changeover time without touching the real plan. Export the schedule as CSV, or print it and save as PDF.`,
    ]),
  },
  {
    name: "Dashboard guide: Factory Copilot and Ask",
    pages: p([
      `Factory Copilot (the Copilot page) answers questions from documents you upload: PDF, DOCX, TXT or CSV, up to 10 MB. Text is split into chunks, indexed and searched. Every answer cites the document and page. If the documents do not cover a question it says so instead of guessing. You can delete or re-index documents in the Knowledge base tab.`,
      `Without an AI model key the Copilot runs in demo mode: search is real, and it quotes the matching passages from your documents. With a key set on the server it writes answers from those passages only, with citations. This Ask button on every dashboard page answers questions about the website and the dashboard itself, from the website documentation. It needs no key. It does not search your uploaded factory documents: use the Copilot page for those.`,
      `Is the data real? The plant figures, orders, stock and quality results in the dashboard are simulated sample data used to show the method. They are not results from a real plant.`,
    ]),
  },
];

type SiteData = { embedder: "local-hash-v1"; docs: DocRecord[]; chunks: Chunk[] };
let cached: SiteData | null = null;

/** Each chunk is embedded with its document title in front, so a question that names the topic finds that guide. */
/** The documentation as searchable chunks, built once per server process. Always the local embedder. */
export function siteData(): SiteData {
  if (cached) return cached;
  const docs: DocRecord[] = [];
  const chunks: Chunk[] = [];
  SITE_DOCS.forEach((d, i) => {
    const id = `site${i}`;
    const raw = chunkPages(d.pages);
    chunks.push(...raw.map((c) => ({ id: `${id}:${c.index}`, docId: id, docName: d.name, page: c.page, index: c.index, text: c.text, vec: localEmbed(`${d.name}. ${d.name}. ${c.text}`), suspicious: scanForInjection(c.text) || undefined })));
    docs.push({ id, name: d.name, kind: "txt", sizeBytes: d.pages.reduce((n, x) => n + x.text.length, 0), pageCount: d.pages.length, chunkCount: raw.length, status: "ready", uploadedAt: 0, indexedAt: 0, sample: false });
  });
  cached = { embedder: "local-hash-v1", docs, chunks };
  return cached;
}

/** Site chunks are long next to a short question, so scores run lower than for uploaded documents. */
export const SITE_THRESHOLD = 0.07;
