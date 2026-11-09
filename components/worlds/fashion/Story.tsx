"use client";
// Story: an editorial spread — the problem as a pull quote, the fix and the result as run-in copy —
// then a selvedge band of kinetic type that squeezes with scroll speed and follows scroll direction.
import { useRef, type CSSProperties } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { TLink } from "@/components/ui/TLink";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import type { Project } from "@/lib/types";
import { clamp, cn } from "@/lib/utils";
import type { FashionScene } from "./scene";

export function Story({ project }: { project: Project<FashionScene> }) {
  return (
    <>
      <section id="story" aria-labelledby="fy-story" className="relative px-(--margin) pb-20 pt-24 lg:pb-32 lg:pt-36">
        <h2 id="fy-story" className="sr-only">
          The story
        </h2>
        <div className="mx-auto grid max-w-(--frame-max) gap-x-(--gutter) gap-y-12 lg:grid-cols-12">
          <blockquote className="relative lg:col-span-7">
            <span aria-hidden className="absolute -left-[0.08em] -top-[0.32em] font-serif text-[clamp(5rem,3rem+6vw,10rem)] italic leading-none text-(--fy-fg)/15">
              “
            </span>
            <Reveal as="p" className="relative font-serif text-[clamp(2.1rem,1.15rem+3vw,4.6rem)] italic leading-[1] tracking-[-0.012em]">
              {project.challenge}
            </Reveal>
          </blockquote>

          <div aria-hidden className="relative hidden lg:col-span-1 lg:block">
            <span className="absolute inset-y-0 left-1/2 w-px bg-(--fy-fg)/20" />
            <span className="absolute inset-y-0 left-[calc(50%+6px)] w-px opacity-60" style={{ backgroundImage: "linear-gradient(180deg, var(--fy-fg) 55%, transparent 0)", backgroundSize: "1px 9px" }} />
          </div>

          <div className="space-y-5 self-end text-[1.0625rem] leading-relaxed lg:col-span-4">
            <p className="fy-dropcap">
              <strong className="font-semibold">The fix. </strong>
              {project.solution}
            </p>
            <p>
              <strong className="font-semibold">What happened. </strong>
              {project.outcome}
            </p>
            <dl className="grid grid-cols-[5.5rem_1fr] gap-y-1.5 border-t border-(--fy-fg)/20 pt-4 font-mono text-[0.75rem] uppercase tracking-[0.1em]">
              <dt className="text-(--fy-muted)">Role</dt>
              <dd>{project.role.join(" · ")}</dd>
              <dt className="text-(--fy-muted)">Year</dt>
              <dd>{project.year}</dd>
              <dt className="text-(--fy-muted)">Status</dt>
              <dd>{project.status}</dd>
            </dl>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              {project.links.map((l) => {
                const cls = "font-serif text-[1.35rem] italic underline decoration-1 underline-offset-[6px] hover:decoration-2";
                return (
                  <li key={l.href}>
                    {/* in-page anchors scroll (Lenis handles #); routes and live sites go through TLink */}
                    {l.href.startsWith("#") ? (
                      <a href={l.href} data-cursor="hover" className={cls}>
                        {l.label} →
                      </a>
                    ) : (
                      <TLink href={l.href} data-cursor="hover" className={cls}>
                        {l.label} →
                      </TLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
      <Band words={project.scene.marquee} />
    </>
  );
}

/** Selvedge band: the words run with the scroll, condense when you scroll fast, and reverse in chaos. */
function Band({ words }: { words: string[] }) {
  const band = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();

  useGSAP(
    () => {
      const el = band.current;
      const tr = track.current;
      if (!el || !tr || reduced) return;
      const wrap = gsap.utils.wrap(-50, 0);
      const setX = gsap.quickSetter(tr, "xPercent");
      const width = gsap.quickTo(el, "--w", { duration: 0.45, ease: "power3.out" });
      let x = 0;
      let dir = 1;
      let boost = 0;
      let rest: ReturnType<typeof setTimeout> | undefined;
      const sign = chaos ? -1 : 1;
      const tick = (_: number, dt: number) => {
        x = wrap(x - (1.7 * dir * sign + boost) * (dt / 1000));
        setX(x);
        boost *= 0.9;
      };
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)),
        onUpdate: (self) => {
          dir = self.direction;
          const v = self.getVelocity();
          boost = clamp(boost + (v / 260) * sign, -26, 26);
          width(clamp(100 - Math.abs(v) / 38, 64, 100));
          clearTimeout(rest);
          rest = setTimeout(() => width(chaos ? 125 : 100), 140);
        },
      });
      if (chaos) width(125);
      return () => {
        clearTimeout(rest);
        st.kill();
        gsap.ticker.remove(tick);
      };
    },
    { scope: band, dependencies: [reduced, chaos], revertOnUpdate: true },
  );

  const run = [...words, ...words];
  return (
    <div
      ref={band}
      aria-label={words.join(". ")}
      role="img"
      className="relative -mx-[2vw] -rotate-[1.6deg] overflow-hidden border-y-[6px] border-[#e6dfcf] bg-(--fy-accent) py-4 text-(--fy-fg) chaos:rotate-[2.4deg]"
      style={{ "--w": 100 } as CSSProperties}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-(--fy-fg)/70" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-(--fy-fg)/70" />
      <div ref={track} aria-hidden className="flex w-max will-change-transform">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {run.map((w, i) => (
              <span key={`${copy}-${i}`} className="flex items-center">
                <span
                  className={cn(
                    "whitespace-nowrap px-[0.35em] text-[clamp(3rem,1.6rem+6vw,8.5rem)] leading-[0.95]",
                    i % 2 ? "font-serif italic tracking-[-0.02em]" : "font-display font-black uppercase tracking-[-0.035em]",
                  )}
                  // round(): GSAP eases --w through decimals, and every distinct wdth value is a new font instance
                  // to build and shape — steps of 4 keep the band to a handful of cached ones
                  style={i % 2 ? undefined : { fontVariationSettings: '"wdth" round(var(--w), 4)' }}
                >
                  {i % 2 ? w.toLowerCase() : w}
                </span>
                <Asterisk />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Asterisk() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className="mx-[0.2em] size-[clamp(1.6rem,1rem+2.4vw,4rem)] shrink-0">
      <g stroke="currentColor" strokeWidth="5.5" strokeLinecap="round">
        <path d="M20 4v32M4 20h32M8.7 8.7l22.6 22.6M31.3 8.7 8.7 31.3" />
      </g>
    </svg>
  );
}
