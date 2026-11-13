"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Brand";
import { cn } from "@/lib/utils";
import { DashNav, SCOPED } from "./DashNav";
import { LiveClock } from "./LiveClock";
import { ScopeTabs } from "./ScopeTabs";
import { SpeedPill } from "./SpeedPill";

/**
 * Sits on the blue sky: the name flush left (links home), the views as pills, then live speed and
 * clock. The shift and period tabs appear only on views that follow them.
 */
export function Header() {
  const scoped = SCOPED.has(usePathname());
  return (
    <header className="on-sky">
      <div className="flex min-h-20 w-full items-center gap-x-6 px-5 md:px-8 lg:px-10">
        <Link href="/" className="flex min-h-11 items-center">
          <Wordmark className="text-base whitespace-nowrap min-[380px]:text-lg md:text-xl" />
        </Link>
        <DashNav className="hidden xl:mx-auto xl:block" />
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <SpeedPill />
          <LiveClock />
        </div>
      </div>
      <div className={cn("flex flex-col gap-2 px-5 pb-3 md:px-8 lg:px-10", !scoped && "xl:hidden")}>
        <DashNav className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0 xl:hidden" />
        {scoped ? <ScopeTabs /> : <p className="text-xs text-mu xl:hidden">Stock, quality and orders as of 06:00 today.</p>}
      </div>
    </header>
  );
}
