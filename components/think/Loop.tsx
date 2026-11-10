"use client";
import { useCallback, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { pipeline, type PipelineStage } from "@/data/think";
import { Pipeline } from "@/components/home/think/Pipeline";
import { PipelineStack } from "@/components/home/think/PipelineStack";
import { StatusPanel } from "@/components/home/think/StatusPanel";
import { Scramble } from "@/components/ui/Scramble";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";

const describedBy = (i: number) => `tk-step-${pipeline[i].id}`;

/** The full readout under the board: what the stage does, the habit behind it, the file it leaves. */
function StageReadout({ stage, index, total }: { stage: PipelineStage; index: number; total: number }) {
  return (
    <div aria-hidden className="mt-[clamp(1.25rem,3svh,2.25rem)] grid grid-cols-12 items-start gap-x-(--gutter) border-t border-line pt-6">
      <div className="col-span-3">
        <p className="font-mono text-label tabular-nums tracking-[0.08em] text-fg-muted">
          <span className="text-signal">{pad(index + 1)}</span> / {pad(total)}
        </p>
        <p key={stage.id} className="brain-swap mt-3 font-serif text-[clamp(3rem,1.2rem+3vw,5rem)] italic leading-[0.82] tracking-[-0.02em]">
          {stage.label}
        </p>
      </div>
      <div key={stage.id} className="col-span-6 min-h-[8.5rem]">
        <p className="brain-swap text-[clamp(1.3rem,0.8rem+0.95vw,1.85rem)] leading-[1.15] tracking-[-0.012em]">{stage.line}</p>
        <p className="brain-swap brain-swapLate mt-3 max-w-[46ch] text-lede text-fg-muted">{stage.habit}</p>
      </div>
      <div className="col-span-3 justify-self-end text-right">
        <p className="font-mono text-micro uppercase tracking-[0.14em] text-fg-muted">Leaves behind</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-[6px] border border-line px-3 py-2 font-mono text-label">
          <FileText className="size-4 shrink-0 text-signal" strokeWidth={1.5} />
          <Scramble text={stage.artefact} trigger="change" duration={0.6} />
        </p>
      </div>
    </div>
  );
}

/**
 * THE LOOP — the home page's pipeline board, full size: scroll walks the signal through the seven
 * modules, the readout prints each one's habit and artefact. Chaos: the signal runs backwards.
 */
export function Loop() {
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const current = useRef(0);

  const onActive = useCallback((i: number) => {
    if (current.current === i) return;
    current.current = i;
    setActive(i);
    setHover(null);
    play("tick");
  }, []);

  const shown = hover ?? active;
  const shared = { stages: pipeline, active, hover, reduced, onActive, onHover: setHover, describedBy };

  return (
    <section
      id="loop"
      data-rail="Loop"
      aria-labelledby="tk-loop"
      className="brain-scene tk-loop relative pb-[clamp(4rem,10vh,7rem)] pt-[clamp(5rem,12vh,8.5rem)]"
    >
      <header className="frame grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-(--gutter)">
        <h2 id="tk-loop" data-chaos-type className="tk-h2 lg:col-span-7 xl:col-span-8">
          Seven steps,
          <br />
          <em>one loop.</em>
        </h2>
        <StatusPanel className="lg:col-span-5 xl:col-span-4" />
      </header>

      <Pipeline {...shared} chaos={chaos} className="mt-[clamp(2.5rem,6vh,4.5rem)] hidden lg:block">
        <StageReadout stage={pipeline[shown]} index={shown} total={pipeline.length} />
      </Pipeline>

      <div className="frame lg:hidden">
        <PipelineStack {...shared} className="mt-14" />
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
