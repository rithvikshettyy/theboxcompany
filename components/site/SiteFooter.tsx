import Link from "next/link";
import { Wordmark } from "@/components/brand/Brand";
import { COMPANY } from "@/lib/company";
import { SITE_LINKS } from "./SiteHeader";

const link =
  "inline-flex min-h-11 items-center text-sm text-mu transition-colors duration-150 hover:text-tx";

type Cta = { title: string; href: string; label: string };
const DEFAULT_CTA: Cta = { title: "Tell us what you ship", href: "/contact", label: "Contact us" };

/** Closing call to action (dark), then the footer with every page and the dashboard. */
export function SiteFooter({ cta = DEFAULT_CTA }: { cta?: Cta }) {
  return (
    <>
      <section
        aria-labelledby="cta-title"
        data-section-theme="dark"
        className="mx-auto w-full max-w-5xl px-5 pt-16 pb-32 md:px-8"
      >
        <div className="flex flex-col items-start gap-8 border-t border-line pt-16 md:flex-row md:items-end md:justify-between">
          <h2 id="cta-title" className="display max-w-[18ch] text-2xl text-balance text-tx">
            {cta.title}
          </h2>
          <Link
            href={cta.href}
            className="inline-flex h-12 shrink-0 items-center rounded-chip bg-brand px-6 text-base font-medium text-bg transition-colors duration-150 hover:bg-tx"
          >
            {cta.label}
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-8">
          <div className="flex flex-col gap-2">
            <Wordmark />
            <p className="max-w-xs text-sm text-mu">{COMPANY.tagline}</p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6">
              {[{ href: "/", label: "Home" }, ...SITE_LINKS, { href: "/dashboard", label: "Dashboard" }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
