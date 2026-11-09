"use client";
import { useRef, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { Motif } from "@/components/work/Motif";
import { Morph } from "@/components/transitions/Morph";
import { Button } from "@/components/ui/Button";
import { TLink } from "@/components/ui/TLink";
import { Kbd } from "@/components/ui/marks";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { morph } from "@/lib/transitions";
import type { ProjectSummary } from "@/lib/types";
import { pad } from "@/lib/utils";
import { inkOn, worldTokens } from "./palette";

/**
 * End of a world: the next world waits as a portal. Scrolling toward it opens it (scale up,
 * corners square off, the title's width axis stretches). Its colour box and title carry the
 * next world's morph names, so clicking flies them straight into that world.
 */
export function Finale({
  current,
  next,
  nextIndex,
  total,
}: {
  current: ProjectSummary;
  next: ProjectSummary;
  nextIndex: number;
  total: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const titleId = `finale-${next.slug}`;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced) return;
      gsap
        .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top bottom", end: "top 15%", scrub: 0.6 } })
        .fromTo("[data-portal]", { scale: 0.84, yPercent: 5 }, { scale: 1, yPercent: 0 }, 0)
        .fromTo("[data-panel]", { borderRadius: 40 }, { borderRadius: 14 }, 0)
        .fromTo("[data-finale-title]", { "--w": 72 }, { "--w": 112 }, 0);
    },
    { dependencies: [reduced, next.slug], scope: ref, revertOnUpdate: true },
  );

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className="relative overflow-x-clip bg-bg text-fg"
      style={worldTokens(current.color)}
    >
      <div className="frame pb-32 pt-[clamp(4.5rem,10vw,9rem)] md:pb-36">
        <div className="label flex items-end justify-between gap-6 border-t border-line pt-4 text-fg-muted">
          <span>End of {current.title}</span>
          <span data-chaos-drift>
            Next stop · {pad(nextIndex + 1)}/{pad(total)}
          </span>
        </div>

        <TLink
          href={`/work/${next.slug}`}
          kind="world-enter"
          className="group relative mt-5 block rounded-[14px] [--motif-play:paused] hover:[--motif-play:running] focus-visible:[--motif-play:running]"
          aria-label={`Next world: ${next.title}, ${next.category}`}
          data-cursor="open"
          data-cursor-label="ENTER"
          onPointerEnter={() => play("tick")}
        >
          <div data-portal className="relative will-change-transform">
            <Morph name={morph.stage(next.slug)}>
              <div
                data-panel
                className="relative aspect-[4/5] overflow-hidden rounded-[14px] sm:aspect-[16/10] lg:aspect-[21/9]"
                // a hairline in the next world's own ink, so a dark portal still reads on a dark world
                style={{ background: next.color.bg, border: `1px solid color-mix(in oklab, ${next.color.fg} 16%, transparent)` }}
              >
                <Motif
                  env={next.environment}
                  color={next.color}
                  className="opacity-60 transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.05]"
                />
              </div>
            </Morph>

            <div
              className="pointer-events-none absolute inset-0 flex flex-col justify-between p-[clamp(1rem,2.6vw,2.25rem)]"
              style={{ color: next.color.fg }}
            >
              <div className="label flex items-start justify-between gap-4">
                <span>
                  [{next.id}] {next.category}
                </span>
                <span>{next.year}</span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
                <div className="min-w-0">
                  <p className="serif-accent mb-3 max-w-[24ch] text-lede">{next.tagline}</p>
                  <Morph name={morph.title(next.slug)} variant="text">
                    <h2
                      id={titleId}
                      data-finale-title
                      data-chaos-type
                      className="display text-[clamp(2.5rem,11vw,5rem)] sm:text-display-m"
                      style={{ fontVariationSettings: '"wdth" var(--w, 100)' } as CSSProperties}
                    >
                      {next.title}
                    </h2>
                  </Morph>
                </div>
                <span
                  className="label inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-5 transition-transform duration-300 ease-out-expo group-hover:-translate-y-1"
                  style={{ background: next.color.accent, color: inkOn(next.color.accent) }}
                >
                  Enter world <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </TLink>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Button href="/work" kind="world-exit" variant="ghost" size="sm" icon={null}>
            Back to all worlds
          </Button>
          <p className="label inline-flex items-center gap-2 text-fg-muted">
            <span className="hidden items-center gap-2 fine:inline-flex">
              or press <Kbd>→</Kbd>
            </span>
            <span className="fine:hidden">or swipe ←</span>
          </p>
        </div>
      </div>
    </section>
  );
}
