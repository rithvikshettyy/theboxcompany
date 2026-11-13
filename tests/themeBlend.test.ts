import { describe, expect, it } from "vitest";
import { BLEND_SPAN, blendTheme, type ThemeStop } from "@/components/site/themeBlend";

const VH = 1000;
/** Light hero, then a dark section whose top is at `top`, taking over at the middle of the screen. */
const page = (top: number): ThemeStop[] => [
  { dark: 0, top: -5000, at: 0.5 },
  { dark: 1, top, at: 0.5 },
];

describe("blendTheme", () => {
  it("stays light until the next section nears its hand-over point", () => {
    expect(blendTheme(page(VH), VH)).toBe(0);
    expect(blendTheme(page(0.5 * VH + (BLEND_SPAN * VH) / 2), VH)).toBe(0);
  });

  it("is exactly half way at the hand-over point and fully dark after it", () => {
    expect(blendTheme(page(0.5 * VH), VH)).toBeCloseTo(0.5, 12);
    expect(blendTheme(page(0.5 * VH - (BLEND_SPAN * VH) / 2), VH)).toBe(1);
  });

  it("changes smoothly: no step larger than 1% for a 1px scroll", () => {
    let prev = blendTheme(page(VH), VH);
    for (let top = VH; top >= 0; top--) {
      const next = blendTheme(page(top), VH);
      expect(Math.abs(next - prev)).toBeLessThan(0.01);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });

  it("goes back to light when a later light section takes over", () => {
    const stops: ThemeStop[] = [...page(-3000), { dark: 0, top: 0, at: 0.5 }];
    expect(blendTheme(stops, VH)).toBe(0);
  });
});

describe("inkFor", () => {
  it("keeps light-theme ink until the surface is mid-way, then flips to dark-theme ink", async () => {
    const { inkFor, INK_BAND } = await import("@/components/site/themeBlend");
    expect(inkFor(0)).toBe(0);
    expect(inkFor(INK_BAND.from)).toBe(0);
    expect(inkFor(INK_BAND.to)).toBe(1);
    expect(inkFor(1)).toBe(1);
    let prev = 0;
    for (let d = 0; d <= 1; d += 0.001) {
      const ink = inkFor(d);
      expect(ink).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = ink;
    }
  });
});
