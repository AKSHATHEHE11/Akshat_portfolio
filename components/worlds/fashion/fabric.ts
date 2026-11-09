"use client";
// Procedural fabric: draws a seamless woven/knitted texture on a 2D canvas, thread by thread.
// Used by the cloth shader (as a CanvasTexture), the fabric swatches, colour chips and loupes.
import { useEffect, useState } from "react";
import { seeded } from "@/lib/utils";
import { ECRU, hexToRgb, mix, type RGB } from "./kit";
import type { Colourway, Weave } from "./scene";

export interface FabricSpec {
  warp: string;
  weft?: string;
  weave?: Weave;
  /** canvas size in px — keep a multiple of 48 so every weave repeat tiles */
  size?: number;
  /** washed-out highlights 0..1 */
  fade?: number;
}

const TAU = Math.PI * 2;

/** weft colour for a colourway: explicit, else undyed ecru for twills, else a darker tone of the dye */
export const weftFor = (c: Colourway, weave: Weave) =>
  c.weft ?? (weave.startsWith("twill") ? ECRU : mix(c.hex, "#000000", 0.16));

export function drawFabric({ warp, weft = ECRU, weave = "twill-3x1", size = 192, fade = 0.18 }: FabricSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  const W: RGB = hexToRgb(warp);
  const F: RGB = hexToRgb(weft);
  // twill weft sits under the indigo: it reads dimmer than the bare yarn
  const Fc: RGB = [F[0] * 0.72 + W[0] * 0.28, F[1] * 0.72 + W[1] * 0.28, F[2] * 0.72 + W[2] * 0.28];
  const cell = weave === "jersey" ? 6 : 4;
  const n = Math.ceil(size / cell);
  // per-thread irregularity (slub) — stable per thread index so the tile repeats cleanly
  const warpVar = Array.from({ length: n }, (_, i) => 0.84 + seeded(i * 7 + 3) * 0.26);
  const weftVar = Array.from({ length: n }, (_, j) => 0.9 + seeded(j * 13 + 11) * 0.16);
  const phase = Array.from({ length: n }, (_, i) => seeded(i * 31 + 5) * TAU);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = Math.floor(x / cell);
      const j = Math.floor(y / cell);
      const u = ((x % cell) + 0.5) / cell;
      const v = ((y % cell) + 0.5) / cell;
      let warpUp: boolean;
      let shade: number;
      if (weave === "twill-3x1") warpUp = (i + j) % 4 !== 0; // weft shows on a rising diagonal (RHT)
      else if (weave === "twill-2x1") warpUp = (((i - j) % 3) + 3) % 3 !== 0; // falling diagonal (LHT)
      else if (weave === "canvas") warpUp = (i + j) % 2 === 0;
      else warpUp = true;
      // in a twill the weft float is pinched between fat warp yarns: only its middle shows
      const twill = weave.startsWith("twill");
      if (twill && !warpUp && Math.abs(2 * v - 1) > 0.5) warpUp = true;

      if (weave === "jersey") {
        // knitted V loops: two legs per wale meeting at the bottom of the cell
        const leg = Math.abs(Math.abs(u - 0.5) * 2 - (1 - v));
        shade = 0.7 + 0.34 * Math.max(0, 1 - leg / 0.42) - 0.12 * Math.abs(u - 0.5);
      } else {
        // round yarn: darker toward its edges, across the direction it runs
        const across = warpUp ? u : v;
        shade = 1 - (2 * across - 1) ** 2 * 0.38;
      }
      // slow slub/fade variation, periodic over the tile so it stays seamless
      const slub = 1 + 0.07 * Math.sin((y / size) * TAU * 3 + phase[i]);
      const wash = fade * (0.5 + 0.5 * Math.sin((x / size) * TAU * 2 + Math.sin((y / size) * TAU) * 1.4));
      const grain = 0.94 + seeded(x * 9173 + y * 131 + 7) * 0.1;
      const base = warpUp ? W : twill ? Fc : F;
      const k = (warpUp ? warpVar[i] * slub : weftVar[j]) * shade * grain;
      const o = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        let val = base[c] * k;
        if (warpUp) val += (F[c] - val) * wash * 0.45; // indigo wears toward the white core
        img.data[o + c] = val;
      }
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const cache = new Map<string, Promise<string>>();

const keyOf = (s: FabricSpec) => `${s.warp}|${s.weft ?? ""}|${s.weave ?? ""}|${s.size ?? ""}|${s.fade ?? ""}`;

/** Object URL of a fabric tile (cached for the session). */
export function fabricUrl(spec: FabricSpec): Promise<string> {
  const key = keyOf(spec);
  let p = cache.get(key);
  if (!p) {
    p = new Promise<string>((resolve) => {
      const c = drawFabric(spec);
      c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : c.toDataURL()), "image/png");
    });
    cache.set(key, p);
  }
  return p;
}

/** React: fabric tile URL once generated on the client (null during SSR / first paint). */
export function useFabric(spec: FabricSpec | null) {
  const key = spec ? keyOf(spec) : "";
  const [url, setUrl] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!spec) return;
    let alive = true;
    fabricUrl(spec).then((u) => alive && setUrl({ key, url: u }));
    return () => {
      alive = false;
    };
    // spec is described completely by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url && url.key === key ? url.url : null;
}

/** Fabric spec for a product colourway. */
export const specFor = (c: Colourway, weave: Weave, size = 192): FabricSpec => ({
  warp: c.hex,
  weft: weftFor(c, weave),
  weave,
  size,
  fade: weave.startsWith("twill") ? 0.2 : 0.06,
});
