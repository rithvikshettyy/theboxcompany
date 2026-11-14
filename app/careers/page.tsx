import type { Metadata } from "next";
import { ruled, Section } from "@/components/site/Section";
import { PageHero, SitePage } from "@/components/site/SitePage";
import { COMPANY, ROLES, SHIFT_PATTERN } from "@/lib/company";

export const metadata: Metadata = { title: "Careers" };

const apply = (role: string) =>
  `mailto:${COMPANY.careersEmail}?subject=${encodeURIComponent(`Application: ${role}`)}`;

const EXPECT = [
  { title: "Training on the line", body: "You learn each machine beside someone who runs it every day." },
  { title: "Clear shifts", body: `We run ${SHIFT_PATTERN}, with rotas set well ahead.` },
  { title: "A plant that runs on facts", body: "Targets and losses are on a screen for everyone, so good work is seen." },
] as const;

export default function CareersPage() {
  return (
    <SitePage
      cta={{ title: "Don't see your role?", href: `mailto:${COMPANY.careersEmail}`, label: "Email us your CV" }}
    >
      <PageHero
        position="center"
        title="Build boxes with us"
        lede="We hire operators, inspectors, planners and fitters. Most of our team learned the trade on our own line."
      />

      <Section id="roles" theme="dark" title="Open roles">
        <ul>
          {ROLES.map((r) => (
            <li
              key={r.title}
              className="grid gap-x-8 gap-y-3 border-t border-line py-8 md:grid-cols-[1fr_auto] md:items-start"
            >
              <div>
                <h3 className="text-lg text-tx">{r.title}</h3>
                <p className="mt-1 text-sm text-mu">
                  {r.team}, {r.shift.toLowerCase()}
                </p>
                <p className="mt-3 max-w-[56ch] text-sm text-mu">{r.body}</p>
              </div>
              <a
                href={apply(r.title)}
                className="inline-flex h-11 w-fit items-center rounded-chip border border-line2 px-5 text-sm font-medium text-tx transition-colors duration-150 hover:bg-s2"
              >
                Apply
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="expect" theme="light" title="What to expect">
        <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
          {EXPECT.map((e) => (
            <li key={e.title} className={ruled}>
              <h3 className="text-lg text-tx">{e.title}</h3>
              <p className="mt-3 text-sm text-mu">{e.body}</p>
            </li>
          ))}
        </ul>
      </Section>
    </SitePage>
  );
}
