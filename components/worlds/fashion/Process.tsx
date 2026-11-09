"use client";
// Process as fitting-room notes: paper slips pinned along a tailor's tape, in the order they happened.
// The tape unrolls on arrival and the notes get pinned one by one. Chaos: they hang badly.
import { useRef, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import type { ProcessStep } from "@/lib/types";
import { cn, pad } from "@/lib/utils";

const TILT = [-2.4, 1.7, -1.1, 2.5, -1.8, 1.2];

export function Process({ steps }: { steps: ProcessStep[] }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 1024px)", narrow: "(max-width: 1023px)" }, (ctx) => {
        const wide = ctx.conditions?.wide;
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top 72%", once: true } })
          .from(q(wide ? "[data-tape='h']" : "[data-tape='v']"), wide ? { clipPath: "inset(0% 100% 0% 0%)", duration: 1.4, ease: "power3.inOut" } : { scaleY: 0, transformOrigin: "50% 0%", duration: 1.2, ease: "power3.inOut" })
          .from(q("[data-note]"), { y: -46, rotation: (i: number) => (i % 2 ? 16 : -16), opacity: 0, duration: 1.1, ease: "back.out(1.5)", stagger: 0.14 }, 0.45)
          .from(q("[data-pin]"), { y: -30, opacity: 0, duration: 0.45, ease: "power2.in", stagger: 0.14 }, 0.75);
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} id="process" aria-labelledby="fy-process" className="relative overflow-hidden py-24 lg:py-36">
      <div className="mx-auto flex max-w-(--frame-max) flex-wrap items-end justify-between gap-x-10 gap-y-4 px-(--margin)">
        <h2 id="fy-process" data-chaos-type className="font-serif text-[clamp(3rem,1.6rem+5vw,7.5rem)] italic leading-[0.82] tracking-[-0.025em]">
          Fitting-room notes
        </h2>
        <p className="max-w-[30ch] pb-2 font-serif text-[1.35rem] italic leading-tight">Pinned to the tape in the order they happened.</p>
      </div>

      <div className="relative mt-14 lg:mt-20">
        <div
          data-tape="h"
          aria-hidden
          className={cn("fy-tape", "relative hidden h-14 w-full shadow-[0_8px_16px_-10px_rgb(0_0_0/0.55)] lg:block")}
          style={{ clipPath: "inset(0% 0% 0% 0%)" }}
        >
          <div className="absolute inset-x-0 top-[52%] flex">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} className="shrink-0 pl-1 font-mono text-[0.625rem] font-semibold leading-none text-(--fy-fg)" style={{ width: "var(--inch)" }}>
                {i || ""}
              </span>
            ))}
          </div>
        </div>

        <ol className="relative mx-auto grid max-w-(--frame-max) gap-12 px-(--margin) lg:-mt-4 lg:grid-cols-4 lg:gap-(--gutter)">
          <span data-tape="v" aria-hidden className={cn("fy-tape-v", "absolute -top-6 bottom-0 left-(--margin) w-9 shadow-[6px_0_14px_-10px_rgb(0_0_0/0.55)] lg:hidden")} />
          {steps.map((s, i) => (
            <li key={s.title} className="relative pl-14 lg:pl-0">
              <svg data-pin viewBox="0 0 16 60" aria-hidden className="absolute left-[3.6rem] top-1 z-[2] h-14 w-4 -translate-y-3 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-8">
                <path d="M8 13v44" stroke="#8d9096" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="8" cy="8" r="6.5" fill="#ff5a1f" />
                <circle cx="6" cy="6" r="2" fill="#fff" opacity=".55" />
              </svg>
              <article
                data-note
                data-chaos-drift
                className={cn(
                  "fy-note",
                  "relative rotate-(--tilt) px-5 pb-6 pt-8 text-(--fy-fg) shadow-[0_18px_30px_-18px_rgb(0_0_0/0.45)] transition-[rotate,translate] duration-500 ease-out-expo hover:-translate-y-1.5 hover:rotate-0 chaos:rotate-[calc(var(--tilt)*5)]",
                )}
                style={{ "--tilt": `${TILT[i % TILT.length]}deg` } as CSSProperties}
              >
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fy-muted)">No. {pad(i + 1)}</span>
                <h3 className="mt-2 font-serif text-[clamp(1.7rem,1.3rem+0.9vw,2.2rem)] italic leading-[0.95]">{s.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed">{s.body}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
