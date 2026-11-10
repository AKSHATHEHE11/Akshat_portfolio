"use client";
// The stage: one sticky, full-bleed field behind the hero, the instrument, the story and the patch
// notes. The morph target (bg box) and the title render immediately; the live canvas is appended into
// the sticky host by FieldProvider and powers on over an art-directed CSS poster (which is also the
// no-WebGL picture, and follows presets while it is the only picture).
import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Morph } from "@/components/transitions/Morph";
import { Led } from "@/components/ui/marks";
import { useCoarse } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { morph } from "@/lib/transitions";
import type { Project } from "@/lib/types";
import { useFieldHost } from "./FieldHost";
import { paletteAt } from "./patch";
import type { LabScene } from "./scene";

const STOPS = [0.04, 0.28, 0.52, 0.76, 0.96];

/** Five samples of the cosine palette as --c0…--c4 (the poster's and the flow screens' colours). */
export function posterVars(pal: number[], hue: number) {
  return Object.fromEntries(STOPS.map((t, i) => [`--c${i}`, paletteAt(pal, t, hue)])) as CSSProperties;
}

function Poster({ initial }: { initial: CSSProperties }) {
  const { field, live } = useFieldHost();
  const ref = useRef<HTMLDivElement>(null);

  // only while the poster is what you see: repaint its colours once per frame at most
  useEffect(() => {
    if (live) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      for (const [k, v] of Object.entries(posterVars(field.patch.palette, field.patch.hue))) el.style.setProperty(k, String(v));
    };
    const queue = () => void (raf ||= requestAnimationFrame(paint));
    const offValue = field.onValue(queue);
    const offUi = field.subscribe(queue);
    return () => {
      offValue();
      offUi();
      cancelAnimationFrame(raf);
    };
  }, [field, live]);

  return <div ref={ref} className="nf-poster" style={initial} />;
}

export function Stage({ project, children }: { project: Project<LabScene>; children: ReactNode }) {
  const { slug, color, scene } = project;
  const { field, host } = useFieldHost();
  const first = scene.presets[0].patch;
  const initial = useMemo(() => posterVars(first.palette, first.hue), [first]);

  // stir: a mouse over open field swirls it; a tap leaves a ripple where the finger landed
  const over = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    field.live.stir.on = !(e.target as Element).closest(".nf-panel, .nf-notes, button, a");
  };
  const down = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || (e.target as Element).closest(".nf-panel, .nf-notes, button, a, [role='slider']")) return;
    Object.assign(field.live.stir, { x: e.clientX, y: e.clientY, at: performance.now() });
    field.live.invalidate();
  };

  return (
    <div
      className="relative isolate"
      onPointerOver={over}
      onPointerLeave={() => void (field.live.stir.on = false)}
      onPointerDown={down}
    >
      <Morph name={morph.stage(slug)}>
        <div aria-hidden className="absolute inset-x-0 top-0 h-svh" style={{ background: color.bg }} />
      </Morph>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div ref={host.stage} className="nf-stage">
          <Poster initial={initial} />
        </div>
      </div>
      <div className="relative z-[1]">
        <Hero project={project} />
        {children}
      </div>
    </div>
  );
}

function Hero({ project }: { project: Project<LabScene> }) {
  const { slug, title, tagline, category, year, status, scene, links } = project;
  const { gl, live } = useFieldHost();
  const coarse = useCoarse();
  const [head, ...tail] = title.split(" ");

  return (
    <section aria-labelledby="nf-title" className="flex min-h-svh flex-col justify-between pb-32 pt-[calc(var(--nav-h)+1rem)] md:pb-36">
      <div className="frame flex items-center justify-between gap-6 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fg)/75">
        <p className="flex items-center gap-2">
          <Led tone="accent" pulse={live} />
          <span>
            {scene.model} · {gl === false ? "poster mode" : live ? "field live" : "warming up"}
          </span>
        </p>
        <p className="hidden sm:block">
          {category} · {year} · {status}
        </p>
      </div>

      <div className="frame">
        <Morph name={morph.title(slug)} variant="text">
          <h1 id="nf-title" data-chaos-type className="nf-title">
            <span className="nf-title-a">{head}</span> {tail.length > 0 && <span className="nf-title-b">{tail.join(" ")}</span>}
          </h1>
        </Morph>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 md:mt-8">
          <p className="nf-shade max-w-[24ch] font-serif text-[1.45rem] italic leading-[1.08] md:text-[1.9rem]">{tagline}</p>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="nf-shade font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fg)/75">
              {coarse ? "Tap the field to stir it" : "Move over the field to stir it"}
            </p>
            <div className="flex flex-wrap gap-2">
              {links.map((l, i) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="nf-chip"
                  data-tone={i === 0 ? "accent" : undefined}
                  data-cursor="hover"
                  onPointerEnter={() => play("tick")}
                  onClick={() => play("click")}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
