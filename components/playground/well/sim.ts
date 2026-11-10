// The gravity well's loop: a few loose parts on orbits around a point mass, a probe (cursor, finger
// or arrow keys) that the well bends toward itself and that tugs the parts a little. All in disc-local
// px (centre = 0,0). Runs on the shared GSAP ticker only while the well is on screen; geometry is
// measured on resize, never per frame.
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { lab, setText } from "../lab";

interface Orb {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
}
export type WellSim = ReturnType<typeof createWell>;

const TAU = Math.PI * 2;

export function createWell(
  disc: HTMLElement,
  els: { orbs: HTMLElement[]; probe: HTMLElement; ghost: HTMLElement; core: HTMLElement; count: HTMLElement | null },
  opts: { coarse: boolean; onCapture: () => void },
) {
  let R = 200;
  let cx = 0; // centre, document px
  let cy = 0;
  let running = false;
  let chaos = false;
  let t = 0;
  let pulseUntil = 0;
  let captured = 0;
  let gulp = 0;
  let near = false;
  /** a probe that isn't the mouse (touch, keys), centre-relative, and when it expires */
  let probe: { x: number; y: number; until: number } | null = null;
  const orbs: Orb[] = els.orbs.map((el) => ({ el, x: 0, y: 0, vx: 0, vy: 0 }));
  const GM = () => 0.14 * R * R * R;

  function seat(o: Orb, r = R * (0.42 + Math.random() * 0.48)) {
    const a = Math.random() * TAU;
    const v = Math.sqrt(GM() / r) * (0.92 + Math.random() * 0.16);
    o.x = Math.cos(a) * r;
    o.y = Math.sin(a) * r;
    o.vx = -Math.sin(a) * v;
    o.vy = Math.cos(a) * v;
  }

  function draw(o: Orb) {
    o.el.style.transform = `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) rotate(${Math.atan2(o.vy, o.vx).toFixed(2)}rad)`;
  }

  function measure() {
    const r = disc.getBoundingClientRect();
    const old = R;
    R = r.width / 2 || R;
    cx = r.left + window.scrollX + R;
    cy = r.top + window.scrollY + R;
    lab.well = { x: cx, y: cy, r: R };
    const k = R / old;
    for (const o of orbs) {
      o.x *= k;
      o.y *= k;
      o.vx *= k;
      o.vy *= k;
      draw(o);
    }
  }

  function swallow(o: Orb) {
    captured++;
    setText(els.count, String(captured).padStart(3, "0"));
    els.core.dataset.gulp = ++gulp % 2 ? "a" : "b";
    opts.onCapture();
    seat(o, R * (0.82 + Math.random() * 0.1));
  }

  function frame(_time: number, dtMs: number) {
    const dt = Math.min(dtMs, 40) / 1000;
    t += dt;
    const now = performance.now();

    // where the probe really is, and where the well makes it appear
    let px = NaN;
    let py = NaN;
    if (probe && now < probe.until) {
      px = probe.x;
      py = probe.y;
    } else if (!opts.coarse && pointer.inside) {
      px = pointer.x - cx;
      py = pointer.y - (cy - lab.scroll);
    }
    const d = Math.hypot(px, py);
    const inside = d < R;
    if (inside !== near) {
      near = inside;
      disc.toggleAttribute("data-probe", inside);
    }
    const mass = (now < pulseUntil ? 5 : 1) * (chaos ? 1 + 0.6 * Math.sin(t * 1.3) : 1);
    if (inside) {
      const k = Math.pow(d / R, 0.6 * Math.min(mass, 2.4)) || 0;
      els.ghost.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
      els.probe.style.transform = `translate3d(${(px * k).toFixed(1)}px,${(py * k).toFixed(1)}px,0) scale(${(0.55 + 0.45 * (d / R)).toFixed(2)})`;
    }

    const gm = GM() * mass;
    const soft = (0.08 * R) ** 2;
    const pm = inside ? GM() * 0.35 : 0;
    const psoft = (0.12 * R) ** 2;
    const vmax = 3 * R;
    const h = dt / 2;
    for (const o of orbs) {
      for (let s = 0; s < 2; s++) {
        const r = Math.hypot(o.x, o.y) || 1;
        const a = gm / (r * r + soft);
        let ax = (-o.x / r) * a;
        let ay = (-o.y / r) * a;
        if (pm) {
          const dx = px - o.x;
          const dy = py - o.y;
          const dd = Math.hypot(dx, dy) || 1;
          const ap = pm / (dd * dd + psoft);
          ax += (dx / dd) * ap;
          ay += (dy / dd) * ap;
        }
        o.vx += ax * h;
        o.vy += ay * h;
        const sp = Math.hypot(o.vx, o.vy);
        if (sp > vmax) {
          o.vx *= vmax / sp;
          o.vy *= vmax / sp;
        }
        o.x += o.vx * h;
        o.y += o.vy * h;
      }
      const r = Math.hypot(o.x, o.y) || 1;
      // the rim: bounce back in
      if (r > R * 0.95) {
        o.x *= (R * 0.95) / r;
        o.y *= (R * 0.95) / r;
        const vr = (o.vx * o.x + o.vy * o.y) / (R * 0.95);
        if (vr > 0) {
          o.vx -= (1.6 * vr * o.x) / (R * 0.95);
          o.vy -= (1.6 * vr * o.y) / (R * 0.95);
        }
      }
      // the core: swallowed, counted, and a fresh one falls in from the rim
      if (r < R * 0.07) swallow(o);
      draw(o);
    }
  }

  orbs.forEach((o) => seat(o));
  measure();

  return {
    measure,
    start() {
      if (running) return;
      running = true;
      gsap.ticker.add(frame);
    },
    stop() {
      if (!running) return;
      running = false;
      gsap.ticker.remove(frame);
      if (near) {
        near = false;
        disc.removeAttribute("data-probe");
      }
    },
    setChaos(on: boolean) {
      chaos = on;
    },
    /** Five times the mass for a second: most of what orbits goes in. */
    pulse() {
      pulseUntil = performance.now() + 1100;
      // no loop running (reduced motion): it still eats one, instantly
      if (!running && orbs.length) {
        const o = orbs[Math.floor(Math.random() * orbs.length)];
        swallow(o);
        draw(o);
      }
    },
    /** A probe at viewport (x, y) for a moment (touch). */
    touch(x: number, y: number) {
      probe = { x: x - cx, y: y - (cy - window.scrollY), until: performance.now() + 700 };
    },
    /** Arrow keys steer a probe; it fades two and a half seconds after the last key. */
    steer(dx: number, dy: number) {
      const p = probe && performance.now() < probe.until ? probe : { x: R * 0.6, y: 0, until: 0 };
      const x = p.x + dx * R * 0.09;
      const y = p.y + dy * R * 0.09;
      const r = Math.hypot(x, y);
      const k = r > R * 0.92 ? (R * 0.92) / r : 1;
      probe = { x: x * k, y: y * k, until: performance.now() + 2500 };
    },
    destroy() {
      gsap.ticker.remove(frame);
      running = false;
      lab.well = null;
    },
  };
}
