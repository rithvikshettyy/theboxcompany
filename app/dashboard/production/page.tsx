import type { Metadata } from "next";
import { ProductionView } from "@/components/ops/ProductionView";

export const metadata: Metadata = { title: "Production" };

export default function ProductionPage() {
  return <ProductionView />;
}
