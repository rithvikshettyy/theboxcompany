import type { ComponentProps, ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { ThemeScroll } from "./ThemeScroll";

/** Every company-site page: header, content that blends light and dark on scroll, footer. */
export function SitePage({
  children,
  cta,
  start,
}: {
  children: ReactNode;
  cta?: ComponentProps<typeof SiteFooter>["cta"];
  /** Theme of the first section, rendered on the server so nothing flashes. */
  start?: "light" | "dark";
}) {
  return (
    <ThemeScroll start={start}>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter cta={cta} />
    </ThemeScroll>
  );
}

/**
 * Opening block of an inner page: one big heading and a short lede, light. It fills most of the
 * first screen so the next section (and its theme) starts below the fold.
 */
export function PageHero({ title, lede, position = "end" }: { title: string; lede: string; position?: "end" | "center" }) {
  return (
    <section
      aria-labelledby="page-title"
      data-section-theme="light"
      className={`mx-auto flex min-h-[88svh] w-full max-w-5xl flex-col items-center text-center px-5 pt-40 pb-24 md:px-8 ${position === "center" ? "justify-center" : "justify-end"}`}
    >
      <h1 id="page-title" className="display max-w-[16ch] text-2xl text-balance text-tx md:text-3xl">
        {title}
      </h1>
      <p className="mt-6 max-w-[56ch] text-lg text-mu">{lede}</p>
    </section>
  );
}
