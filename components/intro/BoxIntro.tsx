"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Box3D, bindBox, NO_TARGET, type LandingTarget } from "./Box3D";
import { phases, type Phases } from "./boxMath";
import { Corrugator, bindCorrugator } from "./Corrugator";
import { useScrollProgress } from "./useScrollProgress";

/**
 * "How a box is made", the section after the homepage hero. A closed corrugated box on the dark
 * page; over a 380vh sticky section it opens, folds inward into one flat square and flies onto the
 * stacker of a corrugator that draws in around it. The paper traces back to the reels, the line
 * runs, then a dark curtain hands over to the rest of the page.
 * Under reduced motion it is a static one-screen section with the box closed (box.css).
 */
export function BoxIntro() {
  const section = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const machine = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLParagraphElement>(null);
  const endLine = useRef<HTMLParagraphElement>(null);
  const writeBox = useRef<((ph: Phases, target: LandingTarget) => void) | null>(null);
  const writeMachine = useRef<((ph: Phases) => void) | null>(null);
  const target = useRef<LandingTarget>(NO_TARGET);

  // Always open on the hero: stop the browser restoring a scroll position deep in the page.
  // A link to a section (#about, #services, …) still lands on that section.
  useEffect(() => {
    if (window.location.hash) return;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const box = scene.current?.querySelector<HTMLElement>("[data-box]");
    if (box) writeBox.current = bindBox(box);
    if (machine.current) writeMachine.current = bindCorrugator(machine.current);

    // Where the folded blank lands: the first sheet on the stacker, as it sits when the camera is
    // parked at the stacker (phones pan; from 1024px the pan is zero).
    const measure = () => {
      const stage = scene.current;
      const net = stage?.querySelector<HTMLElement>("[data-part=net]");
      const sheet = machine.current?.querySelector<SVGRectElement>('[data-sheet="0"]');
      const rail = track.current;
      if (!stage || !net || !sheet || !rail) return;
      const stageBox = stage.getBoundingClientRect();
      const railBox = rail.getBoundingClientRect();
      const sheetBox = sheet.getBoundingClientRect();
      const css = getComputedStyle(net);
      const pan = getComputedStyle(rail).getPropertyValue("--pan").trim();
      const panPx = pan.endsWith("vw") ? (parseFloat(pan) * window.innerWidth) / 100 : parseFloat(pan) || 0;
      const x = rail.offsetLeft + (sheetBox.left - railBox.left) + sheetBox.width / 2 + panPx;
      const y = sheetBox.top - stageBox.top + sheetBox.height / 2;
      target.current = {
        dx: x - parseFloat(css.left),
        dy: y - parseFloat(css.top),
        scale: sheetBox.width / net.offsetWidth,
      };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const apply = useCallback((p: number) => {
    const ph = phases(p);
    writeBox.current?.(ph, target.current);
    writeMachine.current?.(ph);
    if (track.current) track.current.style.transform = `translateX(calc(var(--pan) * ${ph.pan}))`;
    // The heading stays through the box's fold and flight; it gives way as the machine draws in.
    if (copy.current) copy.current.style.opacity = String(1 - ph.machineIn);
    if (cue.current) cue.current.style.opacity = String(ph.copyOpacity);
    if (scrim.current) scrim.current.style.opacity = String(ph.scrim);
    if (endLine.current) endLine.current.style.opacity = String(ph.endOpacity);
  }, []);

  useScrollProgress(section, apply);

  return (
    <section
      ref={section}
      id="made"
      aria-labelledby="intro-title"
      data-section-theme="dark"
      className="intro relative h-[380vh]"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={scene} className="absolute inset-0">
          <Box3D />
        </div>

        <div
          ref={machine}
          aria-hidden="true"
          style={{ opacity: 0 }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 pt-10"
        >
          {/* Phones pan along the line with the board; from 1024px the whole line fits. */}
          <div
            ref={track}
            className="w-[260vw] px-[6vw] [--pan:-160vw] lg:mx-auto lg:w-[min(1100px,92vw)] lg:px-0 lg:[--pan:0px]"
          >
            <Corrugator />
          </div>
          <p className="mx-auto mt-10 max-w-lg px-5 text-center text-base text-mu">
            Every box we ship starts as paper on a reel. It is fluted, glued, cut and stacked under
            one roof.
          </p>
        </div>

        <div
          ref={copy}
          className="absolute inset-x-5 top-[14vh] z-10 text-center lg:inset-x-auto lg:top-1/2 lg:left-[max(2.5rem,calc(50vw-34rem))] lg:max-w-[min(38vw,32rem)] lg:-translate-y-1/2 lg:text-left"
        >
          <h2 id="intro-title" className="display text-xl text-balance text-tx sm:text-2xl">
            How a box is made
          </h2>
          <p className="mt-4 text-base text-mu">Scroll to watch one fold flat and go back to the line it came from.</p>
        </div>
        <p
          ref={cue}
          className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 text-sm text-mu motion-reduce:hidden"
        >
          Keep scrolling
          <ChevronDown aria-hidden="true" className="size-4" />
        </p>

        <div ref={scrim} aria-hidden="true" className="absolute inset-0 z-10 bg-night opacity-0" />
        <p
          ref={endLine}
          aria-hidden="true"
          className="absolute inset-x-4 bottom-[18vh] z-10 text-center text-xl font-medium text-paper opacity-0"
        >
          From reel to pallet.
        </p>
      </div>
    </section>
  );
}
