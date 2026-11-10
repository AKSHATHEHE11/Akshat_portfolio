"use client";
// Technology as the signal flow: uniforms → noise → warp → palette → feedback → crush → output.
// Every module's screen is the real pipeline stopped at that stage (the world's one canvas moves here
// and draws each screen in its own scissor box). Pick a module to read what happens there and which
// tools do it; pick a tool to light every stage it powers.
import { useState, type CSSProperties } from "react";
import { useCoarse } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Tech } from "@/lib/types";
import { useFieldHost } from "./FieldHost";
import type { FlowStage } from "./scene";

type Sel = { kind: "stage"; i: number } | { kind: "tech"; name: string };

export function Flow({ flow, tech }: { flow: FlowStage[]; tech: Tech[] }) {
  const { host, slot } = useFieldHost();
  const coarse = useCoarse();
  const [sel, setSel] = useState<Sel>({ kind: "stage", i: 0 });
  const why = (name: string) => tech.find((t) => t.name === name)?.why;

  const pickStage = (i: number) => {
    if (sel.kind === "stage" && sel.i === i) return;
    play("tick");
    setSel({ kind: "stage", i });
  };
  const pickTech = (name: string) => {
    if (sel.kind === "tech" && sel.name === name) return;
    play("tick");
    setSel({ kind: "tech", name });
  };

  const stage = sel.kind === "stage" ? flow[sel.i] : null;
  const lit = (s: FlowStage) => (sel.kind === "tech" ? s.tech.includes(sel.name) : false);

  return (
    <section aria-labelledby="nf-flow-h" className="frame relative py-24 md:py-36">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2 id="nf-flow-h" data-chaos-type className="nf-h2 nf-h2-wide">
          Signal flow
        </h2>
        <p className="max-w-[32ch] pb-1 text-[1.0625rem] leading-snug text-(--fg)/75">
          Every knob is a uniform. Follow one from the panel to the pixel; each screen is the live field stopped at that stage.
        </p>
      </div>

      <div ref={host.flow} className="nf-flow mt-12 md:mt-16">
        <ol className="nf-chain">
          {flow.map((s, i) => (
            <li
              key={s.id}
              className="nf-mod"
              data-on={stage?.id === s.id || undefined}
              data-lit={lit(s) || undefined}
              style={{ "--i": i } as CSSProperties}
            >
              <button
                type="button"
                className="nf-mod-btn"
                aria-pressed={stage?.id === s.id}
                aria-controls="nf-flow-read"
                data-cursor="hover"
                onPointerEnter={coarse ? undefined : () => pickStage(i)}
                onFocus={() => pickStage(i)}
                onClick={() => pickStage(i)}
              >
                <span className="nf-screen-wrap">
                  <span ref={slot(i)} aria-hidden className="nf-screen" data-stage={s.id} />
                </span>
                <span className="nf-mod-label">{s.label}</span>
                <span className="nf-mod-spec">{s.spec}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 grid gap-8 md:mt-14 lg:grid-cols-12 lg:gap-(--gutter)">
        <div id="nf-flow-read" className="nf-flow-read lg:col-span-7" aria-live="polite">
          {stage ? (
            <>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--accent)">
                {stage.label} · {stage.spec}
              </p>
              <p className="mt-3 max-w-[40ch] text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-[1.25]">{stage.note}</p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {stage.tech.map((name) => (
                  <div key={name} className="border-t border-(--fg)/15 pt-3">
                    <dt className="font-[700] tracking-[-0.01em]">{name}</dt>
                    <dd className="mt-1 text-[0.9375rem] leading-snug text-(--fg)/72">{why(name)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : sel.kind === "tech" ? (
            <>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--accent)">
                {sel.name} · feeds {flow.filter(lit).map((s) => s.label).join(", ") || "the bench"}
              </p>
              <p className="mt-3 max-w-[40ch] text-[clamp(1.25rem,1rem+0.8vw,1.75rem)] leading-[1.25]">{why(sel.name)}</p>
            </>
          ) : null}
        </div>

        <div className="lg:col-span-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fg)/60">Patched in</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tech.map((t) => (
              <li key={t.name}>
                <button
                  type="button"
                  className="nf-chip"
                  aria-pressed={sel.kind === "tech" && sel.name === t.name}
                  aria-controls="nf-flow-read"
                  data-cursor="hover"
                  onPointerEnter={coarse ? undefined : () => pickTech(t.name)}
                  onFocus={() => pickTech(t.name)}
                  onClick={() => pickTech(t.name)}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
