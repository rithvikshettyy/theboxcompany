"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { AnswerText } from "@/components/copilot/AnswerText";
import type { Source, StreamEvent } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";

type Turn = { q: string; a: string; sources: Source[]; streaming: boolean; error?: string };

const SUGGESTED = [
  "What is OEE and how is it calculated?",
  "How is the profit leak worked out?",
  "How does the production planner build a schedule?",
  "What is the difference between B flute and C flute?",
  "Is the data in this dashboard real?",
  "What does The Box Company make?",
];

/** Floating "Ask" button on every dashboard page: questions about the website and dashboard, answered from the website documentation. No API key needed. */
export function AskWidget() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns]);
  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (path === "/dashboard/copilot") return null;

  const update = (i: number, patch: Partial<Turn>) => setTurns((t) => t.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const i = turns.length;
    const history = turns.filter((t) => t.a && !t.error).flatMap((t) => [{ role: "user" as const, content: t.q }, { role: "assistant" as const, content: t.a }]);
    setTurns((t) => [...t, { q, a: "", sources: [], streaming: true }]);
    setInput("");
    setBusy(true);
    setOpenSrc(null);
    let text = "";
    try {
      const res = await fetch("/api/copilot/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, history, kb: "site", topK: 4 }) });
      if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `The service returned ${res.status}.`);
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
          if (e.t === "retrieval") update(i, { sources: e.sources });
          else if (e.t === "delta") { text += e.text; update(i, { a: text }); }
          else if (e.t === "error") update(i, { error: e.message });
        }
      }
    } catch (e) {
      update(i, { error: e instanceof Error ? e.message : "The request failed. Check the connection and try again." });
    } finally {
      update(i, { streaming: false });
      setBusy(false);
    }
  }

  return (
    <div className="no-print">
      {open ? (
        <section role="dialog" aria-label="Ask about the website and dashboard" className="fixed inset-x-3 bottom-20 z-40 flex max-h-[min(36rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl border border-line bg-s1 shadow-card sm:inset-x-auto sm:right-5 sm:w-[24rem]">
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-base text-tx">Ask</h2>
              <p className="text-xs text-mu">Answers from the website documentation. No account or key needed.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex size-11 items-center justify-center rounded-full text-mu hover:bg-s2 hover:text-tx"><X aria-hidden="true" className="size-4" /></button>
          </header>

          <div className="flex min-h-48 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {turns.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-mu">Ask how a number is calculated, how a page works, or about the company and its products.</p>
                <ul className="flex flex-wrap gap-2">
                  {SUGGESTED.map((s) => <li key={s}><button type="button" onClick={() => void ask(s)} className="min-h-11 rounded-full border border-line2 px-3 text-left text-xs text-tx hover:bg-s2">{s}</button></li>)}
                </ul>
              </div>
            ) : turns.map((t, i) => (
              <div key={i} className="flex flex-col gap-2">
                <p className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-night px-3 py-2 text-sm text-paper">{t.q}</p>
                {t.streaming && !t.a ? <p className="text-xs text-mu">Searching the documentation...</p> : null}
                {t.a ? <AnswerText text={t.a} sources={t.sources.length} onCite={(n) => setOpenSrc(`${i}:${n}`)} /> : null}
                {t.error ? <p role="alert" className="rounded-xl bg-red/10 p-2 text-xs text-red">{t.error}</p> : null}
                {t.sources.length > 0 && !t.streaming ? (
                  <ul className="flex flex-col gap-1" aria-label="Sources">
                    {t.sources.map((s) => {
                      const key = `${i}:${s.n}`;
                      return (
                        <li key={s.chunkId} className="rounded-xl bg-s2/60 text-xs">
                          <button type="button" onClick={() => setOpenSrc(openSrc === key ? null : key)} aria-expanded={openSrc === key} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-mu">
                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded bg-brand2/15 text-brand2">{s.n}</span>
                            <span className="truncate text-tx">{s.docName}</span><span>page {s.page}</span>
                          </button>
                          {openSrc === key ? <p className="px-3 pb-3 text-mu">{s.text}</p> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ))}
            <div ref={end} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="flex flex-col gap-2 border-t border-line p-3">
            <div className="flex items-end gap-2">
              <label htmlFor="ask-q" className="sr-only">Your question</label>
              <textarea ref={field} id="ask-q" rows={1} value={input} maxLength={2000} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
                className="min-h-11 flex-1 resize-none rounded-2xl border border-line2 bg-s1 px-3 py-2.5 text-sm text-tx" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="inline-flex size-11 items-center justify-center rounded-full bg-night text-paper disabled:opacity-40"><Send aria-hidden="true" className="size-4" /></button>
            </div>
            <p className="text-2xs text-mu">For your own uploaded manuals and SOPs, use <Link href="/dashboard/copilot" className="underline underline-offset-2 hover:text-tx">Factory Copilot</Link>.</p>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close the Ask chat" : "Ask a question"}
        className={cn("fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-paper shadow-card transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--night)_85%,white)] sm:right-5 sm:bottom-5")}
      >
        <MessageCircle aria-hidden="true" className="size-4" />
        Ask
      </button>
    </div>
  );
}
