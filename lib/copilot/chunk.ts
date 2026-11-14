import { COPILOT } from "../assumptions";
import type { Page } from "./types";

export type RawChunk = { page: number; index: number; text: string };

const SENTENCE = /(?<=[.!?:;])\s+(?=[A-Z0-9(\-•])|\n+/;

/** Split text into sentence-sized units. Very long runs without punctuation are cut at the chunk size. */
function units(text: string): string[] {
  return text
    .split(SENTENCE)
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => {
      if (s.length <= COPILOT.chunkChars) return [s];
      const parts: string[] = [];
      for (let i = 0; i < s.length; i += COPILOT.chunkChars) parts.push(s.slice(i, i + COPILOT.chunkChars));
      return parts;
    });
}

/**
 * Cut pages into chunks of about COPILOT.chunkChars, on sentence boundaries. A chunk never crosses a
 * page, so a citation's page number is exact. Each chunk starts with the last sentences of the one
 * before (up to COPILOT.overlapChars), so a step is not separated from the line that explains it.
 */
export function chunkPages(pages: readonly Page[]): RawChunk[] {
  const out: RawChunk[] = [];
  for (const { page, text } of pages) {
    const list = units(text);
    let current: string[] = [];
    let len = 0;
    const flush = () => {
      if (current.length === 0) return;
      out.push({ page, index: out.length, text: current.join(" ") });
      const tail: string[] = [];
      let tailLen = 0;
      for (let i = current.length - 1; i >= 0 && tailLen + current[i].length <= COPILOT.overlapChars; i--) {
        tail.unshift(current[i]);
        tailLen += current[i].length + 1;
      }
      current = tail;
      len = tailLen;
    };
    for (const u of list) {
      if (len + u.length > COPILOT.chunkChars && current.length > 0) flush();
      current.push(u);
      len += u.length + 1;
    }
    // The last, partly filled chunk. Skip it if it is only the overlap already in the previous chunk.
    const last = out[out.length - 1];
    const text2 = current.join(" ");
    if (current.length > 0 && !(last && last.page === page && last.text.endsWith(text2))) {
      out.push({ page, index: out.length, text: text2 });
    }
  }
  return out;
}
