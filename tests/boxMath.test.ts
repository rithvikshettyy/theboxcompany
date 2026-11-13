import { describe, expect, it } from "vitest";
import {
  ANGLE,
  boxSize,
  easeInOutCubic,
  knife,
  MAX_SHADE,
  phases,
  PHASE,
  WALL_ORDER,
  WALL_WINDOW,
  wallShade,
  type Phases,
} from "@/components/intro/boxMath";

type Scalar = Exclude<keyof Phases, "walls">;
const samples = Array.from({ length: 1001 }, (_, i) => i / 1000);
const series = (key: Scalar) => samples.map((p) => phases(p)[key]);
const wallSeries = (side: (typeof WALL_ORDER)[number]) => samples.map((p) => phases(p).walls[side]);
const nonIncreasing = (xs: number[]) => xs.every((x, i) => i === 0 || x <= xs[i - 1] + 1e-12);
const nonDecreasing = (xs: number[]) => xs.every((x, i) => i === 0 || x >= xs[i - 1] - 1e-12);
const between = (a: number, b: number) => samples.filter((p) => p >= a && p <= b);

describe("phases", () => {
  it("p = 0 is a closed box with the headline showing and no machine", () => {
    const ph = phases(0);
    expect(ph.flapAngle).toBe(90);
    expect(Object.values(ph.walls)).toEqual([90, 90, 90, 90]);
    expect(ph.tilt).toBe(58);
    expect(ph.spin).toBe(-34);
    expect(ph.land).toBe(0);
    expect(ph.machineIn).toBe(0);
    expect(ph.copyOpacity).toBe(1);
  });

  it("p = 0.18 has the lid open and the walls still standing", () => {
    const ph = phases(PHASE.lidEnd);
    expect(ph.flapAngle).toBeCloseTo(ANGLE.flapOpen, 9);
    expect(Object.values(ph.walls)).toEqual([90, 90, 90, 90]);
  });

  it("flaps are folded back before the first wall comes down", () => {
    expect(PHASE.flapsBackEnd).toBeLessThanOrEqual(WALL_WINDOW.w[1]);
    expect(phases(PHASE.flapsBackEnd).flapAngle).toBe(ANGLE.flapBack);
  });

  it("walls fold inward in order: each starts after the one before it", () => {
    for (let i = 1; i < WALL_ORDER.length; i++) {
      expect(WALL_WINDOW[WALL_ORDER[i]][0]).toBeGreaterThan(WALL_WINDOW[WALL_ORDER[i - 1]][0]);
    }
  });

  it("p = 0.42 is one flat square seen straight down", () => {
    const ph = phases(PHASE.foldEnd);
    expect(Object.values(ph.walls)).toEqual([180, 180, 180, 180]);
    expect(ph.flapAngle).toBe(ANGLE.flapBack);
    expect(ph.tilt).toBe(0);
    expect(ph.spin).toBeCloseTo(0, 12);
    expect(ph.land).toBe(0);
  });

  it("p = 0.6 has the square landed edge-on and handed over to the drawn sheet", () => {
    const ph = phases(PHASE.handoffEnd);
    expect(ph.land).toBe(1);
    expect(ph.tilt).toBe(ANGLE.edgeOn);
    expect(ph.handoff).toBe(1);
    expect(ph.machineIn).toBe(1);
    // Phones are parked at the stacker until the paper starts tracing back.
    expect(phases(PHASE.drawStart).pan).toBe(1);
  });

  it("paper traces back to the reels before the line runs, and the camera follows", () => {
    const ph = phases(PHASE.drawEnd);
    expect(ph.draw).toBe(1);
    expect(ph.produce).toBe(0);
    expect(ph.pan).toBe(0);
  });

  it("p = 1 has the run complete, full curtain and the end line", () => {
    const ph = phases(1);
    expect(ph.produce).toBe(1);
    expect(ph.pan).toBe(1);
    expect(ph.scrim).toBe(1);
    expect(ph.endOpacity).toBe(1);
  });

  it("clamps progress outside [0, 1]", () => {
    expect(phases(-1)).toEqual(phases(0));
    expect(phases(2)).toEqual(phases(1));
  });

  it("is monotonic within each phase", () => {
    expect(nonIncreasing(series("flapAngle"))).toBe(true);
    expect(nonIncreasing(series("copyOpacity"))).toBe(true);
    for (const side of WALL_ORDER) expect(nonDecreasing(wallSeries(side)), side).toBe(true);
    for (const key of ["spin", "fold", "land", "handoff", "machineIn", "draw", "produce", "noteOpacity", "scrim", "endOpacity"] as const) {
      expect(nonDecreasing(series(key)), key).toBe(true);
    }
    const pan = (ps: number[]) => ps.map((p) => phases(p).pan);
    expect(nonIncreasing(pan(between(PHASE.drawStart, PHASE.drawEnd)))).toBe(true);
    expect(nonDecreasing(pan(between(PHASE.produceStart, 1)))).toBe(true);
  });

  it("is continuous at every phase boundary", () => {
    const keys = (Object.keys(phases(0)) as (keyof Phases)[]).filter((k): k is Scalar => k !== "walls");
    const bounds = [...Object.values(PHASE), ...Object.values(WALL_WINDOW).flat()];
    for (const b of bounds) {
      const before = phases(b - 1e-6);
      const after = phases(b + 1e-6);
      // A real jump would be whole units; steep but smooth curves move ~1e-3 across 2e-6.
      for (const key of keys) expect(Math.abs(before[key] - after[key]), `${key} at ${b}`).toBeLessThan(1e-2);
      for (const side of WALL_ORDER) expect(Math.abs(before.walls[side] - after.walls[side])).toBeLessThan(1e-2);
    }
  });
});

describe("helpers", () => {
  it("shades walls darkest standing and not at all once folded", () => {
    expect(wallShade(90)).toBeCloseTo(MAX_SHADE, 12);
    expect(wallShade(180)).toBeCloseTo(0, 12);
  });

  it("eases from 0 to 1 symmetrically", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("sizes the box from the viewport", () => {
    expect(boxSize(1440, 900)).toBe(306);
    expect(boxSize(390, 844)).toBe(195);
    expect(boxSize(3000, 2000)).toBe(340);
  });

  it("knife stays in [0, 1], rests between cuts and is still outside the run", () => {
    for (const t of samples) {
      const k = knife(t, 8);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
    expect(knife(0, 8)).toBe(0);
    expect(knife(1, 8)).toBe(0);
    expect(knife(0.5 / 8, 8)).toBe(0);
  });
});
