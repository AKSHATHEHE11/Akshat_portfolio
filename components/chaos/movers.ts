// [data-chaos-drift] wobbles; [data-chaos-escape] dodges the cursor now and then.
//
// Both write the individual CSS `translate` / `rotate` properties, never `transform`, so they compose
// with whatever GSAP / Motion is already doing to the element. Tailwind v4 also uses `translate` for
// its translate-* utilities, so the computed value at registration is kept as the base and offsets are
// added on top with calc() — a centred `-translate-x-1/2` badge drifts without jumping.
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import { seeded } from "@/lib/utils";

const TAU = Math.PI * 2;
/** an escapee rests this long before it will dodge again */
const COOLDOWN = 4000;

/** "calc(-50% + 2px) 0px" → ["calc(-50% + 2px)", "0px"] — splits on top-level spaces only. */
export function cssParts(v: string) {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of v.trim()) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === " " && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

interface Drift {
  ax: number;
  ay: number;
  ar: number;
  f1: number;
  f2: number;
  f3: number;
  p1: number;
  p2: number;
  p3: number;
}

interface Escape {
  x: number;
  y: number;
  last: number;
  /** one roll of the dice per approach: re-armed once the cursor backs off */
  armed: boolean;
  tl: gsap.core.Timeline | null;
}

export interface Mover {
  el: HTMLElement;
  /** computed `translate` at registration (null = none) */
  base: string[] | null;
  /** computed `rotate`; false = an axis rotation we leave alone */
  rot: string | null | false;
  /** inline values to put back on restore */
  inline: [string, string];
  drift: Drift | null;
  esc: Escape | null;
  wx: number;
  wy: number;
  wr: number;
}

let count = 0;

export function createMover(el: HTMLElement): Mover {
  const cs = getComputedStyle(el);
  const s = ++count * 11;
  const r = (i: number) => seeded(s + i);
  return {
    el,
    base: cs.translate && cs.translate !== "none" ? cssParts(cs.translate) : null,
    rot: !cs.rotate || cs.rotate === "none" ? null : cs.rotate.includes(" ") ? false : cs.rotate,
    inline: [el.style.translate, el.style.rotate],
    drift: el.hasAttribute("data-chaos-drift")
      ? {
          ax: 4 + r(0) * 8,
          ay: 4 + r(1) * 8,
          ar: 0.6 + r(2) * 2,
          f1: 0.45 + r(3) * 0.4,
          f2: 0.35 + r(4) * 0.4,
          f3: 0.3 + r(5) * 0.35,
          p1: r(6) * TAU,
          p2: r(7) * TAU,
          p3: r(8) * TAU,
        }
      : null,
    esc: el.hasAttribute("data-chaos-escape") ? { x: 0, y: 0, last: -1e9, armed: true, tl: null } : null,
    wx: 0,
    wy: 0,
    wr: 0,
  };
}

/** One frame of drift (+ any escape offset), scaled by the global intensity. t in seconds. */
export function stepMover(m: Mover, t: number, amp: number) {
  let dx = 0;
  let dy = 0;
  let dr = 0;
  const d = m.drift;
  if (d) {
    dx = d.ax * (0.75 * Math.sin(t * d.f1 + d.p1) + 0.25 * Math.sin(t * d.f2 * 2.3 + d.p2));
    dy = d.ay * (0.75 * Math.cos(t * d.f2 + d.p2) + 0.25 * Math.sin(t * d.f3 * 1.9 + d.p3));
    dr = d.ar * Math.sin(t * d.f3 + d.p3);
  }
  if (m.esc) {
    dx += m.esc.x;
    dy += m.esc.y;
  }
  write(m, dx * amp, dy * amp, dr * amp);
}

/**
 * Decide whether an escapee dodges this frame (reads only; the dodge itself is a tween the loop
 * picks up). Never while it holds focus, while a button is held, or within the cooldown — so a
 * second approach always lands. Returns true when it jumped.
 */
export function stepEscape(m: Mover, r: DOMRect, now: number, vw: number, vh: number) {
  const e = m.esc;
  if (!e) return false;
  const ox = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
  const oy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
  const dist = Math.hypot(ox, oy);
  if (dist > 64) {
    e.armed = true;
    return false;
  }
  // only an approach from outside counts; a cursor already on it means "about to click"
  if (!e.armed || dist === 0 || dist > 30) return false;
  e.armed = false;
  if (now - e.last < COOLDOWN || pointer.down || pointer.speed < 1 || Math.random() > 0.6 || m.el.matches(":focus-within")) return false;
  e.last = now;

  let ux = r.left + r.width / 2 - pointer.x;
  let uy = r.top + r.height / 2 - pointer.y;
  const len = Math.hypot(ux, uy) || 1;
  ux /= len;
  uy /= len;
  const travel = Math.min(120, Math.max(48, Math.max(r.width, r.height) * 0.8 + 28));
  // stay on screen
  const nx = Math.min(vw - 8 - r.right, Math.max(8 - r.left, ux * travel));
  const ny = Math.min(vh - 8 - r.bottom, Math.max(8 - r.top, uy * travel));
  e.tl?.kill();
  e.tl = gsap
    .timeline()
    .to(e, { x: e.x + nx, y: e.y + ny, duration: 0.22, ease: "expo.out" })
    .to(e, { x: 0, y: 0, duration: 0.7, ease: "snap" }, "+=1.1");
  play("tick");
  return true;
}

export function restoreMover(m: Mover) {
  m.esc?.tl?.kill();
  if (m.esc) m.esc.x = m.esc.y = 0;
  m.el.style.translate = m.inline[0];
  m.el.style.rotate = m.inline[1];
  m.wx = m.wy = m.wr = 0;
}

function write(m: Mover, x: number, y: number, r: number) {
  if (Math.abs(x - m.wx) < 0.05 && Math.abs(y - m.wy) < 0.05 && Math.abs(r - m.wr) < 0.05) return;
  m.wx = x;
  m.wy = y;
  m.wr = r;
  const s = m.el.style;
  const b = m.base;
  if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) s.translate = m.inline[0];
  else if (b) s.translate = `calc(${b[0]} + ${x.toFixed(2)}px) calc(${b[1] ?? "0px"} + ${y.toFixed(2)}px)${b[2] ? ` ${b[2]}` : ""}`;
  else s.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  if (m.rot === false) return;
  if (Math.abs(r) < 0.05) s.rotate = m.inline[1];
  else s.rotate = m.rot ? `calc(${m.rot} + ${r.toFixed(2)}deg)` : `${r.toFixed(2)}deg`;
}
