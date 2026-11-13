import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  /** Section anchor. Also used for scroll targets (#pareto, #heatmap, #trim). */
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right side of the header: toggles, filters, "clear" links. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** 1 only for the hero. Sections are h2. */
  level?: 1 | 2 | 3;
  /** false drops the white card (for groups of tiles that are cards themselves). */
  surface?: boolean;
  /** Marks the section as loading for assistive tech. */
  busy?: boolean;
};

const HEADINGS = { 1: "h1", 2: "h2", 3: "h3" } as const;

export function Card({
  id,
  title,
  subtitle,
  actions,
  children,
  className,
  level = 2,
  surface = true,
  busy = false,
}: CardProps) {
  const Heading = HEADINGS[level];
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
      className={cn(
        "flex min-w-0 flex-col gap-5",
        surface && "rounded-3xl bg-s1 p-5 shadow-card md:p-6",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <Heading
            id={titleId}
            className={level === 1 ? "text-sm text-mu" : "text-base font-medium text-tx"}
          >
            {title}
          </Heading>
          {subtitle ? <p className="mt-2 max-w-[64ch] text-sm text-mu">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
