"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import type MatterNS from "matter-js";
import { play } from "@/lib/sound";
import { on } from "@/lib/system";
import { createBench, type Bench } from "./physics";
import { THINGS } from "./things";

interface Opts {
  root: RefObject<HTMLElement | null>;
  floor: RefObject<HTMLElement | null>;
  els: RefObject<(HTMLElement | null)[]>;
  reduced: boolean;
  chaos: boolean;
  booted: boolean;
}

/**
 * matter-js is fetched only when the bench is ~a screen away, runs only while the section is
 * visible, and drops the objects the first time the bench is properly in view after boot.
 * Boot replay parks everything above the bench again so the drop replays.
 */
export function useBench({ root, floor, els, reduced, chaos, booted }: Opts) {
  const bench = useRef<Bench | null>(null);
  const [live, setLive] = useState(false);
  const inView = useRef(false);
  const bootedRef = useRef(booted);

  useEffect(() => {
    const el = root.current;
    const fl = floor.current;
    const nodes = els.current;
    if (reduced || !el || !fl) return;
    let alive = true;
    let io: IntersectionObserver | undefined;
    let ro: ResizeObserver | undefined;
    let timer = 0;

    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        import("matter-js").then((mod) => {
          if (!alive) return;
          // CJS module: the namespace lives on .default under the bundler's interop
          const Matter = ((mod as { default?: typeof MatterNS }).default ?? mod) as typeof MatterNS;
          // every thing is always rendered, so indexes line up with THINGS
          const items = THINGS.map((t, i) => ({ t, el: nodes[i] as HTMLElement }));
          const b = createBench(Matter, el, fl, items, () => play("drop"));
          bench.current = b;
          setLive(true);

          io = new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) b.start();
              else b.stop();
              inView.current = entry.intersectionRatio >= 0.3;
              if (inView.current && bootedRef.current) b.drop();
            },
            { threshold: [0, 0.3] },
          );
          io.observe(el);

          // the floor sits at the section's bottom edge, so a height change moves it too
          let size = `${el.clientWidth}x${el.clientHeight}`;
          ro = new ResizeObserver(() => {
            const next = `${el.clientWidth}x${el.clientHeight}`;
            if (next === size) return;
            size = next;
            window.clearTimeout(timer);
            timer = window.setTimeout(() => b.rebuild(), 180);
          });
          ro.observe(el);
        });
      },
      { rootMargin: "900px 0px" },
    );
    near.observe(el);

    return () => {
      alive = false;
      near.disconnect();
      io?.disconnect();
      ro?.disconnect();
      window.clearTimeout(timer);
      bench.current?.destroy();
      bench.current = null;
      nodes.forEach((n) => n?.style.removeProperty("transform"));
      setLive(false);
    };
  }, [reduced, root, floor, els]);

  useEffect(() => {
    bench.current?.setChaos(chaos);
  }, [chaos, live]);

  // a chaos burst anywhere over the bench is a shockwave on it
  useEffect(
    () =>
      on<{ x: number; y: number }>("chaos:burst", (p) => {
        const r = root.current?.getBoundingClientRect();
        if (r && p && p.y > r.top && p.y < r.bottom) bench.current?.blast(p.x - r.left, p.y - r.top);
      }),
    [root],
  );

  useEffect(() => {
    bootedRef.current = booted;
    const b = bench.current;
    if (!b) return;
    if (!booted) b.park();
    else if (inView.current) b.drop();
  }, [booted, live]);

  return { bench, live };
}
