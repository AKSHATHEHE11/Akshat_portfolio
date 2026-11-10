// The instrument's vocabulary: every control's range, the REC naming, "randomise within taste" and
// the saved-memory format. Pure functions with no runtime imports (the self-check loads this file
// straight into node: node components/worlds/lab/patch.check.mjs).
import type { ParamKey, Patch, SwitchKey } from "./scene";

export interface ParamSpec {
  key: ParamKey;
  label: string;
  min: number;
  max: number;
  /** keyboard step (PageUp/PageDown = ×10) */
  step: number;
  kind: "knob" | "fader";
  /** hue wraps around instead of stopping */
  wrap?: boolean;
  fmt: (v: number) => string;
}

const fixed = (d: number, unit = "") => (v: number) => v.toFixed(d) + unit;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Output levels the CRUSH fader leaves per channel (2 = one-bit dither). Shared with the shader. */
export const levels = (crush: number) => Math.round(40 - 38 * Math.pow(crush, 0.6));

export const PARAMS: ParamSpec[] = [
  { key: "warp", label: "Warp", min: 0, max: 2.5, step: 0.02, kind: "knob", fmt: fixed(2) },
  { key: "scale", label: "Scale", min: 0.6, max: 6, step: 0.05, kind: "knob", fmt: fixed(1, "×") },
  { key: "detail", label: "Detail", min: 1, max: 7, step: 0.1, kind: "knob", fmt: fixed(1, " oct") },
  { key: "flow", label: "Flow", min: 0, max: 2, step: 0.02, kind: "knob", fmt: fixed(2) },
  { key: "hue", label: "Hue", min: 0, max: 1, step: 0.01, kind: "knob", wrap: true, fmt: (v) => `${Math.round(v * 360)}°` },
  { key: "spread", label: "Spread", min: 0.2, max: 2.4, step: 0.02, kind: "knob", fmt: fixed(2) },
  { key: "feed", label: "Feed", min: 0, max: 0.96, step: 0.01, kind: "fader", fmt: pct },
  { key: "crush", label: "Crush", min: 0, max: 1, step: 0.01, kind: "fader", fmt: (v) => (v < 0.005 ? "off" : `${levels(v)} lv`) },
  { key: "grain", label: "Grain", min: 0, max: 1, step: 0.01, kind: "fader", fmt: pct },
  { key: "pixel", label: "Pixel", min: 2, max: 12, step: 1, kind: "fader", fmt: (v) => `${Math.round(v)} px` },
];

export const SWITCHES: { key: SwitchKey; label: string; on: string; off: string }[] = [
  { key: "mirror", label: "Mirror", on: "Folded", off: "Flat" },
  { key: "polar", label: "Polar", on: "Rings", off: "Grid" },
];

export const spec = Object.fromEntries(PARAMS.map((p) => [p.key, p])) as Record<ParamKey, ParamSpec>;

export function clampParam(key: ParamKey, v: number) {
  const s = spec[key];
  if (!Number.isFinite(v)) return s.min;
  if (s.wrap) return ((v % 1) + 1) % 1;
  const c = Math.min(s.max, Math.max(s.min, v));
  return key === "pixel" ? Math.round(c) : c;
}

/** 0..1 position of a value inside its range (what knobs and faders draw). */
export const norm = (key: ParamKey, v: number) => (v - spec[key].min) / (spec[key].max - spec[key].min);

export const clonePatch = (p: Patch): Patch => ({ ...p, palette: [...p.palette] });

/** A loose object → a valid patch (missing or broken fields fall back to `base`). */
export function sanitize(raw: unknown, base: Patch): Patch {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = clonePatch(base);
  for (const p of PARAMS) if (typeof o[p.key] === "number") out[p.key] = clampParam(p.key, o[p.key] as number);
  for (const s of SWITCHES) if (typeof o[s.key] === "boolean") out[s.key] = o[s.key] as boolean;
  const pal = o.palette;
  if (Array.isArray(pal) && pal.length === 12 && pal.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 4))
    out.palette = [...pal] as number[];
  return out;
}

/** FNV-1a over the rounded values: the same patch always gets the same name. */
export function hashPatch(p: Patch) {
  const parts = [...PARAMS.map((s) => p[s.key].toFixed(2)), p.mirror ? 1 : 0, p.polar ? 1 : 0, ...p.palette.map((n) => n.toFixed(2))];
  let h = 0x811c9dc5;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** "Velvet Moth 041" — adjective + noun + number, picked by the patch's hash; bumped past names already taken. */
export function nameFor(p: Patch, words: { adjectives: string[]; nouns: string[] }, taken: string[] = []) {
  const h = hashPatch(p);
  const adj = words.adjectives[h % words.adjectives.length];
  const noun = words.nouns[Math.floor(h / 97) % words.nouns.length];
  let n = Math.floor(h / 9973) % 1000;
  const used = new Set(taken);
  let name = `${adj} ${noun} ${String(n).padStart(3, "0")}`;
  while (used.has(name)) {
    n = (n + 1) % 1000;
    name = `${adj} ${noun} ${String(n).padStart(3, "0")}`;
  }
  return name;
}

/** Ranges that tend to look good: wide enough to surprise, narrow enough to never be mud. */
const TASTE: Record<ParamKey, [number, number]> = {
  warp: [0.5, 1.9],
  scale: [1.3, 3.8],
  detail: [3.5, 6.5],
  flow: [0.18, 0.95],
  hue: [0, 1],
  spread: [0.7, 1.45],
  feed: [0.35, 0.88],
  crush: [0, 0.75],
  grain: [0.08, 0.5],
  pixel: [2, 5],
};

/** "Randomise within taste": a palette from the factory bank, every control somewhere sensible. */
export function taste(palettes: number[][], rnd: () => number = Math.random): Patch {
  const pick = (k: ParamKey) => {
    const [a, b] = TASTE[k];
    return clampParam(k, a + (b - a) * rnd());
  };
  const out = Object.fromEntries(PARAMS.map((p) => [p.key, pick(p.key)])) as Record<ParamKey, number>;
  if (rnd() < 0.35) out.feed = 0;
  if (rnd() < 0.3) out.crush = 0;
  return {
    ...out,
    mirror: rnd() < 0.25,
    polar: rnd() < 0.15,
    palette: [...palettes[Math.floor(rnd() * palettes.length) % palettes.length]],
  };
}

/* ── memory: what REC keeps in localStorage ── */

export interface Saved {
  id: string;
  name: string;
  /** ms since epoch */
  at: number;
  patch: Patch;
}

export const MEMORY_KEY = "nullfield:memory:v1";
export const MEMORY_MAX = 24;

/** Whatever is in storage (possibly edited by hand, or from an older build) → a clean list. */
export function parseMemory(json: string | null, base: Patch): Saved[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: Saved[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { id, name, at, patch } = item as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 40 || ids.has(id)) continue;
    if (typeof name !== "string" || !name.trim()) continue;
    ids.add(id);
    out.push({ id, name: name.trim().slice(0, 40), at: typeof at === "number" && Number.isFinite(at) ? at : 0, patch: sanitize(patch, base) });
  }
  return out.slice(-MEMORY_MAX);
}

/** Cosine palette at t (0..1) as an "rgb(…)" string — the poster and the no-WebGL fallback use it. */
export function paletteAt(pal: number[], t: number, hue = 0) {
  const ch = (i: number) => {
    const v = pal[i] + pal[i + 3] * Math.cos(2 * Math.PI * (pal[i + 6] * t + pal[i + 9] + hue));
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  return `rgb(${ch(0)} ${ch(1)} ${ch(2)})`;
}
