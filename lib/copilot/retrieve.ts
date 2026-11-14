import { COPILOT } from "../assumptions";
import { cosine, embedTexts, localEmbed, tokens, type EmbedderId } from "./embed";
import type { Chunk, Source } from "./types";

export type RetrieveOptions = {
  topK?: number;
  threshold?: number;
  /** Only search these documents (metadata filter). */
  docIds?: readonly string[];
  embedder: EmbedderId;
};

export type Hit = { chunk: Chunk; score: number };

/**
 * Rank chunks for a question. Local embeddings are re-weighted by how rare each term is across the
 * all chunks (so "steam" counts for more than "check"), and a chunk must share a real word
 * with the question, so a hash collision can never be evidence. Chunks under the threshold are
 * dropped: it is better to find nothing than to cite something unrelated.
 */
export async function retrieve(question: string, chunks: readonly Chunk[], o: RetrieveOptions): Promise<Hit[]> {
  const topK = Math.min(COPILOT.topKMax, Math.max(1, Math.round(o.topK ?? COPILOT.topK)));
  const threshold = o.threshold ?? COPILOT.threshold;
  const pool = o.docIds ? chunks.filter((c) => o.docIds?.includes(c.docId)) : [...chunks];
  if (pool.length === 0 || tokens(question).length === 0) return [];
  const local = o.embedder === "local-hash-v1";
  // Local-embedded chunks are always searched with the local embedder, whatever provider is configured.
  const q = local ? localEmbed(question) : (await embedTexts([question]))[0];

  let idf: number[] | null = null;
  if (local) {
    const df = new Array<number>(q.length).fill(0);
    // Rarity is measured over the whole library, so filtering to one document does not change what a word is worth.
    for (const c of chunks) c.vec.forEach((v, i) => { if (v > 0) df[i]++; });
    idf = df.map((d) => Math.log(1 + chunks.length / (1 + d)));
  }
  const weigh = (v: readonly number[]) => (idf ? v.map((x, i) => x * (idf as number[])[i]) : v);
  const qw = weigh(q);
  const qTerms = new Set(tokens(question));

  return pool
    .map((chunk) => ({ chunk, score: cosine(qw, weigh(chunk.vec)) }))
    .filter((h) => h.score >= threshold && (!local || tokens(h.chunk.text).some((t) => qTerms.has(t))))
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, topK);
}

/** The few sentences of a chunk that best match the question, as a short excerpt for a citation card. */
export function excerptOf(text: string, question: string): string {
  const q = new Set(tokens(question));
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  let best = 0;
  let bestScore = -1;
  sentences.forEach((s, i) => {
    const score = tokens(s).filter((t) => q.has(t)).length;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  let out = sentences[best] ?? text;
  for (let i = best + 1; i < sentences.length && out.length + sentences[i].length < COPILOT.excerptChars; i++) out += ` ${sentences[i]}`;
  return out.length > COPILOT.excerptChars ? `${out.slice(0, COPILOT.excerptChars).trimEnd()}...` : out;
}

/** Number the hits so an answer can cite them as [1], [2]. */
export function toSources(hits: Hit[], question: string): Source[] {
  return hits.map(({ chunk, score }, i) => ({
    n: i + 1,
    chunkId: chunk.id,
    docId: chunk.docId,
    docName: chunk.docName,
    page: chunk.page,
    excerpt: excerptOf(chunk.text, question),
    text: chunk.text,
    score: Math.round(score * 1000) / 1000,
    suspicious: !!chunk.suspicious,
  }));
}
