"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { FlexCarouselItem } from "@/components/reactbits/FlexCarousel";
import { SERVICES } from "@/lib/company";

/** React Bits FlexCarousel (WebGL2, ogl): loaded in the browser only, while the section is on screen. */
const FlexCarousel = dynamic(() => import("@/components/reactbits/FlexCarousel"), {
  ssr: false,
  loading: () => null,
});

const ITEMS: FlexCarouselItem[] = SERVICES.map((s) => ({
  src: s.image,
  alt: s.alt,
  title: s.title,
  subtitle: s.body,
}));

function hasWebGL2(): boolean {
  const gl = document.createElement("canvas").getContext("webgl2");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return gl !== null;
}

/**
 * The services as a draggable row of drawings. The frame keeps its height before the canvas
 * mounts, so nothing shifts. Without WebGL2 the same drawings show as a plain grid.
 */
export function ServicesCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"idle" | "gl" | "static">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let gl: boolean | null = null;
    // Mounted the first time the section nears the screen, so the cards deal in as the reader gets
    // there. It then stays mounted, so autoplay keeps running no matter how the page is scrolled
    // (the carousel itself pauses drawing while off screen).
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        gl ??= hasWebGL2();
        setMode(gl ? "gl" : "static");
        io.disconnect();
      },
      { rootMargin: "120px 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (mode === "static") {
    return (
      <ul className="mx-auto grid max-w-5xl gap-x-8 gap-y-12 px-5 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <li key={s.title}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static fallback for a WebGL view */}
            <img src={s.image} alt={s.alt} width={900} height={1200} loading="lazy" className="aspect-[3/4] w-full rounded-xl object-cover" />
            <h3 className="mt-4 text-lg text-tx">{s.title}</h3>
            <p className="mt-1 text-sm text-mu">{s.body}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={ref} className="h-[34rem] text-tx md:h-[38rem]">
      {mode === "gl" ? (
        <FlexCarousel
          items={ITEMS}
          preset="liquid"
          intro="deal"
          fit="portrait"
          cardHeight={0.6}
          gap={16}
          radius={14}
          captureWheel={false}
          autoplay
          interval={3.5}
          className="services-carousel"
        />
      ) : null}
    </div>
  );
}
