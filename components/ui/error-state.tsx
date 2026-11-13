import { CircleAlert, RotateCw } from "lucide-react";

/** Plain sentence plus one retry button (CLAUDE.md §4 rule 19). */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-panel border border-red/40 bg-s2/60 p-4"
    >
      <p className="flex items-start gap-2 text-sm text-tx">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red" />
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-11 items-center gap-2 rounded-chip border border-line2 px-4 text-sm font-medium text-tx transition-colors duration-150 hover:bg-s2 md:h-9"
      >
        <RotateCw aria-hidden="true" className="size-4" />
        Try again
      </button>
    </div>
  );
}
