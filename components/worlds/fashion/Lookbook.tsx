"use client";
// The lookbook reads sideways: pinned horizontal scroll on desktop (GSAP), Swiper on touch widths.
// Garments drift at their own depth as a spread passes the centre; scroll speed skews the flat-lays.
// Chaos: it scrolls backwards (desktop runs right-to-left, the mobile swiper flips to RTL).
import { useRef, useState, type UIEvent } from "react";
import { A11y, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Button } from "@/components/ui/Button";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { clamp, cn, pad } from "@/lib/utils";
import { LookPanel } from "./LookPanel";
import type { FashionScene } from "./scene";
import { useStore } from "./store/context";

export function Lookbook({ scene, gallery }: { scene: FashionScene; gallery?: string[] }) {
  const { lookbook, season } = scene;
  const looks = lookbook.looks;
  const section = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const { go } = useStore();
  const [slide, setSlide] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const el = track.current;
        const sec = section.current;
        if (!el || !sec || reduced) return;
        const panels = gsap.utils.toArray<HTMLElement>("[data-look]", el);
        const layers = panels.map((p) =>
          gsap.utils.toArray<HTMLElement>("[data-depth]", p).map((n) => ({ d: parseFloat(n.dataset.depth ?? "0"), set: gsap.quickSetter(n, "x", "px") })),
        );
        const skews = gsap.utils.toArray<HTMLElement>("[data-skew]", el).map((n) => gsap.quickTo(n, "skewX", { duration: 0.6, ease: "power3.out" }));
        const setBar = bar.current ? gsap.quickSetter(bar.current, "scaleX") : () => {};
        const distance = () => Math.max(0, el.scrollWidth - window.innerWidth);
        let settle: ReturnType<typeof setTimeout> | undefined;
        let shown = -1;

        const place = () => {
          const vw = window.innerWidth;
          let best = 0;
          let bestD = Infinity;
          panels.forEach((p, i) => {
            const r = p.getBoundingClientRect();
            const c = (r.left + r.width / 2 - vw / 2) / vw;
            if (Math.abs(c) < bestD) {
              bestD = Math.abs(c);
              best = i;
            }
            for (const l of layers[i]) l.set(c * l.d * -170);
          });
          const look = clamp(best - 1, 0, looks.length - 1);
          if (look !== shown && count.current) count.current.textContent = `Look ${pad(look + 1)} / ${pad(looks.length)}`;
          shown = look;
        };

        const tween = gsap.fromTo(
          el,
          { x: () => (chaos ? -distance() : 0) },
          {
            x: () => (chaos ? 0 : -distance()),
            ease: "none",
            onUpdate: place,
            scrollTrigger: {
              trigger: sec,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.9,
              invalidateOnRefresh: true,
              anticipatePin: 1,
              onUpdate: (self) => {
                setBar(self.progress);
                const v = clamp(self.getVelocity() / -240, -9, 9) * (chaos ? -1 : 1);
                skews.forEach((s) => s(v));
                clearTimeout(settle);
                settle = setTimeout(() => skews.forEach((s) => s(0)), 140);
              },
            },
          },
        );
        place();

        // keyboard: focusing a credit inside the moving track scrolls the page to that spread
        const onFocus = (e: FocusEvent) => {
          const st = tween.scrollTrigger;
          const panel = (e.target as HTMLElement).closest<HTMLElement>("[data-look]");
          if (!st || !panel) return;
          const d = distance();
          const along = clamp(panel.offsetLeft - (window.innerWidth - panel.offsetWidth) / 2, 0, d);
          const y = st.start + (chaos ? d - along : along);
          if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: y, behavior: "instant" });
        };
        el.addEventListener("focusin", onFocus);
        return () => {
          el.removeEventListener("focusin", onFocus);
          clearTimeout(settle);
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: section, dependencies: [reduced, chaos, looks.length], revertOnUpdate: true },
  );

  /** reduced motion on desktop: plain sideways scrolling with buttons, the counter follows the strip */
  const nudge = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * window.innerWidth * 0.62, behavior: "auto" });
  const onStrip = (e: UIEvent<HTMLDivElement>) => {
    const vw = window.innerWidth;
    const i = clamp(Math.round((e.currentTarget.scrollLeft + vw / 2 - 0.4 * vw) / (0.62 * vw) - 0.5), 0, looks.length - 1);
    if (count.current) count.current.textContent = `Look ${pad(i + 1)} / ${pad(looks.length)}`;
  };

  return (
    <div id="lookbook" className="relative">
      {/* desktop: pinned, sideways */}
      <section ref={section} aria-labelledby="fy-look" className="relative hidden h-svh overflow-hidden lg:block">
        {/* reduced motion: a native sideways strip. data-arrows="local" keeps ←/→ scrolling it instead
            of switching worlds (the shell skips arrow keys inside it). */}
        <div
          ref={scroller}
          className={cn("h-full", reduced && "no-scrollbar snap-x snap-mandatory overflow-x-auto")}
          tabIndex={reduced ? 0 : undefined}
          role={reduced ? "region" : undefined}
          aria-label={reduced ? "Lookbook — scroll sideways" : undefined}
          data-arrows={reduced ? "local" : undefined}
          onScroll={reduced ? onStrip : undefined}
        >
          <div ref={track} className="flex h-full w-max">
            <div data-look className="relative flex h-full w-[40vw] shrink-0 snap-start flex-col justify-between px-(--margin) pb-36 pt-[calc(var(--nav-h)+2rem)]">
              <h2 id="fy-look" data-chaos-type className="font-serif text-[clamp(5rem,11vw,12rem)] italic leading-[0.8] tracking-[-0.03em]">
                {lookbook.title}
              </h2>
              <p data-depth="0.35" aria-hidden className="font-display text-[clamp(4rem,9vw,10rem)] font-black uppercase leading-[0.8] tracking-[-0.04em]" style={{ fontVariationSettings: '"wdth" 125' }}>
                {season}
              </p>
              <div className="space-y-6">
                <p className="max-w-[24ch] text-lede">{lookbook.line}</p>
                <p className="flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
                  <span className="calm-only">Scroll — it reads sideways</span>
                  <span className="chaos-only">Scroll — it reads backwards today</span>
                  <svg viewBox="0 0 40 10" className="h-2.5 w-10" aria-hidden>
                    <path d="M0 5h37M32 1l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </p>
              </div>
            </div>
            {looks.map((look, i) => (
              <div key={look.id} className="h-full shrink-0 snap-start">
                <LookPanel look={look} index={i} total={looks.length} variant="wide" image={gallery?.[i]} />
              </div>
            ))}
            <div data-look className="flex h-full w-[36vw] shrink-0 snap-start flex-col justify-end gap-6 px-(--margin) pb-36">
              <p className="max-w-[16ch] font-serif text-[clamp(2.4rem,1.4rem+2.4vw,4.4rem)] italic leading-[0.95]">Everything on these pages is in the store.</p>
              <div>
                <Button variant="ink" onClick={() => go("preview")}>
                  Open the store
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* clear of the shell bar and the HUD row above it */}
        <div className="absolute bottom-36 right-(--margin) flex items-center gap-2">
          {reduced ? (
            <>
              <Button variant="key" size="sm" onClick={() => nudge(-1)} aria-label="Previous look">
                ←
              </Button>
              <Button variant="key" size="sm" onClick={() => nudge(1)} aria-label="Next look">
                →
              </Button>
            </>
          ) : null}
          <div className="pointer-events-none flex items-center gap-3 rounded-full bg-[#f4f1ea] px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[#14161c] shadow-[0_6px_20px_-10px_rgb(0_0_0/0.5)]">
            <span ref={count} className="tabular-nums" aria-live={reduced ? "polite" : undefined}>
              Look 01 / {pad(looks.length)}
            </span>
            {reduced ? null : (
              <span className="relative h-px w-24 bg-[#14161c]/20">
                <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-[#14161c]" />
              </span>
            )}
          </div>
        </div>
      </section>

      {/* touch widths: swipe */}
      <section aria-labelledby="fy-look-m" className="relative py-20 lg:hidden">
        <div className="px-(--margin)">
          <h2 id="fy-look-m" className="font-serif text-[23vw] italic leading-[0.8] tracking-[-0.03em]">
            {lookbook.title}
          </h2>
          <p className="mt-4 max-w-[26ch] text-lede">{lookbook.line}</p>
        </div>
        <Swiper
          key={chaos ? "rtl" : "ltr"}
          dir={chaos ? "rtl" : "ltr"}
          modules={[A11y, Keyboard]}
          keyboard={{ enabled: true }}
          a11y={{ enabled: true }}
          slidesPerView={1.1}
          spaceBetween={12}
          slidesOffsetBefore={16}
          slidesOffsetAfter={16}
          onSlideChange={(s) => setSlide(s.activeIndex)}
          className="mt-8"
          data-cursor="drag"
          data-cursor-label="SWIPE"
        >
          {looks.map((look, i) => (
            <SwiperSlide key={look.id}>
              <LookPanel look={look} index={i} total={looks.length} variant="slide" image={gallery?.[i]} />
            </SwiperSlide>
          ))}
        </Swiper>
        <p className="mt-4 px-(--margin) font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
          Look {pad(slide + 1)} / {pad(looks.length)} — swipe
        </p>
      </section>
    </div>
  );
}
