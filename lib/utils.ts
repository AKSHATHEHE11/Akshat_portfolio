import { clsx, type ClassValue } from "clsx";

/** Class name joiner. (No tailwind-merge on purpose: write non-conflicting classes.) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Map v from [inMin,inMax] to [outMin,outMax] (unclamped). */
export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

/** 7 → "07" */
export const pad = (n: number, size = 2) => String(n).padStart(size, "0");

/** Deterministic pseudo-random in [0,1) from an integer seed (stable across SSR + client). */
export function seeded(seed: number) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const isExternal = (href: string) => /^(https?:|mailto:|tel:)/.test(href);
