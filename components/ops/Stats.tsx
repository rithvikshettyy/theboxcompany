import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Eye, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "good" | "watch" | "loss" | "neutral";

const TONE: Record<Tone, { ink: string; bar: string; icon: LucideIcon | null; label: string }> = {
  good: { ink: "text-green", bar: "bg-green", icon: CircleCheck, label: "On target" },
  watch: { ink: "text-amber", bar: "bg-amber", icon: Eye, label: "Watch" },
  loss: { ink: "text-red", bar: "bg-red", icon: CircleAlert, label: "Off target" },
  neutral: { ink: "text-tx", bar: "bg-brand", icon: null, label: "" },
};

/** On the blue sky: one line on what this view answers, then the title. The only h1 on the page. */
export function PageIntro({ title, lede }: { title: string; lede: string }) {
  return (
    <div className="on-sky col-span-12 flex flex-col gap-3 pt-4 pb-6">
      <p className="text-sm text-mu">{lede}</p>
      <h1 className="text-2xl font-medium tracking-tight text-tx">{title}</h1>
    </div>
  );
}

export type Stat = {
  label: string;
  value: ReactNode;
  unit?: string;
  /** The comparison: target, previous period or baseline (CLAUDE.md §4 rule 5). */
  note: ReactNode;
  tone?: Tone;
  /** 0..1+ against target, drawn as a bar with the target at 100%. */
  progress?: number;
};

/** Four headline numbers, each with a unit, a comparison and its status. */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <ul className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const tone = TONE[s.tone ?? "neutral"];
        const Icon = tone.icon;
        return (
          <li key={s.label} className="flex flex-col gap-2 rounded-3xl bg-s1 p-5 shadow-card">
            <p className="flex items-center justify-between gap-2 text-sm text-mu">
              {s.label}
              {Icon ? (
                <span className={cn("flex items-center gap-1 text-xs", tone.ink)}>
                  <Icon aria-hidden="true" className="size-3.5" />
                  {tone.label}
                </span>
              ) : null}
            </p>
            <p className="text-xl text-tx tabular-nums md:text-2xl">
              {s.value}
              {s.unit ? <span className="text-base text-mu"> {s.unit}</span> : null}
            </p>
            {s.progress !== undefined ? <Progress value={s.progress} tone={s.tone ?? "neutral"} /> : null}
            <p className="text-xs text-mu tabular-nums">{s.note}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Bar against a target at the right end; overshoot is capped and marked. */
export function Progress({ value, tone }: { value: number; tone: Tone }) {
  return (
    <span aria-hidden="true" className="relative block h-1.5 rounded-full bg-s2">
      <span className={cn("block h-full rounded-full", TONE[tone].bar)} style={{ width: `${Math.min(1, value) * 100}%` }} />
    </span>
  );
}

/** A status word with its colour and icon, never colour alone. */
export function Tag({ tone, children }: { tone: Exclude<Tone, "neutral">; children: ReactNode }) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm whitespace-nowrap", t.ink)}>
      {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {children}
    </span>
  );
}

/** Tone for a value against a target, with a watch band. */
export function toneFor(value: number, target: number, better: "higher" | "lower", band: number): Exclude<Tone, "neutral"> {
  const gap = better === "higher" ? target - value : value - target;
  return gap <= 0 ? "good" : gap <= band ? "watch" : "loss";
}

export const th = "pb-2 text-left text-xs font-normal text-mu";
export const td = "border-t border-line py-3 pr-4 align-top";
