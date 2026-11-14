import { BRAND } from "@/lib/assumptions";
import { cn } from "@/lib/utils";

/** The logo: the name alone, in Helvetica. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-logo text-base font-medium tracking-[-0.005em] text-tx", className)}>
      {BRAND.name}
    </span>
  );
}
