import type { NodeId } from "@/lib/types";
import { knife, type Phases } from "./boxMath";

/** Flute wave (sine) from x0 to x1: the medium seen side-on, and the brand motif. */
function wave(x0: number, x1: number, y: number, amp: number, period: number): string {
  let d = `M${x0} ${y}`;
  for (let x = x0; x < x1; x += period) {
    d += ` C${x + period / 4} ${y - amp} ${x + period / 4} ${y - amp} ${x + period / 2} ${y}`;
    d += ` C${x + (3 * period) / 4} ${y + amp} ${x + (3 * period) / 4} ${y + amp} ${x + period} ${y}`;
  }
  return d;
}

/** Where paper runs: top liner, medium, the single-face web over the bridge, and the back liner. */
const PAPER = [
  "M144 140 C220 140 270 170 342 196",
  "M144 260 C230 260 290 258 342 256",
  "M440 214 C500 214 520 140 580 140 L600 140 C640 140 640 214 670 214 L1010 214",
  "M628 300 C650 300 650 228 670 228 L960 228",
];
const SHEETS = 8;
/** Flute pitch in viewBox units; the wave loops by one pitch so it never runs out. */
const FLUTE = 16;
const STATIONS = [
  { x: 100, label: "Reel stand" },
  { x: 370, label: "Single facer" },
  { x: 805, label: "Double backer" },
  { x: 995, label: "Cut-off" },
  { x: 1100, label: "Stacker" },
];
/** Where a corrugator cause sits on the drawing (slitter-scorer shares the cut-off housing). */
const NOTE_X: Partial<Record<NodeId, number>> = { reel: 100, sf: 370, db: 805, ss: 995, co: 995 };
const spin = "[transform-box:fill-box] [transform-origin:center]";
const housing = "fill-s1 stroke-tx/70";

/**
 * A corrugator in line art, run by scroll. The intro's box lands on the stacker as the first
 * sheet; paper traces back from the cut-off to the reels, then the line runs: rollers turn, board
 * flows along the double backer, the knife cuts and sheets stack. Decorative (aria-hidden):
 * the note on the reel stand repeats a figure the page states as text.
 */
export function Corrugator({ note }: { note?: { label: string; node: NodeId } }) {
  const noteX = note ? (NOTE_X[note.node] ?? 100) : 0;
  return (
    <svg viewBox="0 0 1200 390" fill="none" strokeWidth="1.5" className="h-auto w-full overflow-visible">
      <line x1="30" y1="330" x2="1180" y2="330" className="stroke-line2" />

      {/* Reel stand */}
      <path d="M60 330 L100 140 L140 330 M60 330 L100 260 L140 330" className="stroke-tx/40" />
      {[140, 260].map((cy) => (
        <g key={cy} data-spin="-1" className={spin}>
          <circle cx="100" cy={cy} r="44" className="fill-[var(--box-liner)] stroke-[var(--box-kraft-edge)]" />
          <circle cx="100" cy={cy} r="8" className="fill-s1 stroke-tx/70" />
          <line x1="100" y1={cy - 36} x2="100" y2={cy - 14} className="stroke-[var(--box-kraft-edge)]" />
        </g>
      ))}

      {/* Single facer */}
      <rect x="300" y="110" width="140" height="190" rx="10" className={housing} />
      {[196, 256].map((cy, i) => (
        <circle key={cy} data-spin={i ? "1" : "-1"} cx="370" cy={cy} r="26" strokeDasharray="4 4" strokeWidth="6" className={`${spin} stroke-tx/60`} />
      ))}

      {/* Back liner reel and double backer */}
      <g data-spin="-1" className={spin}>
        <circle cx="600" cy="300" r="28" className="fill-[var(--box-liner)] stroke-[var(--box-kraft-edge)]" />
        <line x1="600" y1="276" x2="600" y2="290" className="stroke-[var(--box-kraft-edge)]" />
      </g>
      <rect x="660" y="190" width="290" height="16" rx="8" className={housing} />
      {[672, 938].map((cx) => (
        <circle key={cx} data-spin="2" cx={cx} cy="198" r="6" strokeDasharray="3 3" className={`${spin} stroke-tx/70`} />
      ))}
      <rect x="650" y="234" width="310" height="12" rx="3" className={housing} />

      {/* Paper */}
      {PAPER.map((d) => (
        <path key={d} d={d} data-paper strokeWidth="3" className="stroke-[var(--box-kraft)]" />
      ))}
      <clipPath id="board-clip">
        <rect x="670" y="214" width="290" height="14" />
      </clipPath>
      <g clipPath="url(#board-clip)">
        <path data-flutes d={wave(670, 976, 221, 6, FLUTE)} strokeWidth="2" className="stroke-[var(--box-flute)]" />
      </g>

      {/* Cut-off */}
      <rect x="975" y="160" width="40" height="140" rx="6" className={housing} />
      <rect data-knife x="991" y="176" width="8" height="26" rx="2" className="fill-tx/80" />

      {/* Stacker */}
      {Array.from({ length: SHEETS }, (_, i) => (
        <rect key={i} data-sheet={i} x="1040" y={322 - i * 8} width="120" height="6" rx="1" opacity="0" className="fill-[var(--box-kraft)]" />
      ))}

      {/* Optional marker over one machine, e.g. where the plant loses the most time. */}
      {note ? (
        <g data-note opacity="0">
          <line x1={noteX} y1="78" x2={noteX} y2="104" className="stroke-red" />
          <circle cx={noteX} cy="70" r="5" className="fill-red" />
          <text x={noteX} y="56" textAnchor="middle" className="fill-red text-[15px]">
            {note.label}
          </text>
        </g>
      ) : null}

      {STATIONS.map((s) => (
        <text key={s.label} x={s.x} y="364" textAnchor="middle" className="fill-mu text-[15px]">
          {s.label}
        </text>
      ))}
    </svg>
  );
}

/** Caches the moving parts once; returns a writer for one frame. */
export function bindCorrugator(root: HTMLElement) {
  const paper = [...root.querySelectorAll<SVGPathElement>("[data-paper]")].map((el) => {
    const length = el.getTotalLength();
    el.style.strokeDasharray = `${length} ${length}`;
    return { el, length };
  });
  const spinners = [...root.querySelectorAll<SVGGraphicsElement>("[data-spin]")].map((el) => ({
    el,
    speed: Number(el.dataset.spin),
  }));
  const flutes = root.querySelector<SVGPathElement>("[data-flutes]");
  const knifeEl = root.querySelector<SVGRectElement>("[data-knife]");
  const sheets = [...root.querySelectorAll<SVGRectElement>("[data-sheet]")];
  const noteEl = root.querySelector<SVGGElement>("[data-note]");

  return (ph: Phases) => {
    root.style.opacity = String(ph.machineIn);
    // Paper appears from its downstream end back to the reels: where the landed sheet came from.
    for (const { el, length } of paper) el.style.strokeDashoffset = String(-length * (1 - ph.draw));
    // Rollers turn back while the paper traces back, then forward while the line runs.
    const turn = ph.produce * 900 - ph.draw * 300;
    for (const { el, speed } of spinners) el.style.transform = `rotate(${turn * speed}deg)`;
    if (flutes) flutes.style.transform = `translateX(${-((ph.produce * 600) % FLUTE)}px)`;
    if (knifeEl) knifeEl.style.transform = `translateY(${knife(ph.produce, SHEETS - 1) * 18}px)`;
    // Sheet 0 is the box that just landed; the rest are cut while the line runs.
    sheets.forEach((s, i) => {
      const shown = i === 0 ? ph.handoff : ph.produce * (SHEETS - 1) - (i - 1);
      s.setAttribute("opacity", String(Math.min(1, Math.max(0, shown))));
    });
    if (noteEl) noteEl.setAttribute("opacity", String(ph.noteOpacity));
  };
}
