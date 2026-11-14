import type { Metadata } from "next";
import { PlannerView } from "@/components/planner/PlannerView";

export const metadata: Metadata = { title: "Planner" };

export default function Page() {
  return <PlannerView />;
}
