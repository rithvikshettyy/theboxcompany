import type { ReactNode } from "react";
import { CircleCheck, Eye, Lightbulb, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

/** Red = loss or late, green = recovered or on target, amber = watch, brand = neutral finding. */
export type InsightTone = "neutral" | "loss" | "good" | "watch";

const TONES: Record<InsightTone, { icon: LucideIcon; bar: string; ink: string; label: string }> = {
  neutral: { icon: Lightbulb, bar: "border-brand", ink: "text-brand2", label: "Finding" },
  loss: { icon: TriangleAlert, bar: "border-red", ink: "text-red", label: "Loss" },
  good: { icon: CircleCheck, bar: "border-green", ink: "text-green", label: "On target" },
  watch: { icon: Eye, bar: "border-amber", ink: "text-amber", label: "Watch" },
};

const FRAME = "flex items-start gap-2 border-l-2 py-1 pl-3";

type InsightProps = {
  tone?: InsightTone;
  /** One sentence that states the finding with a number (CLAUDE.md §4 rule 8). */
  children: ReactNode;
  className?: string;
};

/** The sentence under every chart. Colour is always paired with an icon and a hidden label. */
export function Insight({ tone = "neutral", children, className }: InsightProps) {
  const { icon: Icon, bar, ink, label } = TONES[tone];
  return (
    <div className={cn(FRAME, bar, className)}>
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", ink)} />
      <p className="min-w-0 text-sm text-tx">
        <span className="sr-only">{label}: </span>
        {children}
      </p>
    </div>
  );
}

/** Same footprint as a one-line Insight, so swapping in the real one shifts nothing. */
export function InsightSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn(FRAME, "border-line2", className)}>
      <div className="flex h-5 w-full items-center gap-2">
        <Skeleton className="size-4 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}
