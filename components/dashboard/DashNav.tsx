"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const VIEWS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/production", label: "Production" },
  { href: "/dashboard/materials", label: "Materials" },
  { href: "/dashboard/quality", label: "Quality" },
  { href: "/dashboard/orders", label: "Orders" },
] as const;

/** Views that follow the shift and period tabs; the rest are "as of this morning". */
export const SCOPED = new Set<string>(["/dashboard", "/dashboard/production"]);

/** The dashboard's views. The current one is marked for screen readers and drawn as a navy pill. */
export function DashNav({ className }: { className?: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard views" className={className}>
      <ul className="flex gap-1">
        {VIEWS.map((v) => {
          const current = path === v.href;
          return (
            <li key={v.href}>
              <Link
                href={v.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-full px-5 text-sm whitespace-nowrap transition-colors duration-150",
                  current ? "bg-s2 font-medium text-tx" : "text-mu hover:text-tx",
                )}
              >
                {v.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
