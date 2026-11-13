import { BoxIntro } from "@/components/intro/BoxIntro";
import { HomeHero } from "@/components/site/home/HomeHero";
import { CareersTeaser, MakeSection, ServicesSection, WhySection } from "@/components/site/home/HomeSections";
import { SitePage } from "@/components/site/SitePage";

/**
 * Company homepage: the hero over the live GlimmerVale meadow, then "How a box is made" (the box
 * scroll story), then what we do (services carousel), what we make, why us and who we hire. Dark at the top, blending to light and
 * back as you scroll; the plant dashboard is one click away in the header.
 */
export default function HomePage() {
  return (
    <SitePage start="dark">
      <HomeHero />
      <BoxIntro />
      <ServicesSection />
      <MakeSection />
      <WhySection />
      <CareersTeaser />
    </SitePage>
  );
}
