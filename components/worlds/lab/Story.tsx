"use client";
// Challenge / solution / outcome as three beats over the live field. While a beat holds the middle of
// the screen it leans on the instrument (its tweak is added on top of your patch): noise gets crushed
// and grainy, the signal comes clean, the field opens up. Leave the beats and the field lets go.
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFieldHost } from "./FieldHost";
import { spec } from "./patch";
import type { LabScene, ParamKey } from "./scene";

const line = (tweak: Partial<Record<ParamKey, number>>) =>
  (Object.entries(tweak) as [ParamKey, number][])
    .map(([k, v]) => `${spec[k].label} ${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(2)}`)
    .join(" · ");

export function Story({ project }: { project: Project<LabScene> }) {
  const { field, scrim } = useFieldHost();
  const beats = [project.challenge, project.solution, project.outcome].map((text, i) => ({
    text,
    lead: project.scene.story[i]?.lead ?? "",
    tweak: project.scene.story[i]?.tweak ?? {},
  }));
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [on, setOn] = useState(-1);

  // the beat crossing the middle band of the viewport is the one playing
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = refs.current.indexOf(e.target as HTMLElement);
          if (e.isIntersecting) setOn(i);
          else setOn((c) => (c === i ? -1 : c));
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const tweak = on >= 0 ? beats[on].tweak : null;
  useEffect(() => {
    field.story(tweak);
    scrim(tweak ? "story" : "none");
  }, [field, scrim, tweak]);
  useEffect(() => () => field.story(null), [field]);

  return (
    <section aria-labelledby="nf-story" className="relative">
      <h2 id="nf-story" className="sr-only">
        Challenge, solution, outcome
      </h2>
      {beats.map((b, i) => (
        <article
          key={b.lead || i}
          ref={(el) => void (refs.current[i] = el)}
          data-on={on === i || undefined}
          className={cn("nf-beat frame", i === 1 && "md:justify-end")}
        >
          <div className="max-w-[46rem]">
            <h3 data-chaos-type className={cn("nf-lead", `nf-lead-${i}`)}>
              {b.lead}
            </h3>
            <p className="nf-shade mt-6 max-w-[32ch] text-lede md:mt-8 md:text-[1.6rem] md:leading-[1.3]">{b.text}</p>
            {Object.keys(b.tweak).length > 0 && (
              <p className="mt-6 flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fg)/70">
                <span aria-hidden className="nf-led" data-on={on === i || undefined} />
                <span className="sr-only">While this is on screen the field changes: </span>
                {line(b.tweak)}
              </p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
