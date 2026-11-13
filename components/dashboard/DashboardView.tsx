import { DecklePlanner } from "@/components/charts/DecklePlanner";
import { HeatmapSection } from "@/components/charts/Heatmap";
import { ParetoSection } from "@/components/charts/Pareto";
import { WaterfallSection } from "@/components/charts/Waterfall";
import { KpiTiles } from "./KpiTiles";
import { LineFlow } from "./LineFlow";
import { OrderTable } from "./OrderTable";
import { AttentionCard } from "./overview/AttentionCard";
import { FixCard } from "./overview/FixCard";
import { FocusCards } from "./overview/FocusCards";
import { OverviewHero } from "./overview/OverviewHero";
import { ProductionCard } from "./overview/ProductionCard";
import { Simulator } from "./Simulator";
import { SimulatorProvider } from "./SimulatorProvider";

/**
 * Dashboard overview, in the sky-and-cards layout: the ₹ leak and production plan on the sky,
 * four focus cards and the production chart overlapping it, then fixes and what needs attention,
 * then the detail. The layout supplies the header, scope and plant data.
 */
export function DashboardView() {
  return (
    <SimulatorProvider>
      <main id="main" className="w-full px-5 pt-6 pb-24 md:px-8 lg:px-10">
        <OverviewHero className="on-sky pb-10" />
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          <FocusCards className="col-span-12 xl:col-span-5" />
          <ProductionCard className="col-span-12 xl:col-span-7" />

          <FixCard className="col-span-12 xl:col-span-5" />
          <AttentionCard className="col-span-12 xl:col-span-7" />

          <WaterfallSection className="col-span-12 xl:col-span-7" />
          <ParetoSection className="col-span-12 xl:col-span-5" />

          <LineFlow className="col-span-12" />
          <KpiTiles className="col-span-12" />

          <HeatmapSection className="col-span-12 xl:col-span-6" />
          <OrderTable className="col-span-12 xl:col-span-6" />
          <DecklePlanner className="col-span-12" />
          <Simulator className="col-span-12" />
        </div>
      </main>
    </SimulatorProvider>
  );
}
