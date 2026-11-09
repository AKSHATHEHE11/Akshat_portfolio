"use client";
import { useCallback, useRef, useState } from "react";
import { ArrowDownRight } from "lucide-react";
import { pipeline } from "@/data/think";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { Pipeline } from "./think/Pipeline";
import { PipelineStack } from "./think/PipelineStack";
import { Readout } from "./think/Readout";
import { StatusPanel } from "./think/StatusPanel";
import "./think/think.css";

const describedBy = (i: number) => `think-step-${pipeline[i].id}`;
const RAIL = "pl-[clamp(2rem,4.2vw,4.75rem)]";

/**
 * THINK — "how my brain works". Seven hardware modules on a pipe board; scrolling walks a signal
 * through them (the board holds while it does), SHIP feeds back into OBSERVE. Dark scene always.
 */
export default function ThinkTeaser() {
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const booted = useSystem((s) => s.booted); // keys the heading reveal so it re-arms after RESTART
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const current = useRef(0);

  const onActive = useCallback((i: number) => {
    if (current.current === i) return;
    current.current = i;
    setActive(i);
    setHover(null); // the signal moved: scrolling wins over a stale inspection
    play("tick");
  }, []);

  const shown = hover ?? active;
  const shared = { stages: pipeline, active, hover, reduced, onActive, onHover: setHover, describedBy };

  return (
    <section
      id="think"
      data-rail="Think"
      aria-labelledby="think-title"
      className="brain-scene relative pb-[clamp(4rem,10vh,7rem)] pt-[clamp(6rem,14vh,10rem)]"
    >
      <header className="frame grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-(--gutter)">
        <div className="relative lg:col-span-7 xl:col-span-8">
          <ArrowDownRight
            aria-hidden
            strokeWidth={2.25}
            className="absolute left-0 top-[0.4rem] size-[clamp(1.4rem,2.6vw,2.75rem)] text-signal"
          />
          <h2
            id="think-title"
            data-chaos-type
            className={cn(RAIL, "font-serif uppercase leading-[0.84] tracking-[-0.025em] text-[clamp(2.75rem,1.2rem+7.2vw,9.5rem)]")}
          >
            <Reveal key={`how-${booted}`} as="span" className="block">
              How my
            </Reveal>
            <Reveal key={`brain-${booted}`} as="span" className="block" delay={0.08}>
              <em className="pr-[0.12em] italic">Brain</em> works
            </Reveal>
          </h2>
          <div aria-hidden className={cn(RAIL, "mt-[clamp(1.25rem,3vw,2.25rem)] flex items-center")}>
            <span className="h-[3px] w-[clamp(3rem,5vw,4.5rem)] bg-signal" />
            <span className="h-px w-[clamp(4rem,7vw,6rem)] bg-fg/35" />
          </div>
        </div>
        <StatusPanel className="lg:col-span-5 lg:mt-2 xl:col-span-4" />
      </header>

      <Pipeline {...shared} chaos={chaos} className="mt-[clamp(2.5rem,6vh,4.5rem)] hidden lg:block">
        <Readout stage={pipeline[shown]} index={shown} total={pipeline.length} />
      </Pipeline>

      <div className="frame lg:hidden">
        <PipelineStack {...shared} className="mt-14" />
        <div className="mt-14">
          <Button href="/think" variant="ghost">
            Open the full brain
          </Button>
        </div>
      </div>

      <div hidden>
        {pipeline.map((p, i) => (
          <p key={p.id} id={describedBy(i)}>
            {p.line} {p.habit} Leaves behind {p.artefact}.
          </p>
        ))}
      </div>
    </section>
  );
}
