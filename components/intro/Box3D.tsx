import type { ReactNode } from "react";
import { BRAND } from "@/lib/assumptions";
import { ANGLE, phases, wallShade, type Phases, type Side } from "./boxMath";
import "./box.css";

const SIDES: readonly Side[] = ["n", "s", "w", "e"];

/**
 * Px each folded wall rests above the base, in fold order, so the layers of the flat square stack
 * cleanly instead of flickering. Flaps sit one more px above their wall.
 */
const LIFT: Record<Side, number> = { w: 2, e: 4, n: 6, s: 8 };

/** Rotation for a wall or flap on each side. Positive angles fold toward the inside. */
const ROTATE: Record<Side, (deg: number) => string> = {
  n: (d) => `rotateX(${-d}deg)`,
  s: (d) => `rotateX(${d}deg)`,
  w: (d) => `rotateY(${d}deg)`,
  e: (d) => `rotateY(${-d}deg)`,
};

/** Where the folded square goes: (dx, dy) px to the first sheet on the stacker, shrunk to `scale`. */
export type LandingTarget = { dx: number; dy: number; scale: number };
export const NO_TARGET: LandingTarget = { dx: 0, dy: 0, scale: 1 };

/** Wall transform: its hinge rotation, lifted toward the viewer as it lies down. */
function wallTransform(side: Side, angle: number): string {
  const down = (angle - ANGLE.wallUp) / (ANGLE.wallFolded - ANGLE.wallUp);
  return `${ROTATE[side](angle)} translateZ(${-LIFT[side] * down}px)`;
}

/** Flap transform: lifted one px above its wall once it swings back past fully open. */
function flapTransform(side: Side, angle: number): string {
  const back = Math.max(0, (ANGLE.flapOpen - angle) / (ANGLE.flapOpen - ANGLE.flapBack));
  return `${ROTATE[side](angle)} translateZ(${back}px)`;
}

/**
 * Net transform. Beside the heading it is tilted and turned; it folds into a square where it stands
 * (so it never slides under the heading) and looks straight down; as it lands it leaves its spot,
 * flies to the stacker, shrinks to a sheet and tips edge-on.
 */
export function netTransform(ph: Phases, target: LandingTarget = NO_TARGET): string {
  const rest = 1 - ph.fold;
  const scale = 1 + (target.scale - 1) * ph.land;
  return (
    `translate(calc(var(--shift) * ${1 - ph.land} + ${target.dx * ph.land}px), ${target.dy * ph.land}px) ` +
    `rotateX(${ph.tilt}deg) rotateZ(${ph.spin}deg) scale(${scale}) ` +
    `translateZ(calc(var(--H) * ${-0.5 * rest}))`
  );
}

function Face({ print }: { print?: ReactNode }) {
  return (
    <>
      <div className="box-face box-in" />
      <div className="box-face box-out">{print}</div>
    </>
  );
}

const PRINT: Record<Side, ReactNode> = {
  n: (
    <div className="box-print">
      <span className="box-stamp">Fragile</span>
    </div>
  ),
  s: (
    <div className="box-print upside">
      <span className="box-wordmark">
        {BRAND.name}
      </span>
      <span className="box-small">5-ply corrugated · This side up</span>
    </div>
  ),
  w: (
    <div className="box-print cw">
      <span className="box-small">Recyclable · Kraft liner</span>
    </div>
  ),
  e: (
    <div className="box-print ccw">
      <span className="box-small">Handle with care</span>
    </div>
  ),
};

const TAPE: Partial<Record<Side, ReactNode>> = {
  n: <div className="box-tape top" />,
  s: <div className="box-tape bottom" />,
};

/** Closed box on first paint, so the server HTML already shows it and nothing jumps. */
const CLOSED = phases(0);

/**
 * The CSS 3D corrugated box: a base, four walls hinged on its edges and a lid flap on each wall.
 * Decorative (aria-hidden).
 * Motion is applied by `bindBox`, never by React state.
 */
export function Box3D() {
  return (
    <div className="box-scene" aria-hidden="true" data-box>
      <div className="box-ground" data-part="ground" />
      <div className="box-net" data-part="net" style={{ transform: netTransform(CLOSED) }}>
        <div className="box-base">
          <Face />
        </div>
        {SIDES.map((side) => (
          <div
            key={side}
            className={`box-wall ${side}`}
            data-wall={side}
            style={{ transform: wallTransform(side, CLOSED.walls[side]), ["--sh" as string]: wallShade(CLOSED.walls[side]) }}
          >
            <Face print={PRINT[side]} />
            <div className={`box-flap ${side}`} data-flap={side} style={{ transform: flapTransform(side, CLOSED.flapAngle) }}>
              <Face print={TAPE[side]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Caches the box's moving parts once and returns a writer for one frame. */
export function bindBox(root: HTMLElement) {
  const net = root.querySelector<HTMLElement>("[data-part=net]");
  const ground = root.querySelector<HTMLElement>("[data-part=ground]");
  const walls = SIDES.map((side) => ({
    side,
    wall: root.querySelector<HTMLElement>(`[data-wall=${side}]`),
    flap: root.querySelector<HTMLElement>(`[data-flap=${side}]`),
  }));

  return (ph: Phases, target: LandingTarget) => {
    if (net) net.style.transform = netTransform(ph, target);
    if (ground) ground.style.opacity = String(1 - ph.fold);
    root.style.opacity = String(1 - ph.handoff);
    for (const { side, wall, flap } of walls) {
      if (wall) {
        wall.style.transform = wallTransform(side, ph.walls[side]);
        wall.style.setProperty("--sh", String(wallShade(ph.walls[side])));
      }
      if (flap) flap.style.transform = flapTransform(side, ph.flapAngle);
    }
  };
}
