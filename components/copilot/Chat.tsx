"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Plus, Send, SlidersHorizontal, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { chats, useChat, useCopilotContext, type Msg } from "@/lib/copilot/clientStore";
import type { DocRecord, StreamEvent } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";
import { AnswerText } from "./AnswerText";
import { SourceCard } from "./SourceCard";

export type Status = { llm: "anthropic" | "demo"; model: string | null; embedder: string; docs: number; chunks: number; defaults: { topK: number; topKMax: number; threshold: number } };

const SUGGESTED = [
  "Why is our corrugator experiencing frequent paper breaks?",
  "What should I check if steam pressure drops?",
  "How do I resolve warped boards?",
  "What is the maintenance procedure for the single facer?",
  "What is the procedure for changing paper reels?",
  "Explain the difference between B flute and C flute.",
  "What is the recommended operating temperature?",
  "Which machine had the most breakdowns last month?",
];
const FOLLOW_UPS = ["What safety precautions apply?", "Show the steps in order.", "What should I check first?"];

function Message({ m, onCiteOpen, open, onToggle, onOpenDoc, onFollow, onFeedback, last }: {
  m: Msg; open: number | null; onToggle: (n: number) => void; onCiteOpen: (n: number) => void; onOpenDoc: (id: string) => void; onFollow: (q: string) => void; onFeedback: (f: "up" | "down") => void; last: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (m.role === "user") {
    return <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-night px-4 py-3 text-sm text-paper">{m.content}</div>;
  }
  const sources = m.sources ?? [];
  return (
    <article aria-busy={m.streaming} className="flex max-w-3xl flex-col gap-3">
      {m.streaming && !m.content ? <p className="text-sm text-mu">{sources.length ? "Reading the matching passages..." : "Searching the documents..."}</p> : null}
      {m.content ? <AnswerText text={m.content} sources={sources.length} onCite={onCiteOpen} /> : null}
      {m.error ? <p role="alert" className="rounded-xl bg-red/10 p-3 text-sm text-red">{m.error}</p> : null}
      {m.usedContext?.length ? <p className="text-xs text-mu">Used dashboard data: {m.usedContext.join(", ")}</p> : null}
      {!m.streaming && m.mode === "demo" && sources.length ? <p className="text-xs text-mu">Demo mode: no AI model is connected, so this is the matching text quoted from your documents, not a written answer.</p> : null}
      {!m.streaming && m.mode === "llm" && m.grounded === false && sources.length ? <p className="rounded-xl bg-amber/10 p-3 text-xs text-amber">This answer has no source citations. Do not rely on it without checking the documents.</p> : null}
      {!m.streaming && m.docs === 0 ? <p className="text-xs text-mu">The knowledge base is empty. Upload documents or add the demo documents in the Knowledge base tab.</p> : null}

      {sources.length ? (
        <details open className="group">
          <summary className="cursor-pointer text-xs text-mu">{sources.length} {sources.length === 1 ? "source" : "sources"}</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {sources.map((s) => <SourceCard key={s.chunkId} s={s} open={open === s.n} cited={!!m.cited?.includes(s.n)} onToggle={() => onToggle(s.n)} onOpenDoc={onOpenDoc} />)}
          </ul>
        </details>
      ) : null}

      {!m.streaming ? (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-xs text-mu hover:bg-s2 hover:text-tx md:h-8">
            {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}{copied ? "Copied" : "Copy"}
          </button>
          <button type="button" aria-pressed={m.feedback === "up"} aria-label="Helpful" onClick={() => onFeedback("up")} className={cn("inline-flex size-11 items-center justify-center rounded-full hover:bg-s2 md:size-8", m.feedback === "up" ? "text-green" : "text-mu")}><ThumbsUp aria-hidden="true" className="size-3.5" /></button>
          <button type="button" aria-pressed={m.feedback === "down"} aria-label="Not helpful" onClick={() => onFeedback("down")} className={cn("inline-flex size-11 items-center justify-center rounded-full hover:bg-s2 md:size-8", m.feedback === "down" ? "text-red" : "text-mu")}><ThumbsDown aria-hidden="true" className="size-3.5" /></button>
        </div>
      ) : null}
      {last && !m.streaming && sources.length && !m.error ? (
        <ul className="flex flex-wrap gap-2" aria-label="Follow-up questions">
          {FOLLOW_UPS.map((q) => <li key={q}><button type="button" onClick={() => onFollow(q)} className="min-h-11 rounded-full border border-line2 px-4 text-xs text-tx hover:bg-s2 md:min-h-9">{q}</button></li>)}
        </ul>
      ) : null}
    </article>
  );
}

/** The conversation: history, suggested questions, streamed answers with numbered sources, and the retrieval settings. */
export function Chat({ status, docs, onOpenDoc }: { status: Status | null; docs: DocRecord[]; onOpenDoc: (id: string) => void }) {
  const store = useChat();
  const context = useCopilotContext();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [openSrc, setOpenSrc] = useState<Record<string, number | null>>({});
  const [useCtx, setUseCtx] = useState(true);
  const [topK, setTopK] = useState<number | null>(null);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [docFilter, setDocFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const thread = store?.threads.find((t) => t.id === store.activeId) ?? null;
  const k = topK ?? status?.defaults.topK ?? 5;
  const th = threshold ?? status?.defaults.threshold ?? 0.12;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const tid = thread?.id ?? chats.newThread();
    const history = (thread?.messages ?? []).filter((m) => !m.error && m.content).map((m) => ({ role: m.role, content: m.content }));
    const sent = useCtx ? context : [];
    chats.push(tid, { role: "user", content: q });
    const aid = chats.push(tid, { role: "assistant", content: "", streaming: true, usedContext: sent.map((c) => c.label) });
    setInput("");
    setBusy(true);
    let text = "";
    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, history, context: sent, topK: k, threshold: th, docIds: docFilter === "all" ? undefined : [docFilter] }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `The Copilot service returned ${res.status}.`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as StreamEvent;
          if (e.t === "retrieval") chats.patch(tid, aid, { sources: e.sources, mode: e.mode, docs: e.docs });
          else if (e.t === "delta") { text += e.text; chats.patch(tid, aid, { content: text }); }
          else if (e.t === "done") chats.patch(tid, aid, { streaming: false, grounded: e.grounded, cited: e.cited, mode: e.mode });
          else chats.patch(tid, aid, { streaming: false, error: e.message });
        }
      }
      chats.patch(tid, aid, { streaming: false });
    } catch (e) {
      chats.patch(tid, aid, { streaming: false, error: e instanceof Error ? e.message : "The request failed. Check the connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  const toggle = (mid: string, n: number) => setOpenSrc((o) => ({ ...o, [mid]: o[mid] === n ? null : n }));
  const msgs = thread?.messages ?? [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside aria-label="Conversations" className="flex min-w-0 flex-col gap-2 lg:max-h-[40rem] lg:overflow-y-auto">
        <button type="button" onClick={() => chats.newThread()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-paper hover:bg-[color-mix(in_srgb,var(--night)_85%,white)]"><Plus aria-hidden="true" className="size-4" />New conversation</button>
        <ul className="flex gap-2 overflow-x-auto lg:flex-col">
          {(store?.threads ?? []).map((t) => (
            <li key={t.id} className={cn("flex min-w-44 items-center rounded-2xl lg:min-w-0", t.id === store?.activeId ? "bg-s2" : "hover:bg-s2/60")}>
              <button type="button" onClick={() => chats.open(t.id)} aria-current={t.id === store?.activeId} className="min-h-11 flex-1 truncate px-3 text-left text-sm text-tx">{t.title}</button>
              <button type="button" onClick={() => chats.remove(t.id)} aria-label={`Delete conversation ${t.title}`} className="inline-flex size-11 items-center justify-center text-mu hover:text-red"><Trash2 aria-hidden="true" className="size-3.5" /></button>
            </li>
          ))}
          {store && store.threads.length === 0 ? <li className="px-3 py-2 text-xs text-mu">No conversations yet.</li> : null}
        </ul>
      </aside>

      <section aria-label="Factory Copilot" className="flex min-w-0 flex-col rounded-2xl border border-line">
        <div className="flex min-h-[26rem] flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6 lg:max-h-[34rem]">
          {msgs.length === 0 ? (
            <div className="m-auto flex max-w-2xl flex-col gap-4 py-6 text-center">
              <h3 className="text-xl text-tx">Ask the factory</h3>
              <p className="text-sm text-mu">Answers come only from the documents in the knowledge base, with the page they came from. If the documents do not cover it, the Copilot says so.</p>
              <ul className="flex flex-wrap justify-center gap-2">
                {SUGGESTED.map((q) => <li key={q}><button type="button" onClick={() => ask(q)} className="min-h-11 rounded-full border border-line2 px-4 text-left text-xs text-tx hover:bg-s2 md:min-h-9">{q}</button></li>)}
              </ul>
            </div>
          ) : (
            msgs.map((m, i) => (
              <Message key={m.id} m={m} last={i === msgs.length - 1} open={openSrc[m.id] ?? null} onToggle={(n) => toggle(m.id, n)}
                onCiteOpen={(n) => { setOpenSrc((o) => ({ ...o, [m.id]: n })); document.getElementById(`src-${n}`)?.scrollIntoView({ block: "nearest" }); }}
                onOpenDoc={onOpenDoc} onFollow={ask} onFeedback={(f) => thread && chats.patch(thread.id, m.id, { feedback: m.feedback === f ? undefined : f })} />
            ))
          )}
          <div ref={end} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="flex flex-col gap-3 border-t border-line p-3 md:p-4">
          {context.length ? (
            <label className="flex min-h-11 items-start gap-2 text-xs text-mu md:min-h-0">
              <input type="checkbox" checked={useCtx} onChange={(e) => setUseCtx(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand2)]" />
              <span>Include what I am looking at: <span className="text-tx">{context.map((c) => c.label).join(", ")}</span>. Only real dashboard values are sent.</span>
            </label>
          ) : <p className="text-xs text-mu">No machine, order or issue is selected, so only the documents are used. Open the dashboard or planner and select something to ask about it.</p>}
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="copilot-q">Your question</label>
            <textarea id="copilot-q" value={input} onChange={(e) => setInput(e.target.value)} rows={2} maxLength={2000} placeholder="Ask about a machine, a procedure or a problem"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
              className="min-h-12 flex-1 resize-none rounded-2xl border border-line2 bg-s1 px-4 py-3 text-sm text-tx" />
            <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings} aria-label="Search settings" className="inline-flex size-12 items-center justify-center rounded-full border border-line2 text-mu hover:bg-s2 hover:text-tx"><SlidersHorizontal aria-hidden="true" className="size-4" /></button>
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="inline-flex size-12 items-center justify-center rounded-full bg-night text-paper disabled:opacity-40"><Send aria-hidden="true" className="size-4" /></button>
          </div>
          {showSettings ? (
            <div className="grid gap-3 rounded-2xl bg-s2/60 p-3 text-xs text-mu sm:grid-cols-3">
              <label className="flex flex-col gap-1">Passages to use: <span className="text-tx tabular-nums">{k}</span>
                <input type="range" min={1} max={status?.defaults.topKMax ?? 10} value={k} onChange={(e) => setTopK(Number(e.target.value))} className="accent-[var(--brand2)]" /></label>
              <label className="flex flex-col gap-1">Minimum match: <span className="text-tx tabular-nums">{Math.round(th * 100)}%</span>
                <input type="range" min={0.02} max={0.6} step={0.01} value={th} onChange={(e) => setThreshold(Number(e.target.value))} className="accent-[var(--brand2)]" /></label>
              <label className="flex flex-col gap-1">Search in
                <select value={docFilter} onChange={(e) => setDocFilter(e.target.value)} className="h-11 rounded-xl border border-line2 bg-s1 px-3 text-sm text-tx md:h-9">
                  <option value="all">All documents</option>{docs.filter((d) => d.status === "ready").map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select></label>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
