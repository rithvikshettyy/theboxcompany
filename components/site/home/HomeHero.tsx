import Link from "next/link";
import { ArrowDown, ChevronDown } from "lucide-react";
import { HeroBackdrop } from "@/components/intro/HeroBackdrop";
import { COMPANY } from "@/lib/company";

/**
 * Homepage hero: one screen over the live GlimmerVale meadow (WebGL, lazy, mounted only while on
 * screen). The headline sits in the clear sky above the ridge; the box animation follows below.
 */
export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" data-section-theme="dark" className="relative h-svh min-h-[34rem] overflow-hidden">
      <HeroBackdrop />
      {/* A light darkening at the top, behind the headline in the sky. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-night/60 to-transparent" />

      <div className="absolute inset-x-5 top-[18vh] z-10 flex flex-col items-center gap-6 text-center lg:inset-x-auto lg:top-[26vh] lg:left-[max(2rem,calc(50vw-30rem))] lg:max-w-[min(46vw,40rem)] lg:items-start lg:text-left">
        <h1 id="hero-title" className="display text-xl text-balance text-tx sm:text-2xl">
          {COMPANY.tagline}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          <a
            href="#made"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-sm font-medium text-night transition-colors duration-150 hover:bg-white"
          >
            See how a box is made
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center rounded-full border border-paper/40 px-6 text-sm font-medium text-paper transition-colors duration-150 hover:bg-paper/10"
          >
            Talk to us
          </Link>
        </div>
      </div>

      <p aria-hidden="true" className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 text-sm text-mu motion-reduce:hidden">
        Scroll
        <ChevronDown className="size-4" />
      </p>
    </section>
  );
}
