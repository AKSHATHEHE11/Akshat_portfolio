"use client";
// The counterfactual simulator: four faders over the levers the model weighs most. Each shows where
// the statement put it; the line underneath says what would flip the decision, with a key that
// applies it (or, for an approved file, what would break it).
import type { CSSProperties } from "react";
import { RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { LEVERS, apply, describeFlip, rupees, type Change, type Flips, type Lever } from "./engine";
import type { Profile } from "./scene";
import { BAND_WORD } from "./Stamp";

const LABEL: Record<Lever, (p: Profile) => string> = {
  emi: () => "EMIs a month",
  incomeMonths: () => "Months of income",
  utilisation: (p) => (p.line === "card" ? "Card used" : "Overdraft used"),
  bounces: () => "Bounced payments",
};
const VALUE: Record<Lever, (v: number) => string> = {
  emi: (v) => rupees(v),
  incomeMonths: (v) => `${v} mo`,
  utilisation: (v) => `${v}%`,
  bounces: (v) => String(v),
};
const SPOKEN: Record<Lever, (v: number) => string> = {
  emi: (v) => `${rupees(v)} a month`,
  incomeMonths: (v) => `${v} months`,
  utilisation: (v) => `${v} percent`,
  bounces: (v) => `${v} bounced payments`,
};

interface Props {
  profile: Profile | null;
  /** the statement's own values */
  base: Profile | null;
  flips: Flips | null;
  onChange: (p: Profile) => void;
  onApply: (changes: Change[]) => void;
}

export function WhatIf({ profile, base, flips, onChange, onApply }: Props) {
  const p = profile ?? base;
  const moved = !!profile && !!base && LEVERS.some((l) => profile[l.key] !== base[l.key]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/60">What would change it</p>
        <Button
          variant="ghost"
          size="sm"
          magnetic={false}
          disabled={!moved}
          onClick={() => base && onChange(base)}
          icon={<RotateCcw size={13} strokeWidth={2} />}
          className="shrink-0 disabled:pointer-events-none disabled:opacity-35"
        >
          Statement
        </Button>
      </div>
      <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {LEVERS.map((l) => {
          const id = `lg-lever-${l.key}`;
          const v = p ? p[l.key] : l.min;
          const max = p ? l.max(p) : 1;
          const pct = (x: number) => `${(((x - l.min) / (max - l.min)) * 100).toFixed(2)}%`;
          const delta = profile && base ? profile[l.key] - base[l.key] : 0;
          return (
            <div key={l.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="truncate text-[0.875rem] text-(--lg-fg)/80">
                  {p ? LABEL[l.key](p) : "—"}
                </label>
                <output htmlFor={id} className="shrink-0 font-mono text-[0.875rem] tabular-nums">
                  {VALUE[l.key](v)}
                  {delta !== 0 && (
                    <span className="ml-1.5 text-[0.75rem] text-(--lg-signal)">
                      {delta > 0 ? "+" : "−"}
                      {l.key === "emi" ? rupees(Math.abs(delta)).slice(1) : Math.abs(delta)}
                    </span>
                  )}
                </output>
              </div>
              <div className="lg-fader relative">
                <input
                  id={id}
                  type="range"
                  className="lg-range"
                  min={l.min}
                  max={max}
                  step={l.step}
                  value={v}
                  disabled={!profile}
                  aria-valuetext={SPOKEN[l.key](v)}
                  style={{ "--p": pct(v) } as CSSProperties}
                  onChange={(e) => {
                    if (!profile) return;
                    play("tick");
                    onChange(apply(profile, [{ key: l.key, from: profile[l.key], to: Number(e.target.value) }]));
                  }}
                />
                {/* where the statement put it */}
                {base && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 h-1.5 w-px -translate-x-1/2 bg-(--lg-fg)/70"
                    style={{ left: `calc(var(--lg-thumb) / 2 + (100% - var(--lg-thumb)) * ${((base[l.key] - l.min) / (max - l.min)).toFixed(4)})` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 min-h-[5.5rem] border-t border-(--lg-fg)/12 pt-3">
        {flips && profile ? (
          <>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--lg-fg)/60">
              {flips.worse ? `Breaks to ${BAND_WORD[flips.goal]} if` : `Reaches ${BAND_WORD[flips.goal]} with`}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {flips.options.map((o, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className={cn("text-[0.9375rem] leading-snug", i > 0 && "text-(--lg-fg)/70")}>
                    {i > 0 && <span className="text-(--lg-fg)/50">or </span>}
                    {describeFlip(o, profile)} <span className="font-mono text-[0.75rem] text-(--lg-fg)/55">→ {o.score}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      play("press");
                      onApply(o.changes);
                    }}
                    onPointerEnter={() => play("tick")}
                    data-cursor="hover"
                    className="hit inline-flex h-7 items-center gap-1.5 rounded-full border border-(--lg-signal)/60 px-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-(--lg-signal) transition-colors hover:bg-(--lg-signal) hover:text-[#111] coarse:h-9"
                  >
                    <Wand2 size={12} strokeWidth={2} aria-hidden />
                    {flips.worse ? "Stress it" : "Try it"}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-(--lg-fg)/35">The faders unlock once a statement is read</p>
        )}
      </div>
    </div>
  );
}
