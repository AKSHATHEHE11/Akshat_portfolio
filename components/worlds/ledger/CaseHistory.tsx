"use client";
// Story as the history of one kind of file: challenge, solution, outcome written down the ruled sheet,
// each stamped as it scrolls past — declined, review, approved. Chaos: the stamps won't stay put.
import { useRef } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Project } from "@/lib/types";
import type { LedgerScene } from "./scene";
import { Stamp } from "./Stamp";

export function CaseHistory({ project }: { project: Project<LedgerScene> }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const items = [project.challenge, project.solution, project.outcome];
  const stamps = project.scene.caseHistory;

  useGSAP(
    () => {
      if (reduced) return;
      gsap.utils.toArray<HTMLElement>("[data-lg-land]", ref.current).forEach((el) =>
        gsap.fromTo(
          el,
          { autoAlpha: 0, scale: 2.5, rotate: -16 },
          {
            autoAlpha: 1,
            scale: 1,
            rotate: 0,
            duration: 0.42,
            ease: "snap",
            delay: 0.35,
            scrollTrigger: { trigger: el, start: "top 80%", once: true },
            onStart: () => play("drop"),
          },
        ),
      );
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} aria-labelledby="lg-case" className="frame relative pt-28 md:pt-40">
      <h2
        id="lg-case"
        data-chaos-type
        className="font-display text-[clamp(3rem,1rem+8vw,10rem)] font-[800] leading-[0.82] tracking-[-0.045em] [font-variation-settings:'wdth'_70]"
      >
        Case history
      </h2>
      <div aria-hidden className="lg-total mt-4" />
      <ol>
        {items.map((text, i) => {
          const s = stamps[i];
          return (
            <li
              key={s?.label ?? i}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-5 border-b border-(--lg-fg)/14 py-9 md:grid-cols-[11rem_minmax(0,1fr)_12rem] md:py-14"
            >
              <p className="font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.14em] md:pt-2">
                <span className="block text-(--lg-signal)">{s?.label}</span>
                <span className="block text-(--lg-fg)/60">{s?.when}</span>
              </p>
              <Reveal
                as="p"
                className="col-span-2 row-start-2 max-w-[34ch] text-[clamp(1.4rem,1rem+1.5vw,2.45rem)] font-[440] leading-[1.12] tracking-[-0.022em] md:col-span-1 md:col-start-2 md:row-start-1"
              >
                {text}
              </Reveal>
              {s && (
                <span
                  aria-hidden
                  className="col-start-2 row-start-1 -rotate-[8deg] justify-self-end text-[1.15rem] md:col-start-3 md:mt-1 md:text-[1.6rem]"
                  data-chaos-drift
                >
                  <span data-lg-land className="inline-block">
                    <Stamp tone={s.band} />
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
