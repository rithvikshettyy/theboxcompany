import { ChevronDown, FileText, TriangleAlert } from "lucide-react";
import type { Source } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";

/** One piece of evidence: document, page, the matching excerpt, and the full passage on request. */
export function SourceCard({ s, open, cited, onToggle, onOpenDoc }: { s: Source; open: boolean; cited: boolean; onToggle: () => void; onOpenDoc: (docId: string) => void }) {
  return (
    <li id={`src-${s.n}`} className={cn("rounded-2xl border p-3 transition-colors duration-150", cited ? "border-brand2/60 bg-brand2/5" : "border-line bg-s2/50")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-brand2/15 text-xs font-medium text-brand2">{s.n}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-mu">
            <FileText aria-hidden="true" className="size-3.5" />
            <span className="truncate text-tx">{s.docName}</span>
            <span>page {s.page}</span>
            <span className="tabular-nums">match {Math.round(s.score * 100)}%</span>
            {cited ? <span className="text-brand2">cited in the answer</span> : null}
          </span>
          <span className={cn("mt-1 block text-xs text-mu", !open && "line-clamp-3")}>{open ? s.text : s.excerpt}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("mt-1 size-4 shrink-0 text-mu transition-transform duration-150", open && "rotate-180")} />
      </button>
      {s.suspicious ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber"><TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />This passage contains text that looks like an instruction to the AI. It was treated as plain text and not followed.</p>
      ) : null}
      {open ? <button type="button" onClick={() => onOpenDoc(s.docId)} className="mt-2 inline-flex min-h-11 items-center text-xs text-mu underline underline-offset-2 hover:text-tx md:min-h-8">Open {s.docName} in the knowledge base</button> : null}
    </li>
  );
}
