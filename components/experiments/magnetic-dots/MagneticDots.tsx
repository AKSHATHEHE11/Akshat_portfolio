"use client";
// EXP-05 · Magnetic Dots. A dense grid where every dot is a damped spring leaning toward the cursor,
// laid over a 2D wave field: a click drops a stone in it, and the cursor's wake keeps the grid
// "gossiping" for a few seconds after you leave. One canvas, typed arrays, dots batched by colour.
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import { clamp } from "@/lib/utils";
import { CREAM, LIME, ORANGE, SCREEN, dprCap, fitCanvas, useLocalPointer, type PieceProps } from "../shared";

interface Grid {
  cols: number;
  rows: number;
  hx: Float32Array; // rest position
  hy: Float32Array;
  dx: Float32Array; // spring offset
  dy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  h: Float32Array; // wave height, now
  hp: Float32Array; // wave height, previous step
  r: Float32Array; // drawn radius
  b: Uint8Array; // colour bucket
}

function build(w: number, h: number, gap: number): Grid {
  const cols = Math.max(4, Math.floor(w / gap));
  const rows = Math.max(4, Math.floor(h / gap));
  const n = cols * rows;
  const x0 = (w - (cols - 1) * gap) / 2;
  const y0 = (h - (rows - 1) * gap) / 2;
  const g: Grid = {
    cols,
    rows,
    hx: new Float32Array(n),
    hy: new Float32Array(n),
    dx: new Float32Array(n),
    dy: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    h: new Float32Array(n),
    hp: new Float32Array(n),
    r: new Float32Array(n),
    b: new Uint8Array(n),
  };
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      g.hx[j * cols + i] = x0 + i * gap;
      g.hy[j * cols + i] = y0 + j * gap;
    }
  return g;
}

const BUCKETS = ["rgb(242 238 231 / 0.4)", CREAM, LIME, ORANGE];

export default function MagneticDots({ active, chaos, reduced, coarse }: PieceProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const local = useLocalPointer(wrap);
  const st = useRef({
    grid: null as Grid | null,
    w: 0,
    h: 0,
    dpr: 1,
    gap: 18,
    /** keyboard magnet (focus + arrows) */
    key: { x: 0, y: 0, on: false },
    polarity: 1,
    flipAt: 0,
    nextStone: 0,
  });

  // drop a stone at (x, y) px
  const stone = (x: number, y: number, amp = 7) => {
    const S = st.current;
    const g = S.grid;
    if (!g) return;
    const ci = Math.round((x - g.hx[0]) / S.gap);
    const cj = Math.round((y - g.hy[0]) / S.gap);
    for (let j = cj - 3; j <= cj + 3; j++)
      for (let i = ci - 3; i <= ci + 3; i++) {
        if (i < 1 || j < 1 || i >= g.cols - 1 || j >= g.rows - 1) continue;
        const d2 = (i - ci) ** 2 + (j - cj) ** 2;
        g.h[j * g.cols + i] += amp * Math.exp(-d2 / 2.2);
      }
  };

  const draw = () => {
    const S = st.current;
    const c = canvas.current;
    const g = S.grid;
    const ctx = c?.getContext("2d");
    if (!c || !g || !ctx) return;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.fillStyle = SCREEN;
    ctx.fillRect(0, 0, S.w, S.h);
    const n = g.hx.length;
    for (let b = 0; b < BUCKETS.length; b++) {
      ctx.fillStyle = BUCKETS[b];
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        if (g.b[k] !== b) continue;
        const x = g.hx[k] + g.dx[k];
        const y = g.hy[k] + g.dy[k];
        ctx.moveTo(x + g.r[k], y);
        ctx.arc(x, y, g.r[k], 0, Math.PI * 2);
      }
      ctx.fill();
    }
  };

  // size, (re)build the grid and draw its still frame — resize only
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const S = st.current;
    const size = () => {
      S.dpr = dprCap(coarse);
      const { w, h } = fitCanvas(c, S.dpr);
      S.w = w;
      S.h = h;
      S.gap = coarse || w < 640 ? 21 : 17;
      S.grid = build(w, h, S.gap);
      S.key = { x: w / 2, y: h / 2, on: S.key.on };
      const g = S.grid;
      g.r.fill(1.5);
      g.b.fill(0);
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(c);
    return () => ro.disconnect();
  }, [coarse]);

  // the loop
  useEffect(() => {
    if (!active) return;
    const S = st.current;
    const K = chaos ? 210 : 140;
    const D = chaos ? 7 : 11;
    const R = chaos ? 210 : 150;
    const C2 = 0.2;
    const tick = (time: number, deltaMs: number) => {
      const g = S.grid;
      if (!g) return;
      const t = time * 1000;
      const dt = Math.min(deltaMs, 50) / 1000;
      const p = local();
      const { cols, rows } = g;
      const n = cols * rows;

      // where attention is: the pointer, the keyboard magnet, or (idle) a slow wander
      let mx = -1e4;
      let my = -1e4;
      let pull = 0;
      if (p.inside) {
        mx = p.x;
        my = p.y;
        pull = 1;
      } else if (S.key.on) {
        mx = S.key.x;
        my = S.key.y;
        pull = 1;
      } else if (!reduced) {
        mx = S.w * (0.5 + 0.34 * Math.sin(t * 0.00041));
        my = S.h * (0.5 + 0.3 * Math.sin(t * 0.00057 + 1.3));
        pull = 0.45;
      }
      // chaos: the magnet keeps changing its mind, and stones fall on their own
      if (chaos && !reduced) {
        if (t > S.flipAt) {
          S.polarity = -S.polarity;
          S.flipAt = t + (S.polarity > 0 ? 1600 + Math.random() * 1800 : 700 + Math.random() * 600);
        }
        if (t > S.nextStone) {
          S.nextStone = t + 500 + Math.random() * 900;
          stone(Math.random() * S.w, Math.random() * S.h, 5);
        }
      } else S.polarity = 1;

      // the cursor's wake seeds small waves: the grid keeps talking about it afterwards
      if (p.inside && !reduced && pointer.speed > 1.5) {
        const ci = Math.round((p.x - g.hx[0]) / S.gap);
        const cj = Math.round((p.y - g.hy[0]) / S.gap);
        if (ci > 0 && cj > 0 && ci < cols - 1 && cj < rows - 1) g.h[cj * cols + ci] -= Math.min(pointer.speed, 40) * 0.03;
      }

      // wave field: propagate (or, reduced motion, only fade in place)
      if (reduced) {
        for (let k = 0; k < n; k++) g.h[k] *= 0.92;
      } else {
        const damp = chaos ? 0.988 : 0.982;
        const { h, hp } = g;
        for (let j = 1; j < rows - 1; j++)
          for (let i = 1; i < cols - 1; i++) {
            const k = j * cols + i;
            hp[k] = (2 * h[k] - hp[k] + C2 * (h[k - 1] + h[k + 1] + h[k - cols] + h[k + cols] - 4 * h[k])) * damp;
          }
        g.h = hp;
        g.hp = h;
      }

      const damp = Math.exp(-D * dt);
      const h = g.h;
      for (let k = 0; k < n; k++) {
        const ex = mx - g.hx[k];
        const ey = my - g.hy[k];
        const dist = Math.sqrt(ex * ex + ey * ey);
        const f0 = dist < R ? 1 - dist / R : 0;
        const f = f0 * f0 * pull;
        const i = k % cols;
        const gx = i > 0 && i < cols - 1 ? h[k + 1] - h[k - 1] : 0;
        const gy = k >= cols && k < n - cols ? h[k + cols] - h[k - cols] : 0;
        const tx = ex * f * 0.4 * S.polarity - gx * 3.2;
        const ty = ey * f * 0.4 * S.polarity - gy * 3.2;
        if (reduced) {
          g.dx[k] = tx;
          g.dy[k] = ty;
        } else {
          g.vx[k] = (g.vx[k] + (tx - g.dx[k]) * K * dt) * damp;
          g.vy[k] = (g.vy[k] + (ty - g.dy[k]) * K * dt) * damp;
          g.dx[k] += g.vx[k] * dt;
          g.dy[k] += g.vy[k] * dt;
        }
        const a = Math.abs(h[k]);
        g.r[k] = Math.min(5.4, 1.5 + f * 3.4 + a * 0.9);
        g.b[k] = a > 0.55 ? 3 : f > 0.42 ? 2 : f > 0.06 || a > 0.12 ? 1 : 0;
      }
      draw();
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active, chaos, reduced, local]);

  // a click (or a tap — a swipe that scrolls never becomes one) drops a stone where it landed
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    stone(e.clientX - r.left, e.clientY - r.top);
    play("drop");
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const S = st.current;
    const step = 36;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      S.key.x = clamp(S.key.x + m[0], 0, S.w);
      S.key.y = clamp(S.key.y + m[1], 0, S.h);
      play("tick");
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      stone(S.key.x, S.key.y);
      play("drop");
    }
  };

  return (
    <div
      ref={wrap}
      tabIndex={0}
      role="application"
      aria-roledescription="dot grid"
      aria-label="Magnetic dot grid. Move over it to pull the dots, click or press Enter to drop a ripple. Arrow keys move the magnet."
      data-arrows="local"
      data-cursor={coarse ? undefined : "hover"}
      className="absolute inset-0 outline-offset-[-3px]"
      style={{ touchAction: "pan-y" }}
      onClick={onClick}
      onFocus={(e) => (st.current.key.on = e.currentTarget.matches(":focus-visible"))}
      onBlur={() => (st.current.key.on = false)}
      onKeyDown={onKey}
    >
      <canvas ref={canvas} aria-hidden className="block size-full" />
    </div>
  );
}
