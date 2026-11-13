import Link from "next/link";
import { Wordmark } from "@/components/brand/Brand";
import { MobileMenu } from "./MobileMenu";

export const SITE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/products", label: "Products" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
] as const;

/** Top bar on every site page, with no background: it sits over the hero and scrolls away with the page. Name left, page links (menu on phones) and the dashboard right. */
export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="flex h-18 w-full items-center justify-between gap-4 px-5 md:px-8 lg:px-10">
        <Link href="/" className="flex min-h-11 items-center">
          <Wordmark className="text-base whitespace-nowrap min-[380px]:text-lg md:text-xl" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-2 md:gap-6">
          <ul className="hidden items-center gap-6 md:flex">
            {SITE_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center text-sm text-mu transition-colors duration-150 hover:text-tx"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard"
            className="inline-flex h-11 shrink-0 items-center rounded-chip bg-brand px-4 text-sm font-medium text-bg transition-colors duration-150 hover:bg-tx md:px-5"
          >
            Dashboard
          </Link>
          <MobileMenu links={SITE_LINKS} />
        </nav>
      </div>
    </header>
  );
}
