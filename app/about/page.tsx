import type { Metadata } from "next";
import Link from "next/link";
import { ruled, Section } from "@/components/site/Section";
import { PageHero, SitePage } from "@/components/site/SitePage";
import { NODES } from "@/lib/assumptions";
import { COMPANY, VALUES } from "@/lib/company";
import type { NodeId } from "@/lib/types";

export const metadata: Metadata = { title: "About" };

/** What each machine on the line does, in plain words. */
const STEP: Record<NodeId, string> = {
  reel: "Paper reels are spliced on the fly, so the line never stops for a new roll.",
  sf: "Steam and heated rolls press the medium into flutes and glue it to the first liner.",
  db: "The second liner is glued on and the board dries flat on hot plates.",
  ss: "Board is slit to width and scored where it will fold.",
  co: "A rotary knife cuts sheets to length and stacks them.",
  ps: "Sheets are printed, slotted and creased into box blanks.",
  fg: "Blanks are folded and glued into flat boxes.",
  bd: "Boxes are counted, bundled and strapped for the pallet.",
};

export default function AboutPage() {
  return (
    <SitePage>
      <PageHero title="We make boxes" lede={COMPANY.summary} />

      <Section id="line" theme="dark" title="From reel to pallet" lede="Eight machines, one plant. This is the order every box goes through.">
        <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {NODES.map((n, i) => (
            <li key={n.id} className={ruled}>
              <p className="text-sm text-mu">Step {i + 1}</p>
              <h3 className="mt-2 text-lg text-tx">{n.label}</h3>
              <p className="mt-2 text-sm text-mu">{STEP[n.id]}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="values" theme="light" title="How we work">
        <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
          {VALUES.map((v) => (
            <li key={v.title} className={ruled}>
              <h3 className="text-lg text-tx">{v.title}</h3>
              <p className="mt-3 text-sm text-mu">{v.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="numbers"
        theme="light"
        title="Run on numbers"
        lede="Our plant dashboard turns every stop, slow minute and strip of trim into rupees, finds the machine holding the line back and ranks fixes by what they return each month."
      >
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-tx underline decoration-line2 underline-offset-4 transition-colors duration-150 hover:decoration-brand2"
        >
          Open the plant dashboard
        </Link>
      </Section>
    </SitePage>
  );
}
