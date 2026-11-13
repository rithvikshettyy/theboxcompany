import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  id: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Page theme while this section is being read (ThemeScroll). */
  theme: "light" | "dark";
  /** Viewport fraction its top must pass to take over the theme. Default 0.5. */
  themeAt?: number;
};

/**
 * One site section: a plain heading, an optional lede, then content. Separated from the
 * next section by space and one hairline, never by a card. Clears the fixed header on anchor jumps.
 */
export function Section({ id, title, lede, children, className, theme, themeAt }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-section-theme={theme}
      data-theme-at={themeAt}
      className={cn("mx-auto w-full max-w-5xl scroll-mt-18 px-5 py-24 md:px-8 md:py-32", className)}
    >
      <h2
        id={`${id}-title`}
        className="display max-w-[22ch] text-2xl text-balance text-tx"
      >
        {title}
      </h2>
      {lede ? <p className="mt-5 max-w-[56ch] text-lg text-mu tabular-nums">{lede}</p> : null}
      <div className="mt-14">{children}</div>
    </section>
  );
}

/** A column in a hairline-topped grid: the only structure the site uses. */
export const ruled = "border-t border-line pt-6";
