"use client";

import { useRef, useState } from "react";
import { FileText, RefreshCw, Search, Trash2, TriangleAlert, Upload } from "lucide-react";
import type { DocRecord } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";

type Upload = { name: string; state: "uploading" | "done" | "failed"; message?: string };

const SIZE = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Upload, list, search, re-index and delete the documents the Copilot answers from. */
export function KnowledgeBase({ docs, query, onQuery, onChanged }: { docs: DocRecord[]; query: string; onQuery: (q: string) => void; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      setUploads((u) => [{ name: file.name, state: "uploading" }, ...u]);
      const fd = new FormData();
      fd.set("file", file);
      try {
        const res = await fetch("/api/copilot/documents", { method: "POST", body: fd });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setUploads((u) => u.map((x) => (x.name === file.name && x.state === "uploading" ? { ...x, state: res.ok ? "done" : "failed", message: res.ok ? undefined : (body.error ?? `Failed (${res.status}).`) } : x)));
      } catch {
        setUploads((u) => u.map((x) => (x.name === file.name && x.state === "uploading" ? { ...x, state: "failed", message: "Could not reach the server." } : x)));
      }
      onChanged();
    }
    if (input.current) input.current.value = "";
  }

  async function act(id: string, run: () => Promise<Response>) {
    setBusyId(id);
    setError("");
    try {
      const res = await run();
      if (!res.ok) setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Request failed (${res.status}).`);
    } catch {
      setError("Could not reach the server.");
    }
    setBusyId(null);
    setConfirm(null);
    onChanged();
  }

  const addSamples = () => act("samples", () => fetch("/api/copilot/samples", { method: "POST" }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} id="kb-upload" type="file" multiple accept=".pdf,.docx,.txt,.csv" onChange={(e) => void upload(e.target.files)} className="sr-only" />
        <label htmlFor="kb-upload" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-paper hover:bg-[color-mix(in_srgb,var(--night)_85%,white)] focus-within:outline-2"><Upload aria-hidden="true" className="size-4" />Upload documents</label>
        <span className="text-xs text-mu">PDF, DOCX, TXT or CSV, up to 10 MB each. Text is extracted and indexed on the server.</span>
        <label className="relative ml-auto flex items-center">
          <span className="sr-only">Search documents</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-mu" />
          <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search documents" className="h-11 w-56 rounded-full border border-line2 bg-s1 pr-4 pl-9 text-sm text-tx md:h-9" />
        </label>
      </div>

      {uploads.length ? (
        <ul aria-live="polite" className="flex flex-col gap-1 text-sm">
          {uploads.slice(0, 5).map((u, i) => (
            <li key={`${u.name}-${i}`} className={cn("flex items-center gap-2 rounded-xl px-3 py-2", u.state === "failed" ? "bg-red/10 text-red" : "bg-s2/60 text-mu")}>
              <span className="truncate text-tx">{u.name}</span>
              <span>{u.state === "uploading" ? "Uploading, extracting text and indexing..." : u.state === "done" ? "Indexed" : u.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="alert" className="rounded-xl bg-red/10 p-3 text-sm text-red">{error}</p> : null}

      {docs.length === 0 ? (
        <div className="rounded-2xl bg-s2/70 p-6 text-center">
          <p className="text-base text-tx">{query ? "No documents match" : "The knowledge base is empty"}</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-mu">{query ? "Try another word or clear the search." : "Upload manuals, SOPs, maintenance and quality documents. Until then the Copilot cannot answer factory questions. The demo documents are short, made-up examples for trying it out."}</p>
          {!query ? <button type="button" onClick={addSamples} disabled={busyId === "samples"} className="mt-4 inline-flex h-11 items-center rounded-full border border-line2 px-5 text-sm text-tx hover:bg-s2 disabled:opacity-50">Add demo documents</button> : null}
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-s2/60 p-4">
                <FileText aria-hidden="true" className="size-5 shrink-0 text-mu" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm text-tx">
                    <span className="truncate">{d.name}</span>
                    {d.sample ? <span className="rounded-full bg-amber/10 px-2 py-0.5 text-2xs text-amber">Demo document</span> : null}
                    <span className={cn("rounded-full px-2 py-0.5 text-2xs", d.status === "ready" ? "bg-green/10 text-green" : "bg-red/10 text-red")}>{d.status === "ready" ? "Ready" : "Failed"}</span>
                  </span>
                  <span className="block text-xs text-mu tabular-nums">{d.kind.toUpperCase()} · {SIZE(d.sizeBytes)} · {d.pageCount} {d.pageCount === 1 ? "page" : "pages"} · {d.chunkCount} chunks · indexed {new Date(d.indexedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  {d.flagged ? <span className="mt-1 flex items-start gap-1.5 text-xs text-amber"><TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />Contains text that looks like instructions to the AI. It is searched as plain data and never followed.</span> : null}
                  {d.error ? <span className="block text-xs text-red">{d.error}</span> : null}
                </span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => act(d.id, () => fetch(`/api/copilot/documents/${d.id}/reindex`, { method: "POST" }))} disabled={busyId === d.id} aria-label={`Re-index ${d.name}`} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-xs text-mu hover:bg-s1 hover:text-tx disabled:opacity-50 md:h-9"><RefreshCw aria-hidden="true" className={cn("size-3.5", busyId === d.id && "animate-spin")} />Re-index</button>
                  {confirm === d.id ? (
                    <>
                      <button type="button" onClick={() => act(d.id, () => fetch(`/api/copilot/documents/${d.id}`, { method: "DELETE" }))} className="h-11 rounded-full bg-red/10 px-3 text-xs text-red md:h-9">Delete {d.name}</button>
                      <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-full px-3 text-xs text-mu md:h-9">Keep</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirm(d.id)} aria-label={`Delete ${d.name}`} className="inline-flex size-11 items-center justify-center rounded-full text-mu hover:bg-red/10 hover:text-red md:size-9"><Trash2 aria-hidden="true" className="size-3.5" /></button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {!docs.some((d) => d.sample) && !query ? <button type="button" onClick={addSamples} className="self-start text-xs text-mu underline underline-offset-2 hover:text-tx">Add the demo documents</button> : null}
        </>
      )}
    </div>
  );
}
