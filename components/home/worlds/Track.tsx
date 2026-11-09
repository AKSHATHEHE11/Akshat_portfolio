"use client";
import { useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useOnScreen } from "@/lib/hooks";
import type { ProjectSummary } from "@/lib/types";
import { clamp } from "@/lib/utils";
import { Footnote, Heading } from "./Heading";
import { Portal } from "./Portal";
import { Rail } from "./Rail";
import "./worlds.css";

/** Desktop: the section pins and vertical scroll drives a horizontal run of portals. */
export function Track({ projects }: { projects: ProjectSummary[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const train = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const stopsRef = useRef<number[]>([]);
  const activeRef = useRef(0);
  const after = useRef<Element | null>(null);
  const [stops, setStops] = useState(() => projects.map((_, i) => (i + 0.5) / projects.length));
  const [active, setActive] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const running = useOnScreen(section, "0px");
  const lenis = useLenis();

  useGSAP(
    () => {
      const sec = section.current;
      const tr = track.current;
      if (!sec || !tr) return;
      const portals = gsap.utils.toArray<HTMLElement>("[data-portal]", tr);
      const star = sec.querySelector("[data-asterisk]");
      const dist = () => Math.max(1, tr.scrollWidth - sec.clientWidth);
      let lineW = 0;

      const measure = () => {
        const d = dist();
        const at = portals.map((el) => clamp((el.offsetLeft + el.offsetWidth / 2 - sec.clientWidth / 2) / d, 0, 1));
        stopsRef.current = at;
        setStops(at);
        lineW = line.current?.clientWidth ?? 0;
      };

      // driven by the tween (not raw scroll) so the train stays in step with the scrubbed track
      const tween: gsap.core.Tween = gsap.to(tr, {
        x: () => -dist(),
        ease: "none",
        onUpdate: () => {
          const p = tween.progress();
          gsap.set(train.current, { x: p * lineW });
          gsap.set(fill.current, { scaleX: p });
          if (star) gsap.set(star, { rotate: p * 540 });
          const at = stopsRef.current.reduce((best, v, i, all) => (Math.abs(v - p) < Math.abs(all[best] - p) ? i : best), 0);
          if (at !== activeRef.current) {
            activeRef.current = at;
            setActive(at);
          }
        },
      });

      st.current = ScrollTrigger.create({
        trigger: sec,
        start: "top top",
        end: () => `+=${dist()}`,
        pin: true,
        scrub: 0.6,
        animation: tween,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        // declaring a priority makes ScrollTrigger sort every refresh by page position, so pins
        // created by other sections in any order still stack correctly
        refreshPriority: 0,
        onRefresh: measure,
      });
      measure();

      const host = sec.parentElement?.classList.contains("pin-spacer") ? sec.parentElement : sec;
      after.current = host.nextElementSibling;
      setNext(after.current?.getAttribute("data-rail") ?? null);

      // fonts and lazy sections above change the layout after mount
      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(refresh);
      const late = gsap.delayedCall(1.5, refresh);
      return () => {
        late.kill();
        st.current = null;
      };
    },
    { scope: section, dependencies: [projects.length], revertOnUpdate: true },
  );

  const go = (y: number) => (lenis ? lenis.scrollTo(y, { duration: 1.4 }) : window.scrollTo({ top: y, behavior: "smooth" }));
  const goTo = (i: number) => {
    const t = st.current;
    if (t) go(t.start + (stopsRef.current[i] ?? 0) * (t.end - t.start) + 1);
  };
  const goNext = () => {
    const el = after.current;
    if (el instanceof HTMLElement) go(el.getBoundingClientRect().top + window.scrollY);
  };

  return (
    <section ref={section} id="worlds" data-rail="Worlds" className="wd-pinned">
      <div className="wd-stage-area">
        <div ref={track} className="wd-track">
          <div className="wd-panel">
            <Heading className="text-display-m" />
          </div>
          {projects.map((p, i) => (
            // only the monitors around the one in front animate; the rest sit paused off-screen
            <Portal
              key={p.slug}
              p={p}
              index={i}
              total={projects.length}
              running={running && Math.abs(i - active) <= 1}
              variant="track"
              onKeyboardFocus={() => goTo(i)}
            />
          ))}
          <div className="wd-panel">
            <Footnote className="w-[min(28vw,24rem)]" />
          </div>
        </div>
      </div>
      <Rail
        projects={projects}
        stops={stops}
        active={active}
        next={next}
        onStop={goTo}
        onNext={goNext}
        lineRef={line}
        trainRef={train}
        fillRef={fill}
      />
    </section>
  );
}
