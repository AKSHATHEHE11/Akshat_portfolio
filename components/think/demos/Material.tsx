"use client";
import { useId, useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { micro, useThrownOn, type DemoProps } from "./shared";

const TICKS = [0, 20, 40, 60, 80, 100];

/**
 * PROTOTYPE IN THE REAL MATERIAL — the same tip slider as a signed-off frame (rule off: a picture
 * with redlines; poke it and nothing moves) and as a live control in the browser (rule on: drag it,
 * arrow-key it, and see what testing on a phone changed).
 */
export function MaterialDemo({ on }: DemoProps) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState(20);
  const [poked, setPoked] = useState(0);
  const reduced = useReducedMotion();
  const id = useId();
  const { contextSafe } = useGSAP({ scope: root });

  const set = (v: number) => {
    if (v === tip) return;
    play("tick");
    setTip(v);
  };

  // just thrown on: the slider drags itself so you see it is real
  useThrownOn(on, contextSafe(() => {
    if (reduced) return setTip(60);
    const o = { v: tip };
    let last = tip;
    gsap.to(o, {
      v: 60,
      duration: 1.1,
      ease: "power2.inOut",
      onUpdate: () => {
        const v = Math.round(o.v / 10) * 10;
        if (v === last) return;
        last = v;
        play("tick");
        setTip(v);
      },
    });
  }));

  const poke = contextSafe(() => {
    play("error");
    setPoked((n) => n + 1);
    if (!reduced) gsap.fromTo(frame.current, { x: -6 }, { x: 0, duration: 0.45, ease: "elastic.out(1, 0.3)" });
  });

  return (
    <div ref={root} role="group" aria-label="Demo: a tip slider, as a frame and as a prototype" className="relative h-full">
      {on ? (
        <div key="live" className="tk-rise flex h-full flex-col justify-center gap-1 px-[clamp(1rem,7cqw,2.5rem)]">
          <label htmlFor={id} className="flex items-baseline justify-between gap-4">
            <span className="text-[0.95rem]">Tip your rider</span>
            <span className="font-display text-[2.1rem] font-[800] tabular-nums leading-none tracking-[-0.03em]">₹{tip}</span>
          </label>
          <input
            id={id}
            type="range"
            min={0}
            max={100}
            step={10}
            value={tip}
            onChange={(e) => set(Number(e.target.value))}
            data-cursor="drag"
            className="tk-range"
            style={{ "--fill": `calc(1.375rem + (100% - 2.75rem) * ${tip / 100})` } as CSSProperties}
          />
          <div aria-hidden className="flex justify-between px-[1.1rem]">
            {TICKS.map((t) => (
              <span key={t} className={cn("font-mono text-[0.6875rem] tabular-nums", t <= tip ? "text-ink" : "text-smoke")}>
                {t}
              </span>
            ))}
          </div>
          <p className="mt-3 border-l-2 border-signal pl-2.5 text-[0.75rem] leading-snug text-smoke">
            Found in the browser, not the frame: an 18px thumb misses on a phone. It is 44 now.
          </p>
        </div>
      ) : (
        <div key="frame" className="tk-canvas absolute inset-0 overflow-hidden px-[clamp(0.9rem,5cqw,1.75rem)] py-3">
          <p className={cn(micro, "text-smoke")}>Tip slider — frame 12 of 14</p>
          <div ref={frame} className="relative mx-auto mt-4 w-[min(100%,24rem)] rounded-[4px] bg-paper px-4 pb-6 pt-4 outline outline-1 outline-[#ff5a1f]">
            <span aria-hidden className="absolute -top-[5px] -left-[5px] size-2 border border-[#ff5a1f] bg-paper" />
            <span aria-hidden className="absolute -right-[5px] -bottom-[5px] size-2 border border-[#ff5a1f] bg-paper" />
            <p className="flex items-baseline justify-between text-[0.95rem]">
              Tip your rider <b className="font-display text-[1.6rem] font-[800] tracking-[-0.03em]">₹20</b>
            </p>
            <div aria-hidden className="relative mt-4 h-[18px]">
              <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink/15" />
              <span className="absolute left-0 top-1/2 h-1 w-1/5 -translate-y-1/2 rounded-full bg-signal" />
              <span className="absolute left-1/5 top-0 size-[18px] -translate-x-1/2 rounded-full bg-paper shadow-[0_0_0_1px_rgb(17_17_17/0.35)]" />
              {/* redlines */}
              <span className="absolute left-1/5 top-[24px] h-px w-[18px] -translate-x-1/2 bg-[#ff5a1f]" />
              <span className="absolute left-1/5 top-[28px] -translate-x-1/2 font-mono text-[0.625rem] text-[#d2400d]">18</span>
              <span className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full pl-1 font-mono text-[0.625rem] text-[#d2400d]">h 4</span>
            </div>
          </div>
          <span aria-hidden className="absolute bottom-4 right-4 rotate-[4deg] bg-lime px-2.5 py-2 font-mono text-[0.6875rem] leading-tight shadow-[0_6px_14px_-6px_rgb(0_0_0/0.4)]">
            Approved.
            <br />
            Looks great.
          </span>
          <button
            type="button"
            onClick={poke}
            aria-label="Try to drag the slider in the frame"
            data-cursor="hover"
            data-cursor-label="DRAG?"
            className="absolute inset-0 cursor-not-allowed focus-visible:outline-offset-[-6px]"
          />
          <p aria-live="polite" className={cn(micro, "pointer-events-none absolute bottom-4 left-4 max-w-[60%] normal-case tracking-[0.04em]")}>
            {poked > 0 && (
              <span key={poked} className="tk-pop block">
                It is a picture of a slider. Nothing moves.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
