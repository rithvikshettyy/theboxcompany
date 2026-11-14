import { COPILOT } from "../assumptions";

/**
 * Embeddings. By default a local, dependency-free embedder: words and word pairs hashed into a
 * fixed-size vector (lexical, not deep semantic). If OPENAI_API_KEY is set, OpenAI embeddings are
 * used instead. The index remembers which one built it, so the two are never mixed.
 */
export type EmbedderId = "local-hash-v1" | "openai-text-embedding-3-small";

const STOP = new Set(
  "a an and are as at be been but by can could do does for from had has have how i if in into is it its me my no not of on or our should so than that the their them then there these they this to us was we were what when where which who why will with would you your".split(" "),
);

/** Lower-case word stems: the plural and -ing/-ed endings come off so "breaks", "breaking" and "break" match. */
export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => {
      const stem = w.length > 5 && w.endsWith("ing") ? w.slice(0, -3) : w.length > 4 && w.endsWith("ed") ? w.slice(0, -2) : w.length > 3 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
      return stem.length > 4 && stem.endsWith("e") ? stem.slice(0, -1) : stem;
    });
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Local embedding: sublinear term weights of words and adjacent word pairs, hashed to COPILOT.embedDims. */
export function localEmbed(text: string): number[] {
  const vec = new Array<number>(COPILOT.embedDims).fill(0);
  const t = tokens(text);
  const bump = (key: string, w: number) => {
    vec[hash(key) % COPILOT.embedDims] += w;
  };
  t.forEach((w, i) => {
    bump(w, 1);
    if (i > 0) bump(`${t[i - 1]} ${w}`, 0.6);
  });
  return vec.map((v) => (v > 0 ? 1 + Math.log(v) : 0));
}

export const embedderId = (): EmbedderId => (process.env.OPENAI_API_KEY ? "openai-text-embedding-3-small" : "local-hash-v1");

/** Embed texts with whichever embedder is configured. Throws with a plain message if the provider fails. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (embedderId() === "local-hash-v1") return texts.map(localEmbed);
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) throw new Error(`The embedding service returned ${res.status}.`);
  const body = (await res.json()) as { data: { embedding: number[] }[] };
  return body.data.map((d) => d.embedding);
}

export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 0;
}
