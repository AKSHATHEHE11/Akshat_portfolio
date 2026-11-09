"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { experiments } from "@/data/experiments";
import { useReducedMotion } from "@/lib/hooks";
import { pad } from "@/lib/utils";
import { Tape } from "./lab/Tape";
import { useRise } from "./worlds/useRise";

/** LAB — the experiments drifting past on a film strip. Hover parks it, drag pulls it, click runs one. */
export default function LabStrip() {
  const head = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  useRise(head);

  return (
    <section id="lab" data-rail="Lab" className="relative overflow-clip border-t border-line pt-[clamp(5rem,11vw,9rem)] pb-[clamp(4rem,9vw,7.5rem)]">
      <div className="frame flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <h2 ref={head} data-chaos-type className="text-display-m max-sm:text-[2.65rem]">
          <span className="block overflow-clip pb-[0.06em]">
            <span data-rise className="display block">
              Experiments
            </span>
          </span>
          <span className="-mt-[0.06em] flex items-baseline gap-[0.22em] overflow-clip pr-[0.1em] pb-[0.14em]">
            <span data-rise className="serif-accent inline-block leading-[0.9]">
              running:
            </span>
            <span data-rise className="display inline-block tabular-nums">
              {pad(experiments.length)}
            </span>
            <span data-rise aria-hidden className="inline-block size-[0.15em] self-center rounded-full bg-signal text-signal animate-pulse-dot" />
          </span>
        </h2>
        <Button href="/experiments" variant="ghost">
          Open the lab
        </Button>
      </div>

      <div className="mt-[clamp(2.5rem,6vw,4.5rem)]">
        <Tape items={experiments} still={reduced} />
      </div>
    </section>
  );
}
