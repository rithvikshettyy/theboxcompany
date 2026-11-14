"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, BookOpen, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageIntro } from "@/components/ops/Stats";
import type { DocRecord } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";
import { Chat, type Status } from "./Chat";
import { KnowledgeBase } from "./KnowledgeBase";

type Tab = "ask" | "kb";

/** Factory Copilot: ask questions answered from the uploaded documents, and manage those documents. */
export function CopilotView() {
  const [tab, setTab] = useState<Tab>("ask");
  const [status, setStatus] = useState<Status | null>(null);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async (q: string) => {
    try {
      const [s, d] = await Promise.all([fetch("/api/copilot/status"), fetch(`/api/copilot/documents?q=${encodeURIComponent(q)}`)]);
      if (!s.ok || !d.ok) throw new Error();
      setStatus((await s.json()) as Status);
      setDocs(((await d.json()) as { docs: DocRecord[] }).docs);
      setLoadError("");
    } catch {
      setLoadError("Could not load the knowledge base. Check the connection and try again.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(query), query ? 200 : 0);
    return () => clearTimeout(t);
  }, [query, refresh]);

  const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
    { id: "ask", label: "Ask", icon: MessageSquare },
    { id: "kb", label: `Knowledge base${status ? ` (${status.docs})` : ""}`, icon: BookOpen },
  ];
  const demo = status?.llm !== "anthropic";

  return (
    <main id="main" className="grid w-full grid-cols-12 gap-4 px-5 pt-4 pb-24 md:px-8 lg:gap-6 lg:px-10">
      <PageIntro title="Factory Copilot" lede="Ask about machines, procedures and problems. Every answer comes from your uploaded documents and shows where it came from." />

      <div role="note" className="col-span-12 flex flex-wrap items-start gap-x-4 gap-y-1 rounded-3xl bg-s1 p-4 text-sm shadow-card md:px-6">
        <Bot aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand2" />
        <p className="min-w-0 flex-1 text-mu">
          {status ? (
            demo ? (
              <><strong className="font-medium text-tx">Demo mode.</strong> No AI model is connected (set <code className="text-tx">ANTHROPIC_API_KEY</code> on the server). Search is real: it finds the matching passages in your documents and quotes them with their pages. It does not write or summarise answers. Search uses a local keyword embedding ({status.embedder}), not a cloud model.</>
            ) : (
              <><strong className="font-medium text-tx">Connected to {status.model}.</strong> Answers are written only from retrieved passages, with citations. Search embedding: {status.embedder}. {status.chunks} passages from {status.docs} documents are indexed.</>
            )
          ) : loadError || "Checking what is connected..."}
        </p>
      </div>

      <div role="tablist" aria-label="Copilot sections" className="col-span-12 flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm", tab === t.id ? "bg-night text-paper" : "bg-s1 text-mu hover:text-tx")}>
            <t.icon aria-hidden="true" className="size-4" />{t.label}
          </button>
        ))}
      </div>

      <Card id="copilot" title={tab === "ask" ? "Ask" : "Knowledge base"} subtitle={tab === "ask" ? "Answers cite the document and page. Click a number to see the passage." : "The documents the Copilot searches. Text from documents is treated as data, never as instructions."} className="col-span-12">
        {loadError && !status ? (
          <p role="alert" className="rounded-2xl bg-red/10 p-4 text-sm text-red">{loadError} <button type="button" onClick={() => void refresh(query)} className="underline underline-offset-2">Try again</button></p>
        ) : tab === "ask" ? (
          <Chat status={status} docs={docs} onOpenDoc={(id) => { setQuery(docs.find((d) => d.id === id)?.name ?? ""); setTab("kb"); }} />
        ) : (
          <KnowledgeBase docs={docs} query={query} onQuery={setQuery} onChanged={() => void refresh(query)} />
        )}
      </Card>
    </main>
  );
}
