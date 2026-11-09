"use client";
// Story, in the room's own format: the minutes of the meeting. Challenge → motion → resolution.
import { Reveal } from "@/components/ui/Reveal";
import type { Project } from "@/lib/types";
import type { CommandCenterScene } from "./scene";

export function Minutes({ project }: { project: Project<CommandCenterScene> }) {
  const items = [project.challenge, project.solution, project.outcome];
  const stamps = project.scene.minutes;
  return (
    <section aria-labelledby="cc-minutes" className="frame relative py-24 md:py-36">
      <div className="grid gap-y-10 xl:grid-cols-12 xl:gap-x-(--gutter)">
        <div className="xl:col-span-3">
          <h2
            id="cc-minutes"
            data-chaos-type
            className="font-serif text-[clamp(3rem,2rem+3.4vw,5.5rem)] italic leading-[0.86] tracking-[-0.02em] xl:sticky xl:top-28"
          >
            Minutes
          </h2>
        </div>
        <ol className="xl:col-span-9">
          {items.map((text, i) => (
            <li
              key={stamps[i]?.label ?? i}
              className="grid grid-cols-[4.25rem_1fr] gap-x-4 border-t border-(--cc-fg)/14 py-8 last:border-b md:grid-cols-[5.5rem_11rem_1fr] md:py-11"
            >
              <span className="font-mono text-[0.75rem] tabular-nums text-(--cc-accent)" data-chaos-drift>
                {stamps[i]?.stamp}
              </span>
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/55 md:pt-px">{stamps[i]?.label}</span>
              <Reveal
                as="p"
                className="col-span-2 mt-4 text-[clamp(1.4rem,1rem+1.5vw,2.45rem)] font-[440] leading-[1.12] tracking-[-0.022em] md:col-span-1 md:mt-0"
              >
                {text}
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
