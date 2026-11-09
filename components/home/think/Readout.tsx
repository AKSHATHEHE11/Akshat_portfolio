"use client";
import { FileText } from "lucide-react";
import type { PipelineStage } from "@/data/think";
import { Button } from "@/components/ui/Button";
import { Scramble } from "@/components/ui/Scramble";
import { pad } from "@/lib/utils";
import "./think.css";

/**
 * What the shown module is doing: its line, the habit behind it and the file it leaves behind.
 * Visual only (aria-hidden) — the same text is each module's accessible description.
 */
export function Readout({ stage, index, total }: { stage: PipelineStage; index: number; total: number }) {
  return (
    <div className="mt-[clamp(1.25rem,3svh,2.25rem)] flex flex-wrap items-end gap-x-[clamp(1.5rem,3vw,3.5rem)] gap-y-5 border-t border-line pt-5">
      <div aria-hidden className="w-[9.5rem] shrink-0">
        <p className="font-mono text-label tabular-nums tracking-[0.08em] text-fg-muted">
          <span className="text-signal">{pad(index + 1)}</span> / {pad(total)}
        </p>
        <p key={stage.id} className="brain-swap mt-2 font-serif text-[2.4rem] italic leading-[0.9]">
          {stage.label}
        </p>
      </div>
      <div aria-hidden key={stage.id} className="min-w-[16rem] max-w-[38rem] flex-1">
        <p className="brain-swap text-lede">{stage.line}</p>
        <p className="brain-swap brain-swapLate mt-2 text-fg-muted">{stage.habit}</p>
      </div>
      <p aria-hidden className="flex items-center gap-2 pb-1 font-mono text-label">
        <FileText className="size-4 shrink-0 text-signal" strokeWidth={1.5} />
        <Scramble text={stage.artefact} trigger="change" duration={0.6} />
      </p>
      <div className="ml-auto">
        <Button href="/think" variant="ghost">
          Open the full brain
        </Button>
      </div>
    </div>
  );
}
