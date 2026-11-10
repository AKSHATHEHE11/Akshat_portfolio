// Bugs as DOM sprites (no React per bug): <button>s in a mat-wide layer, moved by transform from the
// shared GSAP ticker, which only runs while at least one bug or splat animation is alive.
// Bugs wander in short darts toward targets inside the visible part of the mat, and fall into the
// gravity well if they stray too close (lab.well).
import { gsap } from "@/lib/gsap";
import { lab, visibleMat } from "../lab";

export type BugKind = "game" | "stray";
interface Bug {
  el: HTMLButtonElement;
  kind: BugKind;
  x: number;
  y: number;
  a: number;
  speed: number;
  tx: number;
  ty: number;
  /** ms left in the current pause (bugs stop and start) */
  rest: number;
  leaving: boolean;
  scale: number;
}
export type Swarm = ReturnType<typeof createSwarm>;

const TAU = Math.PI * 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// 11 × 8 pixel bug, two walk frames (legs swap). Drawn heading right (+x).
const BODY = "M3 2h5v1h1v2h-1v1h-5v-1h-1v-2h1zM9 3h1v2h-1z";
const LEGS_A = "M2 1h1v1h-1zM5 1h1v1h-1zM8 6h1v1h-1zM2 6h1v1h-1zM5 6h1v1h-1zM8 1h1v1h-1z";
const LEGS_B = "M1 1h1v1h-1zM4 0h1v1h-1zM7 1h1v1h-1zM1 6h1v1h-1zM4 7h1v1h-1zM7 6h1v1h-1z";
const EYES = "M9 3h1v0.6h-1zM9 4.4h1v0.6h-1z";
const SPRITE = `<svg viewBox="0 0 11 8" aria-hidden="true" shape-rendering="crispEdges"><path class="pg-bug-a" d="${LEGS_A}"/><path class="pg-bug-b" d="${LEGS_B}"/><path d="${BODY}"/><path class="pg-bug-eye" d="${EYES}"/></svg>`;
const SPLAT = `<svg viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges"><path d="M4 4h4v4h-4zM5 2h2v2h-2zM2 5h2v2h-2zM8 5h2v2h-2zM5 8h2v2h-2zM1 1h1v1h-1zM10 2h1v1h-1zM1 10h1v1h-1zM9 10h2v1h-2zM3 3h1v1h-1zM8 8h1v1h-1z"/></svg>`;

export function createSwarm(layer: HTMLElement, opts: { coarse: boolean; onSquash: (kind: BugKind, x: number, y: number) => void }) {
  const bugs = new Set<Bug>();
  const byEl = new Map<Element, Bug>();
  let chaos = false;
  let running = false;
  const size = opts.coarse ? 1.25 : 1;

  function pickTarget(b: Bug) {
    const v = visibleMat();
    const m = 60;
    b.tx = rand(m, Math.max(m + 1, v.w - m));
    b.ty = rand(v.y + m, Math.max(v.y + m + 1, v.y + v.h - m));
  }

  function spawn(kind: BugKind, at?: { x: number; y: number }) {
    const v = visibleMat();
    if (v.h < 40) return;
    const el = document.createElement("button");
    el.type = "button";
    el.className = `pg-bug pg-bug-${kind}`;
    el.setAttribute("aria-label", kind === "game" ? "Bug. Squash it." : "Stray bug. Squash it.");
    el.innerHTML = SPRITE;
    let x: number;
    let y: number;
    if (at) {
      x = at.x + rand(-12, 12);
      y = at.y + rand(-12, 12);
    } else {
      // crawl in from an edge: the mat's sides, or the parts of the mat scrolled out of view
      const side = Math.floor(Math.random() * 4);
      x = side === 0 ? -20 : side === 1 ? v.w + 20 : rand(40, v.w - 40);
      y = side === 2 ? v.y - 20 : side === 3 ? v.y + v.h + 20 : rand(v.y + 40, v.y + v.h - 40);
    }
    const b: Bug = { el, kind, x, y, a: rand(0, TAU), speed: rand(70, 120) * (opts.coarse ? 0.8 : 1), tx: 0, ty: 0, rest: 0, leaving: false, scale: size };
    pickTarget(b);
    b.a = Math.atan2(b.ty - y, b.tx - x);
    layer.appendChild(el);
    bugs.add(b);
    byEl.set(el, b);
    place(b);
    start();
  }

  function place(b: Bug) {
    b.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) rotate(${b.a.toFixed(3)}rad) scale(${b.scale.toFixed(3)})`;
  }

  function remove(b: Bug) {
    bugs.delete(b);
    byEl.delete(b.el);
    // keep focus on the hunt: hand it to the next bug instead of dropping it on <body>
    const hadFocus = document.activeElement === b.el;
    b.el.remove();
    if (hadFocus) [...bugs].find((n) => !n.leaving)?.el.focus({ preventScroll: true });
  }

  function squash(b: Bug) {
    if (b.leaving) return;
    const splat = document.createElement("span");
    splat.className = `pg-splat pg-splat-${b.kind}`;
    splat.innerHTML = SPLAT;
    splat.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) rotate(${(Math.random() * TAU).toFixed(2)}rad) scale(${size})`;
    layer.appendChild(splat);
    window.setTimeout(() => splat.remove(), 3200);
    remove(b);
    opts.onSquash(b.kind, b.x, b.y);
  }

  function update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    const well = lab.well && { x: lab.well.x - lab.mat.left, y: lab.well.y - lab.mat.top, r: lab.well.r };
    const fast = chaos ? 1.4 : 1;
    for (const b of bugs) {
      let speed = b.speed * fast;
      if (b.leaving) speed *= 2.2;
      else if (b.rest > 0) {
        b.rest -= dtMs;
        speed = 0;
      } else if (Math.random() < dt * 0.5) b.rest = rand(250, 800);

      let tx = b.tx;
      let ty = b.ty;
      if (well) {
        const d = Math.hypot(well.x - b.x, well.y - b.y);
        if (d < well.r) {
          // caught: spiral in, shrink, gone
          tx = well.x + Math.cos(b.a + 1.4) * d * 0.4;
          ty = well.y + Math.sin(b.a + 1.4) * d * 0.4;
          speed = Math.max(speed, 90) * 1.3;
          b.rest = 0;
          b.scale = size * Math.max(0.15, d / well.r);
          if (d < 10) {
            remove(b);
            continue;
          }
        } else if (b.scale !== size) b.scale = size;
      }
      const want = Math.atan2(ty - b.y, tx - b.x);
      const turn = wrap(want - b.a);
      b.a += Math.max(-4 * dt, Math.min(4 * dt, turn)) + (Math.random() - 0.5) * 0.6 * dt * 6;
      b.x += Math.cos(b.a) * speed * dt;
      b.y += Math.sin(b.a) * speed * dt;
      if (!b.leaving && Math.hypot(b.tx - b.x, b.ty - b.y) < 24) pickTarget(b);
      if (b.leaving && (b.x < -60 || b.x > lab.mat.w + 60 || Math.hypot(b.tx - b.x, b.ty - b.y) < 20)) {
        remove(b);
        continue;
      }
      place(b);
    }
    if (!bugs.size) stop();
  }

  function start() {
    if (running) return;
    running = true;
    gsap.ticker.add(update);
  }
  function stop() {
    if (!running) return;
    running = false;
    gsap.ticker.remove(update);
  }

  const onDown = (e: PointerEvent) => {
    const el = (e.target as Element).closest(".pg-bug");
    const b = el && byEl.get(el);
    if (!b) return;
    e.preventDefault(); // no focus ring flash, no text selection
    squash(b);
  };
  // keyboard: Enter / Space on a focused bug (a pointer squash never reaches click — the bug is gone)
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element).closest(".pg-bug");
    const b = el && byEl.get(el);
    if (b && e.detail === 0) squash(b);
  };
  layer.addEventListener("pointerdown", onDown);
  layer.addEventListener("click", onClick);

  return {
    spawn,
    count: (kind?: BugKind) => [...bugs].filter((b) => !b.leaving && (!kind || b.kind === kind)).length,
    setChaos(on: boolean) {
      chaos = on;
    },
    /** Everyone of this kind runs for the nearest side of the mat. */
    scatter(kind?: BugKind) {
      for (const b of bugs) {
        if (kind && b.kind !== kind) continue;
        b.leaving = true;
        b.rest = 0;
        b.tx = b.x < lab.mat.w / 2 ? -80 : lab.mat.w + 80;
        b.ty = b.y + rand(-80, 80);
        b.el.tabIndex = -1;
      }
    },
    destroy() {
      stop();
      layer.removeEventListener("pointerdown", onDown);
      layer.removeEventListener("click", onClick);
      for (const b of bugs) b.el.remove();
      bugs.clear();
      byEl.clear();
      layer.querySelectorAll(".pg-splat").forEach((s) => s.remove());
    },
  };
}
