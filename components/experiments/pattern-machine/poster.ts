// The poster itself: a seeded grid of modules (discs, arcs, bars, leaves…) plus a typeset footer.
// Pure drawing — the screen and the PNG export call the same function at different sizes.
import { pad, seeded } from "@/lib/utils";

export interface Palette {
  name: string;
  /** bg, ink, accent, soft */
  c: [string, string, string, string];
}

export const PALETTES: Palette[] = [
  { name: "Bone", c: ["#f2eee7", "#111111", "#ff5a1f", "#e2dbcd"] },
  { name: "Phosphor", c: ["#111111", "#f2eee7", "#ff5a1f", "#25231f"] },
  { name: "Acid", c: ["#111111", "#d8ff00", "#f2eee7", "#1d2011"] },
  { name: "Signal", c: ["#ff5a1f", "#111111", "#f2eee7", "#f2763f"] },
  { name: "Cobalt", c: ["#2440c4", "#f2eee7", "#d8ff00", "#2d4dd3"] },
  { name: "Newsprint", c: ["#e8e2d7", "#2a2926", "#111111", "#d8d1c3"] },
];

export type RGB = [number, number, number];
export const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB) => `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0})`;

export interface PosterState {
  seed: number;
  /** 0..1 → 3..14 columns */
  density: number;
  /** 0..1 — twist travelling across the grid */
  rotation: number;
  /** 0..1 — jitter, scale, merged and missing cells */
  chaos: number;
  /** current colours (bg, ink, accent, soft) */
  colors: [RGB, RGB, RGB, RGB];
  palette: string;
  /** extra quarter turns per cell (animated, may be fractional) */
  turns: Float32Array;
  title: string;
  year: number;
  fonts: { display: string; mono: string };
}

/** Poster geometry for a W×H box: margin, footer, grid origin and the cell grid (density → 3..14 columns). */
export function layout(W: number, H: number, density: number) {
  const m = W * 0.07;
  const foot = H * 0.17;
  const gw = W - 2 * m;
  const gh = H - m - foot - m * 0.4;
  const cols = Math.round(3 + density * 11);
  const cell = gw / cols;
  const rows = Math.max(1, Math.floor(gh / cell));
  return { m, foot, gw, cols, cell, rows, y0: m + (gh - rows * cell) / 2 };
}

const TAU = Math.PI * 2;
const MOTIFS = 9;

function motif(ctx: CanvasRenderingContext2D, m: number, s: number) {
  const h = s / 2;
  ctx.beginPath();
  switch (m) {
    case 0: // quarter disc
      ctx.moveTo(-h, -h);
      ctx.arc(-h, -h, s, 0, Math.PI / 2);
      ctx.closePath();
      return ctx.fill();
    case 1: // half disc
      ctx.arc(0, -h, h, 0, Math.PI);
      ctx.closePath();
      return ctx.fill();
    case 2: // triangle
      ctx.moveTo(-h, -h);
      ctx.lineTo(h, -h);
      ctx.lineTo(-h, h);
      ctx.closePath();
      return ctx.fill();
    case 3: // dot
      ctx.arc(0, 0, s * 0.3, 0, TAU);
      return ctx.fill();
    case 4: // ring
      ctx.lineWidth = s * 0.11;
      ctx.arc(0, 0, s * 0.3, 0, TAU);
      return ctx.stroke();
    case 5: // three bars
      for (let b = 0; b < 3; b++) ctx.rect(-h, -h + ((b * 2 + 0.5) * s) / 6, s, s / 6);
      return ctx.fill();
    case 6: // truchet arcs
      ctx.lineWidth = s * 0.12;
      ctx.arc(-h, -h, h, 0, Math.PI / 2);
      ctx.moveTo(0, h);
      ctx.arc(h, h, h, Math.PI, Math.PI * 1.5);
      return ctx.stroke();
    case 7: // leaf
      ctx.arc(-h, h, s, -Math.PI / 2, 0);
      ctx.arc(h, -h, s, Math.PI / 2, Math.PI);
      ctx.closePath();
      return ctx.fill();
    default: // plus
      ctx.rect(-s * 0.09, -h * 0.8, s * 0.18, h * 1.6);
      ctx.rect(-h * 0.8, -s * 0.09, h * 1.6, s * 0.18);
      return ctx.fill();
  }
}

/** Draw the whole poster into a W×H box (CSS px or export px — the transform is the caller's). */
export function drawPoster(ctx: CanvasRenderingContext2D, W: number, H: number, s: PosterState) {
  const [bg, ink, accent, soft] = s.colors.map(css);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const { m, foot, gw, cols, cell, rows, y0 } = layout(W, H, s.density);
  const taken = new Uint8Array(cols * rows);
  const c = s.chaos;

  ctx.lineCap = "butt";
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (taken[k]) continue;
      const r = (n: number) => seeded(s.seed * 7919 + k * 131 + n * 15731 + cols * 7);
      // chaos merges 2×2 blocks into one big module…
      let span = 1;
      if (i + 1 < cols && j + 1 < rows && !taken[k + 1] && r(7) < c * 0.42) {
        span = 2;
        taken[k + 1] = taken[k + cols] = taken[k + cols + 1] = 1;
      }
      // …and loses a few altogether
      if (r(6) < c * 0.2) continue;
      const size = cell * span;
      const cx = m + i * cell + size / 2 + (r(4) - 0.5) * cell * 0.45 * c;
      const cy = y0 + j * cell + size / 2 + (r(5) - 0.5) * cell * 0.45 * c;
      if (r(3) < 0.2) {
        ctx.fillStyle = soft;
        ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      }
      const fg = r(2) < 0.15 ? accent : ink;
      ctx.fillStyle = fg;
      ctx.strokeStyle = fg;
      const twist = s.rotation * Math.PI * Math.sin(i * 0.72 + j * 0.47 + s.seed * 0.37);
      const quarter = Math.floor(r(1) * 4) + (s.turns[k] ?? 0);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((quarter * Math.PI) / 2 + twist);
      const sc = 1 + (r(8) - 0.5) * 0.8 * c;
      ctx.scale(sc, sc);
      motif(ctx, Math.floor(r(0) * MOTIFS), size * 0.98);
      ctx.restore();
    }

  // footer: rule, the number, the settings that made it
  const fy = H - foot;
  ctx.fillStyle = ink;
  ctx.fillRect(m, fy, gw, Math.max(1, W * 0.002));
  const big = foot * 0.44;
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${big}px ${s.fonts.display}`;
  ctx.fillText(`No.${pad(s.seed, 4)}`, m - big * 0.04, H - m * 0.62);
  // fine print, never smaller than 7px — unless the footer is too short for its four lines (small posters)
  const small = Math.min(Math.max(7, W * 0.0175), foot / 7.1);
  ctx.font = `500 ${small}px ${s.fonts.mono}`;
  ctx.textAlign = "right";
  const lines = [
    s.title.toUpperCase(),
    `D ${s.density.toFixed(2)}  R ${Math.round(s.rotation * 180)}°`,
    `P ${s.palette.toUpperCase()}  C ${s.chaos.toFixed(2)}`,
    `${cols}×${rows}  ${s.year}`,
  ];
  lines.forEach((l, n) => ctx.fillText(l, W - m, fy + small * 2.1 + n * small * 1.55));
  ctx.textAlign = "left";
}
