import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chunkPages } from "./chunk";
import { embedderId, embedTexts, type EmbedderId } from "./embed";
import { scanForInjection } from "./prompt";
import type { Chunk, DocKind, DocRecord, Page } from "./types";

/**
 * Knowledge base storage: one JSON file holding documents, their text and every chunk's vector. A
 * file keeps the project free of extra infrastructure. It suits one server; for several servers or
 * very large libraries, swap this module for a vector database (the rest only calls these functions).
 */
type Data = { version: 1; embedder: EmbedderId; docs: DocRecord[]; pages: Record<string, Page[]>; chunks: Chunk[] };

const dir = () => process.env.COPILOT_DATA_DIR ?? join(process.cwd(), ".data", "copilot");
const file = () => join(dir(), "knowledge.json");
const empty = (): Data => ({ version: 1, embedder: embedderId(), docs: [], pages: {}, chunks: [] });

export function load(): Data {
  try {
    if (!existsSync(file())) return empty();
    const d = JSON.parse(readFileSync(file(), "utf8")) as Data;
    return d?.version === 1 && Array.isArray(d.docs) && Array.isArray(d.chunks) ? d : empty();
  } catch {
    return empty();
  }
}

function save(d: Data) {
  mkdirSync(dir(), { recursive: true });
  const tmp = `${file()}.tmp`;
  writeFileSync(tmp, JSON.stringify(d));
  renameSync(tmp, file());
}

const newId = () => `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

async function buildChunks(id: string, name: string, pages: Page[]): Promise<Chunk[]> {
  const raw = chunkPages(pages);
  const vecs = await embedTexts(raw.map((c) => c.text));
  return raw.map((c, i) => ({
    id: `${id}:${c.index}`,
    docId: id,
    docName: name,
    page: c.page,
    index: c.index,
    text: c.text,
    vec: vecs[i],
    suspicious: scanForInjection(c.text) || undefined,
  }));
}

/** Index a document: chunk it, embed the chunks and save them. Returns the saved record. */
export async function addDocument(input: { name: string; kind: DocKind; sizeBytes: number; pages: Page[]; sample?: boolean }): Promise<DocRecord> {
  const d = load();
  if (d.embedder !== embedderId() && d.chunks.length > 0) {
    throw new Error("The embedding provider changed. Re-index every document before adding more.");
  }
  const id = newId();
  const chunks = await buildChunks(id, input.name, input.pages);
  const now = Date.now();
  const doc: DocRecord = {
    id,
    name: input.name,
    kind: input.kind,
    sizeBytes: input.sizeBytes,
    pageCount: input.pages.length,
    chunkCount: chunks.length,
    status: "ready",
    uploadedAt: now,
    indexedAt: now,
    sample: input.sample,
    flagged: chunks.some((c) => c.suspicious) || undefined,
  };
  save({ ...d, embedder: embedderId(), docs: [...d.docs, doc], pages: { ...d.pages, [id]: input.pages }, chunks: [...d.chunks, ...chunks] });
  return doc;
}

export function removeDocument(id: string): boolean {
  const d = load();
  if (!d.docs.some((x) => x.id === id)) return false;
  const { [id]: _gone, ...pages } = d.pages;
  void _gone;
  save({ ...d, docs: d.docs.filter((x) => x.id !== id), pages, chunks: d.chunks.filter((c) => c.docId !== id) });
  return true;
}

/** Rebuild one document's chunks and vectors from its stored text (after a chunking or embedder change). */
export async function reindexDocument(id: string): Promise<DocRecord | null> {
  const d = load();
  const doc = d.docs.find((x) => x.id === id);
  const pages = d.pages[id];
  if (!doc || !pages) return null;
  const chunks = await buildChunks(id, doc.name, pages);
  const next: DocRecord = { ...doc, chunkCount: chunks.length, status: "ready", error: undefined, indexedAt: Date.now(), flagged: chunks.some((c) => c.suspicious) || undefined };
  const others = d.chunks.filter((c) => c.docId !== id);
  const othersStale = d.embedder !== embedderId() && others.length > 0;
  save({ ...d, embedder: othersStale ? d.embedder : embedderId(), docs: d.docs.map((x) => (x.id === id ? next : x)), chunks: [...others, ...chunks] });
  return next;
}

export const clearAll = () => save(empty());
