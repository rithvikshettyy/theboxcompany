/**
 * Scroll intro choreography. Pure: progress p in [0, 1] in, every angle and opacity out.
 *
 * The closed box opens, swings its lid flaps back, and folds its walls inward one by one until it
 * is a single flat square (a knocked-down box). The square flies to the stacker and tips edge-on
 * until it is a sheet of board on the stack, while the corrugator draws in around it.
 * The paper then traces back from the cut-off to the reels (where that sheet came from), and the
 * line runs forward, cutting and stacking more sheets. A dark curtain hands over to the numbers.
 */

/** Phase boundaries as fractions of the intro scroll. */
export const PHASE = {
  copyEnd: 0.17,
  lidEnd: 0.18,
  flapsBackEnd: 0.27,
  foldStart: 0.18,
  foldEnd: 0.42,
  landStart: 0.42,
  landEnd: 0.58,
  handoffStart: 0.52,
  handoffEnd: 0.6,
  machineInStart: 0.46,
  machineInEnd: 0.6,
  drawStart: 0.6,
  drawEnd: 0.72,
  produceStart: 0.72,
  produceEnd: 0.88,
  noteStart: 0.78,
  noteEnd: 0.86,
  scrimStart: 0.88,
  endLineStart: 0.92,
} as const;

/** Each wall folds inward in turn, overlapping the next, so later walls sweep over earlier ones. */
export const WALL_ORDER = ["w", "e", "n", "s"] as const;
export type Side = (typeof WALL_ORDER)[number];
export const WALL_WINDOW: Record<Side, readonly [number, number]> = {
  w: [0.22, 0.32],
  e: [0.25, 0.35],
  n: [0.28, 0.38],
  s: [0.31, 0.41],
};

/** Angles in degrees. Walls go 90 (standing) → 180 (folded inward onto the base). */
export const ANGLE = {
  flapClosed: 90,
  flapOpen: -62,
  /** Flaps swing all the way back onto the outside of their wall before the walls fold. */
  flapBack: -180,
  wallUp: 90,
  wallFolded: 180,
  tiltStart: 58,
  spinStart: -34,
  /** How far the landing square tips toward edge-on, so it reads as a sheet seen from the side. */
  edgeOn: 80,
} as const;

/** Darkness of a fully upright wall (fake lighting). */
export const MAX_SHADE = 0.45;

export type Phases = {
  /** Per wall: 90 standing → 180 folded inward. */
  walls: Record<Side, number>;
  /** All four lid flaps: 90 closed → -62 open → -180 folded back. */
  flapAngle: number;
  /** Camera tilt: 58 → 0 as it folds, then up to 80 as the square lands edge-on. */
  tilt: number;
  spin: number;
  fold: number;
  /** 0 → 1 as the folded square flies to the stacker and shrinks to a sheet. */
  land: number;
  /** 0 → 1 as the 3D square hands over to the drawn sheet on the stack. */
  handoff: number;
  machineIn: number;
  /** 0 → 1 as paper traces back from the cut-off to the reels. */
  draw: number;
  /** 0 → 1 as the line runs: rollers turn, knife cuts, sheets stack. */
  produce: number;
  noteOpacity: number;
  /** Phone camera along the line: 1 = at the stacker, 0 = at the reels. */
  pan: number;
  scrim: number;
  copyOpacity: number;
  endOpacity: number;
};

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lin = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const seg = (p: number, a: number, b: number) => easeInOutCubic(lin(p, a, b));

export function phases(progress: number): Phases {
  const p = clamp01(progress);
  const lid = seg(p, 0, PHASE.lidEnd);
  const back = seg(p, PHASE.lidEnd, PHASE.flapsBackEnd);
  const fold = seg(p, PHASE.foldStart, PHASE.foldEnd);
  const land = seg(p, PHASE.landStart, PHASE.landEnd);
  const draw = seg(p, PHASE.drawStart, PHASE.drawEnd);
  const produce = lin(p, PHASE.produceStart, PHASE.produceEnd);
  const walls = Object.fromEntries(
    WALL_ORDER.map((side) => {
      const [a, b] = WALL_WINDOW[side];
      return [side, lerp(ANGLE.wallUp, ANGLE.wallFolded, seg(p, a, b))];
    }),
  ) as Record<Side, number>;
  return {
    walls,
    flapAngle: lerp(lerp(ANGLE.flapClosed, ANGLE.flapOpen, lid), ANGLE.flapBack, back),
    tilt: ANGLE.tiltStart * (1 - fold) + ANGLE.edgeOn * land,
    spin: ANGLE.spinStart * (1 - fold),
    fold,
    land,
    handoff: seg(p, PHASE.handoffStart, PHASE.handoffEnd),
    machineIn: seg(p, PHASE.machineInStart, PHASE.machineInEnd),
    draw,
    produce,
    noteOpacity: seg(p, PHASE.noteStart, PHASE.noteEnd),
    pan: produce > 0 ? produce : 1 - draw,
    scrim: seg(p, PHASE.scrimStart, 1),
    copyOpacity: 1 - seg(p, 0, PHASE.copyEnd),
    endOpacity: seg(p, PHASE.endLineStart, 1),
  };
}

/** Wall darkness: darkest standing (90°), none once folded flat (180°). */
export const wallShade = (angle: number) => MAX_SHADE * Math.sin((angle * Math.PI) / 180);

/** Box edge S in px: round(min(vw × 0.5, vh × 0.34, 340)). Mirrors --S in box.css. */
export const boxSize = (vw: number, vh: number) => Math.round(Math.min(vw * 0.5, vh * 0.34, 340));

/** Knife travel 0..1 for production progress t: `cuts` quick strokes spread over the run. */
export function knife(t: number, cuts: number): number {
  if (t <= 0 || t >= 1) return 0;
  const phase = (t * cuts) % 1;
  const stroke = 0.18;
  return phase < stroke ? Math.sin((Math.PI * phase) / stroke) : 0;
}
