import Link from "next/link";
import { COMPANY, PRODUCTS, ROLES, SERVICES, VALUES } from "@/lib/company";
import { ruled, Section } from "../Section";
import { ServicesCarousel } from "./ServicesCarousel";

const more =
  "mt-10 inline-flex min-h-11 items-center text-sm text-tx underline decoration-line2 underline-offset-4 transition-colors duration-150 hover:decoration-brand2";

/**
 * Picks up from the intro's dark curtain: the services, as a full-width carousel. The text list
 * is for screen readers, since the carousel's own captions are hidden from them.
 */
export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-title" data-section-theme="dark" data-theme-at={1.2} className="scroll-mt-18 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <h2 id="services-title" className="display max-w-[22ch] text-2xl text-balance text-tx">
          What we do
        </h2>
        <p className="mt-5 max-w-[56ch] text-lg text-mu">
          More than the box: from the first drawing to the pallet at your dock.
        </p>
      </div>
      <div className="mt-10">
        <ServicesCarousel />
      </div>
      <p className="mx-auto mt-4 max-w-5xl px-5 text-sm text-mu md:px-8">
        <span className="md:hidden">Swipe to browse. Tap a drawing to enlarge it.</span>
        <span className="hidden md:inline">Drag, or focus the row and use the arrow keys. Click a drawing to enlarge it.</span>
      </p>
      <ul className="sr-only">
        {SERVICES.map((s) => (
          <li key={s.title}>
            {s.title}: {s.body}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the plant makes. */
export function MakeSection() {
  return (
    <Section id="make" theme="dark" title="What we make" lede={COMPANY.summary}>
      <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
        {PRODUCTS.map((p) => (
          <li key={p.name} className={ruled}>
            <h3 className="text-lg text-tx">{p.name}</h3>
            <p className="mt-2 text-sm text-mu">{p.body}</p>
            <p className="mt-4 text-sm text-tx">{p.spec}</p>
          </li>
        ))}
      </ul>
      <Link href="/products" className={more}>
        See products and flute guide
      </Link>
    </Section>
  );
}

/** How the plant is run, in three lines. */
export function WhySection() {
  return (
    <Section id="why" theme="light" title={`Why ${COMPANY.name}`}>
      <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
        {VALUES.map((v) => (
          <li key={v.title} className={ruled}>
            <h3 className="text-lg text-tx">{v.title}</h3>
            <p className="mt-3 text-sm text-mu">{v.body}</p>
          </li>
        ))}
      </ul>
      <Link href="/about" className={more}>
        About the company
      </Link>
    </Section>
  );
}

/** Careers teaser: the roles, one line each. */
export function CareersTeaser() {
  return (
    <Section
      id="careers"
      theme="light"
      title="Work on the line"
      lede="Most of our team learned the trade on our own line. We train from day one."
    >
      <ul>
        {ROLES.map((r) => (
          <li key={r.title} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-line py-5">
            <span className="text-lg text-tx">{r.title}</span>
            <span className="text-sm text-mu">
              {r.team}, {r.shift.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/careers" className={more}>
        See open roles
      </Link>
    </Section>
  );
}
