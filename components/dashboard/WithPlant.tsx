"use client";

import type { ReactNode } from "react";
import { ErrorState } from "@/components/ui/error-state";
import type { PlantData } from "@/lib/types";
import type { PlantEntry } from "./PlantProvider";

/** Renders the section with data, its skeleton while loading, or the error with a retry. */
export function WithPlant({
  plant,
  fallback,
  children,
}: {
  plant: PlantEntry & { retry: () => void };
  fallback: ReactNode;
  children: (data: PlantData) => ReactNode;
}) {
  if (plant.status === "ready") return children(plant.data);
  if (plant.status === "error") return <ErrorState message={plant.message} onRetry={plant.retry} />;
  return fallback;
}
