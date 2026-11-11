"use client";
// Small animation helpers for the chrome every page loads (nav, toasts, sheets, panels), so motion/react
// stays out of the shared bundle: motion's springs as WAAPI `linear()` easings, keep-mounted-until-exited
// presence, and motion's layoutId (one element that glides between parents). All WAAPI, no per-frame JS.
// Reduced motion follows MotionConfig "user": callers drop transforms and keep opacity.
import { useCallback, useState } from "react";

/** BEZIER.out / --ease-out-expo */
export const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
/** BEZIER.machine / --ease-machine */
export const EASE_MACHINE = "cubic-bezier(0.7, 0, 0.2, 1)";
/** motion's default for a tween given only a duration ("easeOut") */
export const EASE_TWEEN = "cubic-bezier(0, 0, 0.58, 1)";

export interface Spring {
  /** ms until at rest */
  duration: number;
  /** CSS linear() easing for WAAPI */
  easing: string;
  /** the same curve as a function of progress 0–1 */
  ease: (t: number) => number;
}

const springs = new Map<string, Spring>();

/** motion's physical spring (from rest, 0 → 1), sampled per 60fps frame until it settles. */
export function spring({ stiffness, damping, mass = 1 }: { stiffness: number; damping: number; mass?: number }): Spring {
  const key = `${stiffness}/${damping}/${mass}`;
  const hit = springs.get(key);
  if (hit) return hit;
  const pts = [0];
  const steps = 8;
  const dt = 1 / 60 / steps;
  let x = 0;
  let v = 0;
  while (pts.length < 240 && (Math.abs(1 - x) > 0.003 || Math.abs(v) > 0.03)) {
    for (let i = 0; i < steps; i++) {
      v += ((stiffness * (1 - x) - damping * v) / mass) * dt;
      x += v * dt;
    }
    pts.push(x);
  }
  pts[pts.length - 1] = 1;
  const n = pts.length - 1;
  const s: Spring = {
    duration: (n / 60) * 1000,
    easing: `linear(${pts.map((p) => +p.toFixed(4)).join(", ")})`,
    ease: (t) => {
      const i = Math.min(n, Math.max(0, t) * n);
      const a = Math.floor(i);
      const b = Math.min(n, a + 1);
      return pts[a] + (pts[b] - pts[a]) * (i - a);
    },
  };
  springs.set(key, s);
  return s;
}

/** The element's current computed values for `props` — the start of an animation that may interrupt another. */
export function current(el: Element, props: string[]): Keyframe {
  const cs = getComputedStyle(el);
  return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`))]));
}

/** The element's script (WAAPI) animations — never its CSS transitions/animations. */
export const scripted = (el: Element) =>
  el.getAnimations().filter((a) => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation));

/** Like AnimatePresence for one child: stays mounted after `open` turns false until `done()` (exit finished). */
export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const done = useCallback(() => setMounted(false), []);
  return { mounted: open || mounted, done };
}

/** in-flight glides: what the corner radius is doing, so an interrupted flight hands over the radius it shows */
const flights = new WeakMap<Element, { anims: Animation[]; r0: number; r1: number; s: Spring }>();
const radiusOf = (el: Element) => {
  const f = flights.get(el);
  const t = f?.anims[0]?.currentTime;
  if (f && typeof t === "number") return f.r0 + (f.r1 - f.r0) * f.s.ease(Math.min(1, t / f.s.duration));
  return parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
};

/**
 * motion's `layoutId` for one element rendered in different places (nav marker, tab pill): give the returned
 * ref to whichever copy is mounted. The outgoing copy's box is recorded as it detaches (it is kept until the
 * next copy mounts, however late — a route change can commit the two in separate passes); the incoming copy
 * flies in from there on the spring (null = jump), corner radius corrected so scaling never stretches it.
 * The flight is WAAPI: the transform runs on the compositor, and it starts on the first frame that paints —
 * a route change that blocks the main thread right after the swap can't eat the slide.
 */
export function sharedElement(getSpring: () => Spring | null) {
  let last: { box: DOMRect; r: number } | null = null;
  return (el: HTMLElement | null) => {
    if (!el) return;
    const from = last;
    last = null;
    const s = getSpring();
    if (from && s) fly(el, from.box, from.r, s);
    return () => {
      last = { box: el.getBoundingClientRect(), r: radiusOf(el) };
      flights.get(el)?.anims.forEach((a) => a.cancel());
    };
  };
}

function fly(el: HTMLElement, box: DOMRect, r0: number, s: Spring) {
  // measure where it really sits (a previous flight may still hold it mid-air)
  flights.get(el)?.anims.forEach((a) => a.cancel());
  flights.delete(el);
  const to = el.getBoundingClientRect();
  if (!to.width || !to.height) return;
  const r1 = radiusOf(el);
  const dx = box.left + box.width / 2 - (to.left + to.width / 2);
  const dy = box.top + box.height / 2 - (to.top + to.height / 2);
  const sx = box.width / to.width;
  const sy = box.height / to.height;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
  const nz = (v: number) => (Math.abs(v) < 0.01 ? 0.01 : v);
  // one keyframe per 60fps frame of the spring: box mixed from old to new, radius mixed and un-scaled
  const n = Math.max(2, Math.round((s.duration / 1000) * 60));
  const moves: Keyframe[] = [];
  const corners: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const p = s.ease(i / n);
    const w = nz(sx + (1 - sx) * p);
    const h = nz(sy + (1 - sy) * p);
    const r = Math.max(0, r0 + (r1 - r0) * p);
    moves.push({ transform: `translate(${dx * (1 - p)}px, ${dy * (1 - p)}px) scale(${w}, ${h})` });
    corners.push({ borderRadius: `${r / Math.abs(w)}px / ${r / Math.abs(h)}px` });
  }
  // separate animations, so the transform one stays compositor-only
  const anims = [el.animate(moves, s.duration), el.animate(corners, s.duration)];
  flights.set(el, { anims, r0, r1, s });
  anims[0].onfinish = () => {
    if (flights.get(el)?.anims === anims) flights.delete(el);
  };
}
