"use client";
// Decisions as an override bank: one hardware strip, one switch per call I made. Flip a switch to read
// that option's consequence; land on the shipped one to get the ruling. In chaos, the board overrules
// your override a beat later.
import { useEffect, useState, type CSSProperties } from "react";
import { Led } from "@/components/ui/marks";
import { useChaos } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Decision } from "@/lib/types";
import { cn, pad } from "@/lib/utils";

export function Overrides({ decisions }: { decisions: Decision[] }) {
  return (
    <section aria-labelledby="cc-overrides" className="frame relative py-24 md:py-32">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <h2
          id="cc-overrides"
          data-chaos-type
          className="font-display text-[clamp(3rem,1rem+8.5vw,10.5rem)] font-[860] uppercase leading-[0.8] tracking-[-0.045em] [font-variation-settings:'wdth'_62]"
        >
          Overrides
        </h2>
        <p className="max-w-[34ch] text-[1.0625rem] leading-snug text-(--cc-fg)/70">
          Each switch is a call I made. Flip it the other way and see what I’d have shipped instead.
        </p>
      </div>
      <div
        className="mt-12 grid overflow-hidden rounded-[12px] border border-(--cc-fg)/14 bg-[#0b0f10] shadow-[inset_0_1px_0_rgb(233_240_234/0.06)] md:grid-cols-[repeat(var(--n),minmax(0,1fr))] md:mt-16"
        style={{ "--n": decisions.length } as CSSProperties}
      >
        {decisions.map((d, i) => (
          <Override key={d.question} d={d} index={i} />
        ))}
      </div>
    </section>
  );
}

function Override({ d, index }: { d: Decision; index: number }) {
  const chaos = useChaos();
  const [pick, setPick] = useState<number | null>(null);
  const [overruled, setOverruled] = useState(false);
  const n = d.options.length;
  const shipped = pick === d.chosen;

  const choose = (i: number) => {
    setPick(i);
    setOverruled(false);
    play(i === d.chosen ? "toggle-on" : "toggle-off");
  };

  useEffect(() => {
    if (!chaos || pick === null || pick === d.chosen) return;
    const id = window.setTimeout(() => {
      setPick(d.chosen);
      setOverruled(true);
      play("glitch");
    }, 1400);
    return () => window.clearTimeout(id);
  }, [chaos, pick, d.chosen]);

  return (
    <fieldset className="relative flex min-w-0 flex-col border-(--cc-fg)/10 p-5 not-first:border-t md:p-7 md:not-first:border-t-0 md:not-first:border-l">
      <legend className="sr-only">{d.question}</legend>
      <div aria-hidden className="flex items-start justify-between gap-4">
        <p className="text-[1.45rem] font-[700] leading-[1.05] tracking-[-0.02em] [font-variation-settings:'wdth'_86]">{d.question}</p>
        <span className="mt-1 font-mono text-[0.6875rem] tracking-[0.14em] text-(--cc-fg)/55">OVR {pad(index + 1)}</span>
      </div>

      <div className="relative mt-6 grid h-14 rounded-full border border-(--cc-fg)/18 bg-black/45 p-1 shadow-[inset_0_2px_6px_rgb(0_0_0/0.6)]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 rounded-full transition-[translate,opacity,background-color,box-shadow] duration-500 ease-snap",
            pick === null ? "opacity-0" : "opacity-100",
            shipped ? "bg-(--cc-accent) shadow-[0_0_26px_-4px_rgb(216_255_0/0.75)]" : "bg-[#ff5a1f]",
          )}
          style={{ width: `calc((100% - 0.5rem) / ${n})`, translate: `${(pick ?? 0) * 100}% 0` }}
        />
        {d.options.map((o, i) => (
          <label
            key={o.label}
            data-cursor="hover"
            onPointerEnter={() => play("tick")}
            className={cn(
              "relative z-[1] flex cursor-pointer items-center justify-center rounded-full px-2 text-center text-[0.8125rem] font-[620] leading-tight transition-colors duration-300",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#ff5a1f]",
              pick === i ? "text-[#07090a]" : "text-(--cc-fg)/75 hover:text-(--cc-fg)",
            )}
          >
            <input type="radio" name={`cc-override-${index}`} value={i} checked={pick === i} onChange={() => choose(i)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>

      <div role="status" className="mt-5 min-h-[10.5rem] rounded-[8px] border border-(--cc-fg)/10 bg-black/35 p-4">
        {pick === null ? (
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-(--cc-fg)/60">
            Awaiting override<span className="animate-blink">_</span>
          </p>
        ) : (
          <>
            <p className={cn("flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em]", shipped ? "text-(--cc-accent)" : "text-[#ff8a5c]")}>
              <Led tone={shipped ? "accent" : "signal"} pulse={false} />
              {overruled ? "Overruled by the board" : shipped ? "Shipped" : "Not shipped"}
            </p>
            <p className="mt-2 text-[0.9375rem] leading-snug text-(--cc-fg)/85">{d.options[pick].note}</p>
            {shipped ? (
              <p className="mt-3 font-serif text-[1.3rem] italic leading-[1.12]">“{d.why}”</p>
            ) : (
              <p className="mt-3 text-[0.875rem] text-(--cc-fg)/55">
                Shipped instead: “{d.options[d.chosen].label}”. Flip it to read why.
              </p>
            )}
          </>
        )}
      </div>
    </fieldset>
  );
}
