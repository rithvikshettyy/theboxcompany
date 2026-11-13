"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { blendTheme, inkFor, type ThemeStop } from "./themeBlend";

/**
 * Wraps the homepage and blends it between the light and dark palettes as you scroll. Each
 * section declares its theme (`data-section-theme`) and where its top takes over
 * (`data-theme-at`, a fraction of the viewport height, default 0.5). Around each hand-over the
 * `--dark` value glides from one theme to the next across half a screen of scroll; surfaces follow
 * it, and text follows `--ink`, which flips over a short band so it always stays readable
 * (`.theme-mix` in globals.css). Starts light, as the server renders it.
 */
export function ThemeScroll({ children, start = "light" }: { children: ReactNode; start?: "light" | "dark" }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const sections = [...el.querySelectorAll<HTMLElement>("[data-section-theme]")];
    let frame = 0;
    let last = -1;

    const update = () => {
      frame = 0;
      const stops: ThemeStop[] = sections.map((s) => ({
        dark: s.dataset.sectionTheme === "dark" ? 1 : 0,
        top: s.getBoundingClientRect().top,
        at: Number(s.dataset.themeAt ?? 0.5),
      }));
      const dark = Math.round(blendTheme(stops, window.innerHeight) * 1000) / 1000;
      if (dark === last) return;
      last = dark;
      el.style.setProperty("--dark", String(dark));
      el.style.setProperty("--ink", String(Math.round(inkFor(dark) * 1000) / 1000));
      el.style.colorScheme = dark > 0.5 ? "dark" : "light";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={root}
      className="theme-mix min-h-dvh bg-bg text-tx"
      style={{ "--dark": start === "dark" ? 1 : 0, "--ink": start === "dark" ? 1 : 0, colorScheme: start } as CSSProperties}
    >
      {children}
    </div>
  );
}
