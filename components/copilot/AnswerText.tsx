import type { ReactNode } from "react";

/** Inline: **bold** and [n] citation markers, which become buttons that open the matching source card. */
function inline(text: string, onCite: (n: number) => void, valid: number): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i} className="font-medium text-tx">{bold[1]}</strong>;
    const cite = /^\[(\d+)\]$/.exec(part);
    if (cite) {
      const n = Number(cite[1]);
      return n >= 1 && n <= valid ? (
        <button key={i} type="button" onClick={() => onCite(n)} aria-label={`Open source ${n}`} className="mx-0.5 inline-flex min-w-6 items-center justify-center rounded-md bg-brand2/15 px-1 align-baseline text-xs font-medium text-brand2 hover:bg-brand2/25">
          {n}
        </button>
      ) : (
        <span key={i} className="text-mu">{part}</span>
      );
    }
    return part;
  });
}

/** The answer as plain structure: headings written as **Heading** on their own line, bullets, paragraphs. */
export function AnswerText({ text, sources, onCite }: { text: string; sources: number; onCite: (n: number) => void }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-tx">
      {lines.map((raw, i) => {
        const line = raw.trim();
        if (!line) return null;
        const head = /^\*\*([^*]+)\*\*:?$/.exec(line) ?? /^#{1,4}\s+(.*)$/.exec(line);
        if (head) return <h4 key={i} className="mt-2 text-xs font-medium tracking-wide text-mu uppercase">{head[1]}</h4>;
        const bullet = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
        if (bullet) return <p key={i} className="flex gap-2 pl-1"><span aria-hidden="true" className="text-mu">•</span><span>{inline(bullet[1], onCite, sources)}</span></p>;
        return <p key={i}>{inline(line, onCite, sources)}</p>;
      })}
    </div>
  );
}
