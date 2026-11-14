import type { ReactNode } from "react";
import { AskWidget } from "@/components/dashboard/AskWidget";
import { CopilotContextSync } from "@/components/dashboard/CopilotContextSync";
import { DataFooter } from "@/components/dashboard/DataNotice";
import { Header } from "@/components/dashboard/Header";
import { PlantProvider } from "@/components/dashboard/PlantProvider";
import { ScopeProvider } from "@/components/dashboard/ScopeProvider";
import { build } from "@/lib/model";
import { DEFAULT_SCOPE } from "@/lib/scope";

/** Every dashboard view shares the header, the scope and the plant data (scope survives view changes). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ScopeProvider>
      <PlantProvider initial={build(DEFAULT_SCOPE)}>
        {/* Light, like the company site's landing. Tokens switch via [data-theme="light"]. */}
        <div data-theme="light" className="relative isolate min-h-dvh bg-bg text-tx">
          {/* Blue sky behind the header and hero; cards overlap its lower edge. */}
          <div aria-hidden="true" className="dash-sky no-print absolute inset-x-0 top-0 -z-10 h-[34rem]" />
          <a
            href="#main"
            className="sr-only rounded-chip bg-brand px-4 py-3 text-bg focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
          >
            Skip to content
          </a>
          <CopilotContextSync />
          <AskWidget />
          <Header />
          {children}
          <div className="no-print"><DataFooter /></div>
        </div>
      </PlantProvider>
    </ScopeProvider>
  );
}
