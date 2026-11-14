import { COPILOT } from "../assumptions";
import { embedderId, tokens } from "./embed";
import { buildMessages, SYSTEM } from "./prompt";
import { retrieve, toSources } from "./retrieve";
import { SITE_THRESHOLD, siteData } from "./siteDocs";
import { load } from "./store";
import type { AppContext, ChatMessage, Source, StreamEvent } from "./types";

export type ChatRequest = {
  question: string;
  history?: ChatMessage[];
  context?: AppContext[];
  topK?: number;
  threshold?: number;
  docIds?: string[];
  /** Which documents to search: the uploaded factory documents (default) or the website documentation. */
  kb?: "uploads" | "site";
};

/** Answer when the website documentation does not cover the question. */
export const SITE_NO_ANSWER = "I couldn't find that in the website documentation. Try rephrasing, or open the Factory Copilot to search your own uploaded documents.";

export const llmConfigured = (): boolean => !!process.env.ANTHROPIC_API_KEY;

const CITE = /\[(\d+)\]/g;
/** Numbers an answer cites that really are among the retrieved sources. */
export const citedIn = (text: string, sources: Source[]): number[] =>
  [...new Set([...text.matchAll(CITE)].map((m) => Number(m[1])))].filter((n) => n >= 1 && n <= sources.length).sort((a, b) => a - b);

/** Check and trim what came from the browser. Returns an error message or the cleaned request. */
export function parseChatRequest(body: unknown): { ok: true; req: ChatRequest } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Send a JSON body." };
  const b = body as Record<string, unknown>;
  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question) return { ok: false, error: "Type a question." };
  if (question.length > COPILOT.maxQuestionChars) return { ok: false, error: `Keep the question under ${COPILOT.maxQuestionChars} characters.` };
  const history = (Array.isArray(b.history) ? b.history : [])
    .filter((m): m is ChatMessage => !!m && typeof m === "object" && ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") && typeof (m as ChatMessage).content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-COPILOT.maxHistoryTurns * 2);
  const context = (Array.isArray(b.context) ? b.context : [])
    .filter((c): c is AppContext => !!c && typeof (c as AppContext).label === "string" && Array.isArray((c as AppContext).lines))
    .map((c) => ({ label: c.label.slice(0, 80), lines: c.lines.filter((l) => typeof l === "string").map((l) => l.slice(0, 200)).slice(0, 30) }))
    .slice(0, 6);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const docIds = Array.isArray(b.docIds) ? b.docIds.filter((x): x is string => typeof x === "string").slice(0, 50) : undefined;
  return { ok: true, req: { question, history, context, topK: num(b.topK), threshold: num(b.threshold), docIds, kb: b.kb === "site" ? "site" : "uploads" } };
}

/** A short follow-up has no subject of its own, so it can borrow the previous question's words to rank passages. */
export function searchQuery(question: string, history: ChatMessage[]): string {
  if (tokens(question).length >= 4) return question;
  const prev = [...history].reverse().find((m) => m.role === "user");
  return prev ? `${prev.content} ${question}` : question;
}

/** Demo mode answer: the best-matching sentences from the retrieved passages, quoted with their numbers. Nothing is added. */
export function extractiveAnswer(question: string, sources: Source[], context: AppContext[]): string {
  const q = new Set(tokens(question));
  const picked = sources
    .flatMap((s) => s.text.split(/(?<=[.!?])\s+|\n+/).filter((t) => t.trim().length > 20).map((t) => ({ s, t: t.trim(), k: tokens(t).filter((x) => q.has(x)).length })))
    .filter((x) => x.k > 0)
    .sort((a, b) => b.k - a.k || a.s.n - b.s.n)
    .slice(0, 5)
    .sort((a, b) => a.s.n - b.s.n);
  const lines = picked.length ? picked.map((p) => `- ${p.t} [${p.s.n}]`) : sources.slice(0, 2).map((s) => `- ${s.excerpt} [${s.n}]`);
  const app = context.length ? `\n\n**Dashboard data you are looking at**\n${context.flatMap((c) => c.lines.map((l) => `- ${c.label}: ${l}`)).join("\n")}` : "";
  return `Here is what the uploaded documents say:\n\n${lines.join("\n")}${app}`;
}

/** Stream a Claude answer. Throws a plain-language Error if the service fails. */
async function* streamClaude(messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.COPILOT_MODEL ?? COPILOT.model, max_tokens: COPILOT.maxTokens, system: SYSTEM, messages, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`The AI service returned ${res.status}. Check the API key and try again.`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const ev = JSON.parse(line.slice(5)) as { type?: string; delta?: { text?: string }; error?: { message?: string } };
        if (ev.type === "content_block_delta" && ev.delta?.text) yield ev.delta.text;
        if (ev.type === "error") throw new Error(ev.error?.message ?? "The AI service reported an error.");
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

/**
 * One chat turn as a stream of events: the retrieved sources first, then the answer, then a summary.
 * With no passages above the threshold the answer is the fixed refusal and the model is never called.
 */
export async function* chat(req: ChatRequest, llm: (messages: ChatMessage[], signal?: AbortSignal) => AsyncGenerator<string> = streamClaude, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const data = req.kb === "site" ? siteData() : load();
  const noAnswer = req.kb === "site" ? SITE_NO_ANSWER : COPILOT.noAnswer;
  const mode = llmConfigured() ? "llm" : "demo";
  const query = searchQuery(req.question, req.history ?? []);
  let sources: Source[];
  try {
    const opts = { topK: req.topK, threshold: req.threshold ?? (req.kb === "site" ? SITE_THRESHOLD : undefined), docIds: req.docIds, embedder: data.chunks.length ? data.embedder : embedderId() };
    // A short follow-up ("what safety precautions apply?") borrows the last question's words to rank
    // passages, but only passages that also contain a word from the follow-up itself count. So the
    // borrowed topic can narrow a search, never make an unrelated question look answerable.
    let hits = await retrieve(req.question, data.chunks, opts);
    if (query !== req.question) {
      const own = new Set(tokens(req.question));
      const narrowed = (await retrieve(query, data.chunks, opts)).filter((h) => tokens(h.chunk.text).some((t) => own.has(t)));
      if (narrowed.length > 0) hits = narrowed;
    }
    sources = toSources(hits, query);
  } catch (e) {
    yield { t: "error", message: e instanceof Error ? e.message : "Search failed." };
    return;
  }
  yield { t: "retrieval", sources, mode, query, docs: data.docs.length };

  if (sources.length === 0) {
    yield { t: "delta", text: noAnswer };
    yield { t: "done", grounded: false, cited: [], mode };
    return;
  }
  const context = req.context ?? [];
  if (mode === "demo") {
    const text = extractiveAnswer(req.question, sources, context);
    for (const part of text.match(/[\s\S]{1,60}/g) ?? []) yield { t: "delta", text: part };
    yield { t: "done", grounded: true, cited: citedIn(text, sources), mode };
    return;
  }
  let text = "";
  try {
    for await (const piece of llm(buildMessages(req.question, req.history ?? [], sources, context), signal)) {
      text += piece;
      yield { t: "delta", text: piece };
    }
  } catch (e) {
    yield { t: "error", message: e instanceof Error ? e.message : "The AI service failed." };
    return;
  }
  const cited = citedIn(text, sources);
  yield { t: "done", grounded: cited.length > 0 || text.trim() === COPILOT.noAnswer, cited, mode };
}
