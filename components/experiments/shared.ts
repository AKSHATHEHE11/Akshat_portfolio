"use client";
// Shared plumbing for the six specimens: the props every piece takes, the DPR cap, the house
// colours used inside the (always dark) instrument screens, and a per-frame-safe local pointer.
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useLenis } from "lenis/react";
import { pointer } from "@/lib/pointer";

export interface PieceProps {
  /** this specimen is the one switched on AND it is on screen — run loops only while true */
  active: boolean;
  chaos: boolean;
  reduced: boolean;
  coarse: boolean;
  /** experiment title (data/experiments.ts) — some pieces print it */
  title: string;
  year: number;
}

export const INK = "#111111";
export const SCREEN = "#0b0b0a";
export const CREAM = "#f2eee7";
export const ORANGE = "#ff5a1f";
export const LIME = "#d8ff00";

/** Canvas/WebGL pixel ratio: 1.5 at most, 1.25 on touch devices (BRIEF §5b). */
export const dprCap = (coarse: boolean) => Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);

/** A CSS custom property's value from <html> (font stacks for canvas text). */
export const cssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Lenis' scroll (a plain JS number); window.scrollY only before Lenis exists. */
const scrolled = (l: { scroll: number } | undefined) => l?.scroll ?? window.scrollY;

export interface Local {
  /** pointer in the element's own px */
  x: number;
  y: number;
  w: number;
  h: number;
  inside: boolean;
}

/**
 * The shared pointer (lib/pointer) in an element's local px, readable every frame without a layout
 * read: the element's document rect is cached on resize / pointerenter / fullscreen, and the live
 * scroll offset comes from Lenis (BRIEF §5b rule 2).
 */
export function useLocalPointer(ref: RefObject<HTMLElement | null>) {
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const box = useRef({ left: 0, top: 0, w: 0, h: 0 });
  const out = useRef<Local>({ x: -1e4, y: -1e4, w: 0, h: 0, inside: false });

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      box.current = { left: r.left, top: r.top + scrolled(lenisRef.current), w: r.width, h: r.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("pointerenter", measure);
    el.addEventListener("pointerdown", measure);
    document.addEventListener("fullscreenchange", measure);
    return () => {
      ro.disconnect();
      el.removeEventListener("pointerenter", measure);
      el.removeEventListener("pointerdown", measure);
      document.removeEventListener("fullscreenchange", measure);
    };
  }, [ref]);

  return useCallback((): Local => {
    const b = box.current;
    const o = out.current;
    o.x = pointer.x - b.left;
    o.y = pointer.y - (b.top - scrolled(lenisRef.current));
    o.w = b.w;
    o.h = b.h;
    o.inside = pointer.inside && o.x >= 0 && o.y >= 0 && o.x <= b.w && o.y <= b.h;
    return o;
  }, []);
}

/** Size a canvas' backing store to its CSS box × dpr. Returns the CSS size. Call from a ResizeObserver, never per frame. */
export function fitCanvas(c: HTMLCanvasElement, dpr: number) {
  const w = c.clientWidth;
  const h = c.clientHeight;
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  return { w, h };
}
