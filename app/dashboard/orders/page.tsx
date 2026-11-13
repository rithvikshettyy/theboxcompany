import type { Metadata } from "next";
import { OrdersView } from "@/components/ops/OrdersView";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersView />;
}
