import type { Metadata } from "next";
import { ContactForm } from "@/components/site/ContactForm";
import { Section } from "@/components/site/Section";
import { PageHero, SitePage } from "@/components/site/SitePage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <SitePage cta={{ title: "See how the plant is running", href: "/dashboard", label: "Open the dashboard" }}>
      <PageHero
        position="center"
        title="Tell us what you ship"
        lede="Send the product, its size and how many you need a month. We reply with a board recommendation and a price."
      />
      <Section
        id="enquiry"
        theme="light"
        title="Enquiry"
        lede={
          <>
            Or write to us at{" "}
            <a href={`mailto:${COMPANY.email}`} className="text-tx underline decoration-line2 underline-offset-4">
              {COMPANY.email}
            </a>
            .
          </>
        }
      >
        <ContactForm />
      </Section>
    </SitePage>
  );
}
