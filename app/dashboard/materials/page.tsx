import type { Metadata } from "next";
import { MaterialsView } from "@/components/ops/MaterialsView";

export const metadata: Metadata = { title: "Materials" };

export default function Page() {
  return <MaterialsView />;
}
