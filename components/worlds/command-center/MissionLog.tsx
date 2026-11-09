"use client";
// Process as a mission log: a lime track draws down the log as you scroll, and each entry's node
// lights when the track reaches it. Reduced motion: everything is already logged.
import { useRef } from "react";
import { Led } from "@/components/ui/marks";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import type { Project } from "@/lib/types";
import type { CommandCenterScene } from "./scene";

export function MissionLog({ project }: { project: Project<CommandCenterScene> }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { process, scene } = project;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      if (reduced) {
        q("li").forEach((li) => li.setAttribute("data-logged", ""));
        return;
      }
      const list = q("ol")[0];
      gsap.fromTo(q("[data-track]"), { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 72%", end: "bottom 72%", scrub: 0.5 } });
      q("li").forEach((li) => {
        li.removeAttribute("data-logged");
        ScrollTrigger.create({
          trigger: li,
          start: "top 72%",
          onEnter: () => li.setAttribute("data-logged", ""),
          onLeaveBack: () => li.removeAttribute("data-logged"),
        });
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section id="process" ref={ref} aria-labelledby="cc-log" className="frame relative scroll-mt-24 py-24 md:py-32">
      <h2
        id="cc-log"
        data-chaos-type
        className="font-display text-[clamp(3rem,1rem+8.5vw,10.5rem)] font-[860] uppercase leading-[0.8] tracking-[-0.045em] [font-variation-settings:'wdth'_62]"
      >
        Mission log
      </h2>
      <div className="relative mt-12 md:mt-20">
        <span aria-hidden className="absolute bottom-0 left-[0.3rem] top-0 w-px bg-(--cc-fg)/12" />
        <span aria-hidden data-track className="absolute bottom-0 left-[0.3rem] top-0 w-px origin-top bg-(--cc-accent) shadow-[0_0_10px_rgb(216_255_0/0.8)]" />
        <ol>
          {process.map((step, i) => {
            const log = scene.missionLog[i];
            return (
              <li
                key={step.title}
                data-logged=""
                className="group relative grid gap-x-8 gap-y-3 pb-14 pl-9 md:grid-cols-[9rem_minmax(0,1fr)] md:pb-20 xl:grid-cols-[10rem_minmax(0,1fr)_19rem]"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-1 size-[0.65rem] rounded-full border border-(--cc-fg)/40 bg-(--cc-bg) transition-[background-color,border-color,box-shadow] duration-500 group-data-logged:border-(--cc-accent) group-data-logged:bg-(--cc-accent) group-data-logged:shadow-[0_0_14px_rgb(216_255_0/0.75)]"
                />
                <p className="font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.14em]">
                  <span className="block text-(--cc-accent)">{log?.stamp}</span>
                  <span className="block text-(--cc-fg)/60">{log?.code}</span>
                </p>
                <div>
                  <h3 className="font-display text-[clamp(1.7rem,1.1rem+1.9vw,3rem)] font-[760] leading-[0.95] tracking-[-0.03em] [font-variation-settings:'wdth'_78]">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-relaxed text-(--cc-fg)/72">{step.body}</p>
                </div>
                {log?.artefact && (
                  <p className="font-mono text-[0.75rem] leading-relaxed text-(--cc-fg)/60 md:col-start-2 xl:col-start-3 xl:pt-2">
                    <span className="text-(--cc-accent)">↳ </span>
                    {log.artefact}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 font-mono text-[0.75rem] uppercase tracking-[0.12em]">
        <Led tone="go" />
        Status
        <span className="normal-case tracking-normal text-(--cc-fg)/80">{scene.missionStatus}</span>
      </p>
    </section>
  );
}
