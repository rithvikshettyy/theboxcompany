/** One section's say in the page theme: its theme, where its top is, and where it takes over. */
export type ThemeStop = {
  /** 0 = light, 1 = dark. */
  dark: number;
  /** Section top relative to the viewport, px. */
  top: number;
  /** Viewport fraction its top must reach to take over. */
  at: number;
};

/** Share of the viewport height a hand-over is spread across. */
export const BLEND_SPAN = 0.5;

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * How dark the page is right now, 0 to 1. Stops are in page order. Each one pulls the value
 * toward its own theme as its top passes `at × vh`, smoothly across BLEND_SPAN × vh of scroll.
 */
export function blendTheme(stops: ThemeStop[], vh: number): number {
  if (stops.length === 0) return 0;
  const span = BLEND_SPAN * vh;
  let value = stops[0].dark;
  for (const stop of stops.slice(1)) {
    const t = Math.min(1, Math.max(0, (stop.at * vh + span / 2 - stop.top) / span));
    value += (stop.dark - value) * smooth(t);
  }
  return value;
}

/** Where text colours flip: a narrow band where the surface passes mid-grey, so low contrast lasts only a few px of scroll. */
export const INK_BAND = { from: 0.47, to: 0.53 } as const;

/**
 * Ink (text, accents) for a given background darkness. The background glides; ink switches
 * quickly inside INK_BAND, so text always contrasts with the surface behind it.
 */
export function inkFor(dark: number): number {
  const t = Math.min(1, Math.max(0, (dark - INK_BAND.from) / (INK_BAND.to - INK_BAND.from)));
  return smooth(t);
}
