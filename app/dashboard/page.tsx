import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

/** Overview: where the money leaks, why, and what to fix first. */
export default function DashboardPage() {
  return <DashboardView />;
}
