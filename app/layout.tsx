import type { Metadata, Viewport } from "next";
import { Archivo, Poppins } from "next/font/google";
import { BRAND } from "@/lib/assumptions";
import "./globals.css";

// Body and UI. Poppins (Indian Type Foundry) carries the ₹ glyph in its latin-ext subset.
const sans = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

// Display headings: Archivo at its widest, a free stand-in for an expanded face like Akira.
const display = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${BRAND.name} · Where the plant leaks money`, template: `%s · ${BRAND.name}` },
  description:
    "Turns corrugator and converting losses into ₹, finds the constraint and ranks fixes by ₹ recovered per month.",
};

export const viewport: Viewport = {
  // Mirrors --bg in globals.css. Metadata cannot read CSS variables.
  themeColor: "#0c1d45",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`dark ${sans.variable} ${display.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
