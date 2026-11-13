import type { Metadata } from "next";
import { ruled, Section } from "@/components/site/Section";
import { PageHero, SitePage } from "@/components/site/SitePage";
import { FLUTES, PRODUCTS } from "@/lib/company";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <SitePage>
      <PageHero
        title="Boxes and board, made to spec"
        lede="Cartons, printed packs, die-cut shapes and flat sheets, all made on one line. Tell us the product and how it ships, and we will suggest the board."
      />

      <Section id="range" theme="dark" title="The range">
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {PRODUCTS.map((p) => (
            <li key={p.name} className={ruled}>
              <h3 className="text-lg text-tx">{p.name}</h3>
              <p className="mt-2 text-sm text-mu">{p.body}</p>
              <p className="mt-4 text-sm text-tx">{p.spec}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="flutes"
        theme="light"
        title="Choosing a flute"
        lede="The flute is the wavy layer inside the board. Taller flutes cushion more; shorter flutes print better."
      >
        <table className="w-full text-left">
          <caption className="sr-only">Flute types, their height and what they suit</caption>
          <thead>
            <tr className="text-sm text-mu">
              <th scope="col" className="pb-4 font-normal">Flute</th>
              <th scope="col" className="pb-4 font-normal">Height</th>
              <th scope="col" className="pb-4 font-normal">Best for</th>
            </tr>
          </thead>
          <tbody>
            {FLUTES.map((f) => (
              <tr key={f.flute} className="border-t border-line align-top">
                <th scope="row" className="display py-5 pr-6 text-lg font-semibold text-tx">{f.flute}</th>
                <td className="py-5 pr-6 text-sm whitespace-nowrap text-mu">{f.height}</td>
                <td className="py-5 text-base text-tx">{f.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </SitePage>
  );
}
