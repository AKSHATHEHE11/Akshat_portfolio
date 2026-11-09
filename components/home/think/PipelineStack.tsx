"use client";
import { useRef } from "react";
import { useLenis } from "lenis/react";
import { FileText } from "lucide-react";
import type { PipelineStage } from "@/data/think";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { play } from "@/lib/sound";
import { cn, pad } from "@/lib/utils";
import { Module, type ModuleState } from "./Module";
import "./think.css";

interface Props {
  stages: readonly PipelineStage[];
  active: number;
  hover: number | null;
  reduced: boolean;
  onActive: (i: number) => void;
  onHover: (i: number | null) => void;
  describedBy: (i: number) => string;
  className?: string;
}

/**
 * Narrow screens: the pipeline runs downwards. Each module lights as it crosses the reading line,
 * the pipe above it fills with signal, and every module's readout is printed beside it (no hover needed).
 */
export function PipelineStack({ stages, active, hover, reduced, onActive, onHover, describedBy, className }: Props) {
  const list = useRef<HTMLOListElement>(null);
  const lenis = useLenis();
  const shown = hover ?? active;
  const stateOf = (i: number): ModuleState => (i === shown ? "active" : reduced || i <= active ? "passed" : "idle");

  useGSAP(
    () => {
      if (reduced) return;
      const mm = gsap.matchMedia();
      mm.add("(max-width: 1023.98px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-step]", list.current).forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            start: "top 62%",
            end: "bottom 62%",
            onToggle: (self) => self.isActive && onActive(i),
          });
        });
      });
      return () => mm.revert();
    },
    { scope: list, dependencies: [reduced], revertOnUpdate: true },
  );

  const pick = (i: number) => {
    play("press");
    const el = list.current?.querySelectorAll<HTMLElement>("[data-step]")[i];
    if (reduced || !el) return onActive(i);
    const offset = -window.innerHeight * 0.45;
    if (lenis) lenis.scrollTo(el, { offset, duration: 0.9 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
  };

  return (
    <ol ref={list} className={cn("relative", className)}>
      {stages.map((st, i) => (
        <li key={st.id} data-step className="relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-5 pb-11 last:pb-0">
          {i < stages.length - 1 && <span aria-hidden className="brain-vpipe" data-on={reduced || i < active ? "1" : "0"} />}
          <Module
            stage={st}
            index={i}
            total={stages.length}
            state={stateOf(i)}
            current={i === active}
            describedBy={describedBy(i)}
            onHover={onHover}
            onPick={pick}
            className="aspect-[170/180] w-[6.5rem]"
          />
          <div className={cn("max-w-[34rem] pt-1 transition-opacity duration-300", stateOf(i) === "idle" && "opacity-80")}>
            <p className="font-mono text-micro uppercase tabular-nums tracking-[0.14em] text-fg-muted">
              <span className="text-signal">{pad(i + 1)}</span> / {pad(stages.length)}
            </p>
            <h3 className="mt-1.5 font-serif text-[2rem] italic leading-none">{st.label}</h3>
            <p className="mt-3 leading-snug">{st.line}</p>
            <p className="mt-2 text-[0.9rem] leading-snug text-fg-muted">{st.habit}</p>
            <p className="mt-3 flex items-center gap-2 font-mono text-micro tracking-[0.04em]">
              <FileText aria-hidden className="size-3.5 shrink-0 text-signal" strokeWidth={1.75} />
              {st.artefact}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
