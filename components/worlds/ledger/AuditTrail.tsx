"use client";
// Process as the audit trail compliance signed: one entry per step, each hash covering the one before.
// Amend an entry and the chain shows it — that row and every row after it stop matching their
// signatures. Chaos: someone else keeps editing history.
import { useEffect, useRef, useState } from "react";
import { PenLine, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Led } from "@/components/ui/marks";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { cn, pad } from "@/lib/utils";
import { chain } from "./engine";
import type { LedgerScene } from "./scene";

export function AuditTrail({ project }: { project: Project<LedgerScene> }) {
  const { process, scene } = project;
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const visible = useOnScreen(ref, "0px");
  const [amended, setAmended] = useState<boolean[]>(() => process.map(() => false));

  const line = (i: number, title: string) => `${scene.audit[i]?.at}|${scene.audit[i]?.action}|${title}|${process[i].body}`;
  const signed = chain(process.map((s, i) => line(i, s.title)));
  const now = chain(process.map((s, i) => line(i, amended[i] ? (scene.audit[i]?.tamper ?? s.title) : s.title)));
  const first = now.findIndex((h, i) => h !== signed[i]);
  const broken = first === -1 ? 0 : process.length - first;

  const toggle = (i: number) => {
    const next = amended.map((a, k) => (k === i ? !a : a));
    setAmended(next);
    play(next.some(Boolean) ? "glitch" : "success");
  };
  const restore = () => {
    setAmended(process.map(() => false));
    play("success");
  };

  // rows countersign one after another as the trail scrolls in
  useGSAP(
    () => {
      if (reduced) return;
      const rows = gsap.utils.toArray<HTMLElement>("[data-lg-entry]", ref.current);
      gsap.from(rows, {
        autoAlpha: 0,
        x: -14,
        duration: 0.7,
        stagger: 0.12,
        ease: "expo.out",
        clearProps: "transform,opacity,visibility",
        scrollTrigger: { trigger: rows[0], start: "top 82%", once: true },
      });
      rows.forEach((row, i) =>
        gsap.to(row.querySelector("[data-lg-sig]"), {
          duration: 0.9,
          delay: 0.25 + i * 0.12,
          scrambleText: { text: "{original}", chars: "0123456789abcdef", speed: 0.6 },
          scrollTrigger: { trigger: rows[0], start: "top 82%", once: true },
        }),
      );
    },
    { scope: ref, dependencies: [reduced] },
  );

  // chaos: entries get "corrected" behind your back, one every few seconds; calm restores the signed copy
  useEffect(() => {
    if (!chaos || reduced || !visible) return;
    let k = 0;
    const id = window.setInterval(() => {
      const i = (k++ * 2 + 1) % process.length;
      setAmended((a) => a.map((v, j) => (j === i ? !v : v)));
      play("glitch");
    }, 2400);
    return () => {
      window.clearInterval(id);
      setAmended((a) => a.map(() => false));
    };
  }, [chaos, reduced, visible, process.length]);

  return (
    <section id="process" ref={ref} aria-labelledby="lg-audit" className="frame relative scroll-mt-24 pt-28 md:pt-40">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2
          id="lg-audit"
          data-chaos-type
          className="font-display text-[clamp(3rem,1rem+8vw,10rem)] font-[800] leading-[0.82] tracking-[-0.045em] [font-variation-settings:'wdth'_70]"
        >
          Audit trail
        </h2>
        <p className="max-w-[36ch] text-[1.0625rem] leading-snug text-(--lg-fg)/70">
          How it was built, as compliance read it. Every entry is hashed with the one before — try amending one.
        </p>
      </div>

      <ol className="mt-12 border-t-2 border-(--lg-fg) md:mt-16">
        {process.map((step, i) => {
          const a = scene.audit[i];
          const bad = now[i] !== signed[i];
          const title = amended[i] ? (a?.tamper ?? step.title) : step.title;
          return (
            <li
              key={step.title}
              data-lg-entry
              className={cn(
                "relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-3 border-b border-(--lg-fg)/14 py-7 transition-colors duration-300 md:grid-cols-[9.5rem_minmax(0,1fr)_auto] md:py-9 xl:grid-cols-[9.5rem_minmax(0,1fr)_17rem_auto] xl:gap-x-8",
                bad && "bg-(--lg-down)/[0.06]",
              )}
            >
              <span aria-hidden className={cn("absolute inset-y-0 -left-3 w-[3px] transition-colors duration-300 md:-left-5", bad ? "bg-(--lg-down)" : "bg-transparent")} />
              <p className="col-span-2 flex flex-wrap gap-x-3 font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.12em] md:col-span-1 md:block">
                <span className="text-(--lg-fg)/55 md:block">#{pad(i + 1)}</span>
                <span className="tabular-nums md:block">{a?.at}</span>
                <span className="text-(--lg-signal) md:block">{a?.action}</span>
              </p>
              <div className="min-w-0">
                <h3
                  className={cn(
                    "font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.4rem)] font-[720] leading-[0.98] tracking-[-0.025em] [font-variation-settings:'wdth'_80]",
                    amended[i] && "lg-amended",
                  )}
                >
                  {title}
                </h3>
                <p className="mt-3 max-w-[56ch] text-[1rem] leading-relaxed text-(--lg-fg)/72">{step.body}</p>
              </div>
              <p className="col-span-2 row-start-3 font-mono text-[0.75rem] leading-relaxed text-(--lg-fg)/60 md:col-start-2 md:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:pt-1.5">
                <span className="text-(--lg-signal)">↳ </span>
                {a?.artefact}
              </p>
              <div className="col-start-2 row-start-2 flex flex-col items-end gap-3 md:col-start-3 md:row-span-2 md:row-start-1 xl:col-start-4">
                <p className="text-right font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.1em]">
                  <span className="block text-(--lg-fg)/50">sig</span>
                  <span data-lg-sig className="block tabular-nums">
                    {signed[i]}
                  </span>
                  <span className={cn("block tabular-nums", bad ? "lg-down" : "lg-up")}>
                    {bad ? `≠ ${now[i]}` : "✓ match"}
                  </span>
                </p>
                <button
                  type="button"
                  aria-pressed={amended[i]}
                  aria-label={amended[i] ? `Revert entry ${i + 1}` : `Amend entry ${i + 1} to “${a?.tamper}”`}
                  onClick={() => toggle(i)}
                  onPointerEnter={() => play("tick")}
                  data-cursor="hover"
                  className={cn(
                    "hit inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em] transition-colors coarse:h-10",
                    amended[i]
                      ? "border-(--lg-down) bg-(--lg-down) text-[#111] hover:bg-transparent hover:text-(--lg-down)"
                      : "border-(--lg-fg)/30 text-(--lg-fg)/80 hover:border-(--lg-fg) hover:text-(--lg-fg)",
                  )}
                >
                  {amended[i] ? <RotateCcw size={12} strokeWidth={2} aria-hidden /> : <PenLine size={12} strokeWidth={2} aria-hidden />}
                  {amended[i] ? "Revert" : "Amend"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p role="status" className="flex items-center gap-2.5 font-mono text-[0.75rem] uppercase tracking-[0.12em]">
          <Led tone={broken ? "signal" : "go"} pulse={!!broken} className={cn(broken && "bg-(--lg-down)! text-(--lg-down)!")} />
          {broken ? (
            <span className="lg-down">
              Chain broken at #{pad(first + 1)} · {broken} of {process.length} entries can’t be trusted
            </span>
          ) : (
            <span>
              Chain verified · {process.length} of {process.length} entries · signed {scene.actor}
            </span>
          )}
        </p>
        {broken > 0 && (
          <Button variant="ghost" size="sm" magnetic={false} onClick={restore} icon={<RotateCcw size={13} strokeWidth={2} />}>
            Restore the signed copy
          </Button>
        )}
      </div>
    </section>
  );
}
