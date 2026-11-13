import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8");

/** `--name: #hex` pairs from a block of CSS or markdown. */
function parseTokens(source: string): Record<string, string> {
  const pairs = [...source.matchAll(/--([a-z0-9]+)\s*:\s*(#[0-9a-f]{6})/gi)];
  return Object.fromEntries(pairs.map(([, name, hex]) => [name, hex.toLowerCase()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Third-party code copied in by a CLI (Originkit); kept as shipped so it re-installs cleanly. */
const VENDORED = /^originkit[\\/]/;

/** Every .ts/.tsx file under the given folders, minus vendored code. */
function sourceFiles(...dirs: string[]): { path: string; text: string }[] {
  return dirs.flatMap((dir) =>
    readdirSync(new URL(dir, ROOT), { recursive: true, encoding: "utf8" })
      .filter((f) => /\.(ts|tsx)$/.test(f) && !VENDORED.test(f))
      .map((f) => ({ path: join(dir, f), text: read(join(dir, f).replaceAll("\\", "/")) })),
  );
}

const css = read("app/globals.css");
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const tokens = parseTokens(rootBlock);
const spec = parseTokens(read("CLAUDE.md").match(/```css([\s\S]*?)```/)?.[1] ?? "");
const SURFACES = ["bg", "s1", "s2"] as const;

describe("design tokens", () => {
  it("globals.css matches every token in CLAUDE.md §3 exactly", () => {
    expect(Object.keys(spec)).toHaveLength(15);
    expect(tokens).toMatchObject(spec);
  });

  it.each(["tx", "mu", "brand", "brand2", "red", "amber", "green", "blue"])(
    "--%s passes 4.5:1 as text on bg, s1 and s2",
    (fg) => {
      for (const bg of SURFACES) {
        expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("--mu2 and --brand3 fail 4.5:1, so no component uses them for text", () => {
    expect(contrast(tokens.mu2, tokens.s1)).toBeLessThan(4.5);
    expect(contrast(tokens.brand3, tokens.s1)).toBeLessThan(4.5);
    const offenders = sourceFiles("app", "components").filter(({ text }) =>
      /\btext-(mu2|brand3)\b/.test(text),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});

describe("light theme tokens", () => {
  const light = parseTokens(css.match(/\[data-theme="light"\]\s*\{([\s\S]*?)\}/)?.[1] ?? "");
  const lightSpec = parseTokens(read("CLAUDE.md").match(/```css-light([\s\S]*?)```/)?.[1] ?? "");

  it("globals.css matches the light palette in CLAUDE.md §3", () => {
    expect(Object.keys(lightSpec)).toHaveLength(15);
    expect(light).toEqual(lightSpec);
  });

  it.each(["tx", "mu", "brand", "brand2", "red", "amber", "green", "blue"])(
    "light --%s passes 4.5:1 as text on bg, s1 and s2",
    (fg) => {
      for (const bg of SURFACES) {
        expect(contrast(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});

describe("homepage theme blend", () => {
  const light = parseTokens(css.match(/\[data-theme="light"\]\s*\{([\s\S]*?)\}/)?.[1] ?? "");
  const mixBlock = css.match(/\.theme-mix\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const mix = Object.fromEntries(
    [...mixBlock.matchAll(/--([a-z0-9]+):\s*color-mix\(in oklab, (#[0-9a-f]{6}), (#[0-9a-f]{6})/gi)].map(
      ([, name, from, to]) => [name, { from: from.toLowerCase(), to: to.toLowerCase() }],
    ),
  );

  it("blends every palette token from its light value to its dark value", () => {
    expect(Object.keys(mix).sort()).toEqual(Object.keys(spec).sort());
    for (const [name, { from, to }] of Object.entries(mix)) {
      expect(from, name).toBe(light[name]);
      expect(to, name).toBe(tokens[name]);
    }
  });
});

describe("source rules", () => {
  it("components use tokens, never raw hex colours", () => {
    const offenders = sourceFiles("components").filter(({ text }) =>
      /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b/i.test(text),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("no em dashes anywhere in app, components or lib (rule 23)", () => {
    const offenders = sourceFiles("app", "components", "lib").filter(({ text }) =>
      text.includes("—"),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});
