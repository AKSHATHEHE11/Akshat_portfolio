"use client";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useLenis } from "lenis/react";
import { Button } from "@/components/ui/Button";
import { experiments, type Experiment } from "@/data/experiments";
import { useChaos, useCoarse, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { system } from "@/lib/system";
import { Header } from "./Header";
import { Station } from "./Station";
import "./lab.css";

type Slug = Experiment["slug"];

/**
 * /experiments — the lab bench. Six specimen stations; exactly one is switched on at a time: the one
 * under the middle of the viewport, or the one you last touched. Arriving at /experiments#<slug> (the
 * home lab strip links here) is handled by Providers, which lands on the section and holds it while the
 * page settles; the station there switches on through its scroll trigger like any other.
 */
export default function ExperimentsLab() {
  const [active, setActive] = useState<Slug | null>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const coarse = useCoarse();
  const lenis = useLenis();
  /** a programmatic roll is under way: stations it passes must not switch on */
  const rolling = useRef(0);

  const roll = useCallback(
    (slug: Slug) => {
      const el = document.getElementById(slug);
      if (!el || !lenis) return;
      setActive(slug);
      window.clearTimeout(rolling.current);
      rolling.current = window.setTimeout(() => (rolling.current = 0), 2000);
      lenis.scrollTo(el, {
        force: true,
        immediate: system.get().reducedMotion,
        duration: 1.3,
        onComplete: () => {
          window.clearTimeout(rolling.current);
          rolling.current = 0;
        },
      });
    },
    [lenis],
  );

  // No hashchange handler on purpose: a fragment change (back/forward, an edited URL) has already
  // jumped natively by the time the event fires, and Lenis — not yet synced to that jump — would
  // compute its target from the old position and drag the page back. The jump lands right
  // (scroll-margin-top) and the scroll triggers switch the right station on.

  const onScroll = useCallback((slug: Slug, inView: boolean) => {
    if (rolling.current) return;
    setActive((a) => (inView ? slug : a === slug ? null : a));
  }, []);

  const current = useRef(active);
  useEffect(() => {
    current.current = active;
  }, [active]);
  const onActivate = useCallback((slug: Slug) => {
    if (current.current !== slug) play("toggle-on");
    setActive(slug);
  }, []);

  // Rack links: our own roll (Lenis' anchor handler would start a second one) + a quiet URL update.
  const onPick = (slug: Slug, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.history.replaceState(window.history.state, "", `#${slug}`);
    play("click");
    roll(slug);
  };

  return (
    <div className="pb-8">
      <Header items={experiments} active={active} onPick={onPick} />
      {experiments.map((x, i) => (
        <Station
          key={x.slug}
          x={x}
          index={i}
          active={active === x.slug}
          chaos={chaos}
          reduced={reduced}
          coarse={coarse}
          onActivate={onActivate}
          onScroll={onScroll}
        />
      ))}
      <footer className="frame xp-end">
        <p className="serif-accent text-title">End of the bench.</p>
        <Button href="/playground" variant="ghost">
          Next door: the playground
        </Button>
      </footer>
    </div>
  );
}
