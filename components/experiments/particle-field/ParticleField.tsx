"use client";
// EXP-02 · Particle Field. ~20k points on wavy threads (10k on touch, ×1.5 in chaos). The pointer
// combs them aside and drags them along; a soft spring brings them home over ~2 s, glowing orange
// while displaced. Click/tap scatters a ring, arrow keys send a sweep through, chaos adds its own gusts.
// The WebGL view (Field.tsx) loads and mounts only while switched on; otherwise a 2D still of the
// field exactly as it was is shown.
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import { pad } from "@/lib/utils";
import { dprCap, fitCanvas, useLocalPointer, type PieceProps } from "../shared";
import { burst, createSim, drawStill, tune as tuning, type Gust, type Input, type Sim } from "./sim";

const Field = dynamic(() => import("./Field"), { ssr: false });

const ARROWS: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };

export default function ParticleField({ active, chaos, reduced, coarse }: PieceProps) {
  const host = useRef<HTMLDivElement>(null);
  const still = useRef<HTMLCanvasElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const sim = useRef<Sim | null>(null);
  const gusts = useRef<Gust[]>([]);
  const input = useRef<Input>({ x: 0, y: 0, on: false, vx: 0, vy: 0 });
  const clock = useRef({ next: 0, frame: 0, shown: "" });
  /** where the press started: a drag that ends on the field is not a click */
  const press = useRef({ x: 0, y: 0 });
  const local = useLocalPointer(host);
  const n = Math.round((coarse ? 10000 : 20000) * (chaos ? 1.5 : 1));
  const tune = useMemo(() => tuning(chaos, reduced, coarse), [chaos, reduced, coarse]);

  const paint = () => {
    const ctx = still.current?.getContext("2d");
    if (ctx && sim.current) drawStill(ctx, sim.current, dprCap(coarse));
  };

  // the field is built for its box: (re)build on resize and when chaos changes the count
  useEffect(() => {
    const el = host.current;
    const c = still.current;
    if (!el || !c) return;
    const size = () => {
      const { w, h } = fitCanvas(c, dprCap(coarse));
      if (w < 2 || h < 2) return;
      sim.current = createSim(w, h, n);
      gusts.current.length = 0;
      paint();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    return () => ro.disconnect();
    // paint reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, coarse]);

  // switched off: freeze the field as a still, exactly where it was
  useEffect(() => {
    if (active) return;
    paint();
    gusts.current.length = 0;
    if (host.current) delete host.current.dataset.live;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /** a sweep across the field along (ax, ay) — keyboard strokes and chaos gusts */
  const sweep = (ax: number, ay: number) => {
    const s = sim.current;
    if (!s) return;
    const L = Math.hypot(s.w, s.h);
    const off = (Math.random() - 0.5) * 0.5 * Math.min(s.w, s.h);
    gusts.current.push({
      x: s.w / 2 - (ax * L) / 2 - ay * off,
      y: s.h / 2 - (ay * L) / 2 + ax * off,
      vx: ax * L * 0.9,
      vy: ay * L * 0.9,
      life: 1 / 0.9,
    });
    s.awake = true;
  };

  const read = (): Input => {
    const p = local();
    const I = input.current;
    I.on = p.inside;
    I.x = p.x;
    I.y = p.y;
    I.vx = pointer.vx * 60;
    I.vy = pointer.vy * 60;
    // chaos: the field gets weather of its own
    const t = performance.now();
    if (chaos && !reduced && t > clock.current.next) {
      clock.current.next = t + 1400 + Math.random() * 2200;
      const a = Math.random() * Math.PI * 2;
      sweep(Math.cos(a), Math.sin(a));
    }
    return I;
  };

  const onFrame = (s: Sim) => {
    const C = clock.current;
    if (++C.frame % 4) return;
    const text = `${pad(s.displaced, 5)} / ${s.n}`;
    const node = count.current?.firstChild;
    if (node && text !== C.shown) (node as Text).data = C.shown = text;
  };

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const s = sim.current;
    if (!s || Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) return;
    const r = e.currentTarget.getBoundingClientRect();
    burst(s, e.clientX - r.left, e.clientY - r.top, chaos ? 1500 : 950);
    play("drop");
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = sim.current;
    const a = ARROWS[e.key];
    if (a) {
      e.preventDefault();
      sweep(a[0], a[1]);
      play("whoosh");
    } else if (s && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      burst(s, s.w / 2, s.h / 2, 950);
      play("drop");
    }
  };

  return (
    <div
      ref={host}
      tabIndex={0}
      role="application"
      aria-roledescription="particle field"
      aria-label="Particle field. Move or drag through it to push the points; they drift back over two seconds. Click or press Enter to scatter them, arrow keys send a sweep through."
      data-arrows="local"
      data-swipe="local"
      data-cursor={coarse ? undefined : "drag"}
      data-cursor-label="DRAG"
      className="xp-pf"
      onPointerDown={(e) => (press.current = { x: e.clientX, y: e.clientY })}
      onClick={onClick}
      onKeyDown={onKey}
    >
      <canvas ref={still} aria-hidden className="xp-pf-still" />
      {active && (
        <Field
          sim={sim}
          gusts={gusts}
          read={read}
          tune={tune}
          host={host}
          reduced={reduced}
          coarse={coarse}
          onFrame={onFrame}
          onReady={() => {
            if (host.current) host.current.dataset.live = "1";
          }}
        />
      )}
      <p aria-hidden className="xp-pf-readout label">
        <span>Displaced </span>
        <span ref={count} className="tabular-nums">
          {"—"}
        </span>
      </p>
      <p aria-hidden className="xp-pf-hint label">
        {coarse ? "Swipe sideways · tap to scatter" : "Click to scatter"}
      </p>
    </div>
  );
}
