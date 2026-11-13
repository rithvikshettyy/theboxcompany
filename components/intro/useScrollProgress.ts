"use client";

import { useEffect, useRef, type RefObject } from "react";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Scroll progress through `ref`'s element, 0 when its top meets the viewport top and 1 when its
 * bottom meets the viewport bottom. One passive scroll listener and one rAF per frame; the value
 * goes to `onProgress` and a ref, never to React state, so scrolling causes no re-render.
 * Work stops while the element is off screen, and never starts under reduced motion.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
): RefObject<number> {
  const progress = useRef(0);
  const callback = useRef(onProgress);

  useEffect(() => {
    callback.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let top = 0;
    let span = 1;
    let frame = 0;
    let visible = true;

    const measure = () => {
      top = el.getBoundingClientRect().top + window.scrollY;
      span = Math.max(1, el.offsetHeight - window.innerHeight);
    };
    const tick = () => {
      frame = 0;
      progress.current = clamp01((window.scrollY - top) / span);
      callback.current(progress.current);
    };
    const schedule = () => {
      if (visible && !frame) frame = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measure();
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      el.dataset.offscreen = String(!visible);
      if (visible) {
        measure();
        schedule();
      }
    });

    measure();
    tick();
    observer.observe(el);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
    };
  }, [ref]);

  return progress;
}
