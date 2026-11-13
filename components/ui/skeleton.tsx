import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Static placeholder block. No shimmer: loops are banned in the dashboard (CLAUDE.md §5). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("rounded-chip bg-s2", className)} {...props} />;
}
