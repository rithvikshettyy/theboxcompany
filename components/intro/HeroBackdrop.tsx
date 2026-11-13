"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { HERO_SKY } from "@/lib/theme";

/**
 * Originkit's GlimmerVale (a WebGL2 night meadow) behind the box intro. Loaded only in the
 * browser and only while the intro is on screen, so its renderer never runs while someone reads
 * the rest of the page. If WebGL2 is missing, the navy fallback shows instead.
 */
const GlimmerVale = dynamic(() => import("@/components/originkit/ui/glimmer-vale"), {
  ssr: false,
  loading: () => null,
});

export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = ref.current?.closest("section") ?? ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-0" style={{ background: HERO_SKY.skyTop }}>
      {/*
        Pushed down so the ridge sits below the headline; it runs past the hero's bottom edge and
        the section clips it, so only the top of the meadow shows and none of it reaches the next page.
      */}
      <div className="absolute inset-x-0 top-[22vh] -bottom-[14vh] lg:top-[30vh] lg:-bottom-[16vh]">
        {onScreen ? (
          <GlimmerVale
            {...HERO_SKY}
            speed={45}
            density={55}
            style={{ position: "absolute", inset: 0, minWidth: 0, minHeight: 0 }}
          />
        ) : null}
        {/* Feathers the canvas's top edge into the plain sky above it, so there is no seam. */}
        <div
          className="absolute inset-x-0 top-0 h-[16vh]"
          style={{ background: `linear-gradient(to bottom, ${HERO_SKY.skyTop}, transparent)` }}
        />
      </div>
      {/* Fades the meadow into the navy of the next section, so the hero ends cleanly. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[18vh]"
        style={{ background: `linear-gradient(to top, ${HERO_SKY.background}, transparent)` }}
      />
    </div>
  );
}
