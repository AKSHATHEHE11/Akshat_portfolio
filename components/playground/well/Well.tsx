"use client";
import { memo, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useChaos, useCoarse, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { createWell, type WellSim } from "./sim";

const ORBS = ["bearing", "nut", "dot", "key", "bearing", "nut", "dot"] as const;
const STEER: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * The gravity well: a rubber-sheet grid sagging into a point mass, a handful of loose parts on
 * orbits. Over it the cursor is hidden and drawn where the well bends it (a faint ring marks where
 * it really is); the cursor also tugs the parts. Click / Enter feeds it (five times the mass for a
 * second), arrow keys steer a probe, a finger works as the probe on touch. Bugs that wander close
 * fall in (lab.well). Chaos: the mass breathes and the sheet turns. Reduced motion: a still diagram.
 */
export default function Well({ active }: { active: boolean }) {
  const disc = useRef<HTMLButtonElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const core = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLElement>(null);
  const orbs = useRef<(HTMLSpanElement | null)[]>([]);
  const sim = useRef<WellSim | null>(null);
  const coarse = useCoarse();
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const n = coarse ? 4 : ORBS.length;

  useEffect(() => {
    const el = disc.current;
    if (!el || !probe.current || !ghost.current || !core.current) return;
    const s = createWell(
      el,
      { orbs: orbs.current.slice(0, n).filter((o): o is HTMLSpanElement => !!o), probe: probe.current, ghost: ghost.current, core: core.current, count: count.current },
      { coarse, onCapture: () => play("tick") },
    );
    sim.current = s;
    const mat = el.closest(".pg-mat");
    let raf = 0;
    const remeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => s.measure());
    };
    const ro = new ResizeObserver(remeasure);
    ro.observe(el);
    if (mat) ro.observe(mat);
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", remeasure);
      s.destroy();
      sim.current = null;
    };
  }, [n, coarse]);

  useEffect(() => {
    const s = sim.current;
    if (!s) return;
    if (active && !reduced) s.start();
    else s.stop();
    return () => s.stop();
  }, [active, reduced, n, coarse]);

  useEffect(() => sim.current?.setChaos(chaos), [chaos, n, coarse]);

  const feed = () => {
    sim.current?.pulse();
    play("whoosh");
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const s = STEER[e.key];
    if (!s || reduced) return;
    e.preventDefault();
    sim.current?.steer(s[0], s[1]);
  };
  const onTouch = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") sim.current?.touch(e.clientX, e.clientY);
  };

  return (
    <div className="pg-well" data-pg-in>
      <button
        ref={disc}
        type="button"
        className="pg-well-disc"
        data-cursor="hide"
        data-arrows="local"
        aria-label="Gravity well. Press to feed it; arrow keys steer a probe through it."
        onClick={feed}
        onKeyDown={onKey}
        onPointerDown={onTouch}
        onPointerMove={onTouch}
      >
        <Sheet />
        <span ref={core} aria-hidden className="pg-well-core">
          <i />
        </span>
        {ORBS.slice(0, n).map((k, i) => (
          <span
            key={i}
            ref={(el) => {
              orbs.current[i] = el;
            }}
            aria-hidden
            className={`pg-orb pg-orb-${k}`}
          />
        ))}
        <span ref={ghost} aria-hidden className="pg-well-ghost" />
        <span ref={probe} aria-hidden className="pg-well-probe" />
      </button>
      <p className="pg-well-plate">
        <span className="label">Well 01 · 1 M</span>
        <span className="label">
          Swallowed <b ref={count}>000</b>
        </span>
      </p>
    </div>
  );
}

/* The sheet: a square grid pulled toward the centre (a Gaussian dent), clipped to the disc, plus
   three equipotential rings. Computed once at module load; identical on server and client. */
const GRID = (() => {
  const warp = (x: number, y: number) => {
    const k = 1 - 0.62 * Math.exp(-(x * x + y * y) / (2 * 34 * 34));
    return `${(x * k).toFixed(1)} ${(y * k).toFixed(1)}`;
  };
  let d = "";
  for (let i = -5; i <= 5; i++) {
    const c = (i * 100) / 6;
    for (const across of [true, false]) {
      let pen = false;
      for (let s = -100; s <= 100; s += 5) {
        const x = across ? s : c;
        const y = across ? c : s;
        if (x * x + y * y > 97 * 97) {
          pen = false;
          continue;
        }
        d += (pen ? "L" : "M") + warp(x, y);
        pen = true;
      }
    }
  }
  return d;
})();

const Sheet = memo(function Sheet() {
  return (
    <svg aria-hidden className="pg-well-sheet" viewBox="-100 -100 200 200">
      <path d={GRID} fill="none" stroke="currentColor" strokeWidth="0.6" />
      {[34, 60, 84].map((r) => (
        <circle key={r} r={r} fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="1.5 3.5" />
      ))}
    </svg>
  );
});
