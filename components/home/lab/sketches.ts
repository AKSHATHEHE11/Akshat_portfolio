// Tiny canvas hints of each experiment. A sketch is set up once per canvas and returns a draw
// function called by the strip's single rAF. Everything scales off the canvas' pixel size.
import type { Experiment } from "@/data/experiments";
import { pointer } from "@/lib/pointer";

export interface DrawOpts {
  /** pointer is over this tile */
  hot: boolean;
  /** tile's screen rect (only read when hot) */
  rect: () => DOMRect;
}
export type Draw = (t: number, o: DrawOpts) => void;
type Sketch = (ctx: CanvasRenderingContext2D, title: string) => Draw;

const INK = "#111111";
const CREAM = "#f2eee7";
const ORANGE = "#ff5a1f";
const LIME = "#d8ff00";
const cssFont = (v: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;

function clear(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** EXP-01: letters stretching like they are being pulled. */
const liquid: Sketch = (ctx, title) => {
  const font = cssFont("--font-archivo", "sans-serif");
  const word = [...title.split(" ")[0].toUpperCase()];
  return (t, o) => {
    const { width: w, height: h } = ctx.canvas;
    clear(ctx);
    const size = Math.min(h * 0.46, w / (word.length * 0.74));
    ctx.font = `800 ${size}px ${font}`;
    const amp = o.hot ? 0.8 : 0.48;
    const sx = word.map((_, i) => 1 + amp * Math.sin(t * 0.0021 + i * 0.95));
    const ws = word.map((c, i) => ctx.measureText(c).width * sx[i]);
    let x = (w - ws.reduce((a, b) => a + b, 0)) / 2;
    const base = h * 0.64;
    const lit = Math.floor(t * 0.0011) % word.length;
    word.forEach((c, i) => {
      ctx.save();
      ctx.translate(x, base);
      ctx.scale(sx[i], 1 + (1 - sx[i]) * 0.4);
      ctx.fillStyle = i === lit ? ORANGE : CREAM;
      ctx.fillText(c, 0, 0);
      ctx.restore();
      x += ws[i];
    });
    ctx.fillStyle = LIME;
    ctx.fillRect(w * 0.08, base + h * 0.09, w * 0.84 * (0.5 + 0.5 * Math.sin(t * 0.0013)), Math.max(2, h * 0.014));
  };
};

/** EXP-02: points riding a flow field, leaving short trails. */
const field: Sketch = (ctx) => {
  const P = Array.from({ length: 170 }, (_, i) => ({ x: Math.random(), y: Math.random(), c: i % 9 === 0 ? LIME : CREAM }));
  let last = 0;
  return (t, o) => {
    const { width: w, height: h } = ctx.canvas;
    const dt = last ? Math.min(64, t - last) : 16;
    last = t;
    ctx.fillStyle = "rgb(17 17 17 / 0.18)";
    ctx.fillRect(0, 0, w, h);
    const sp = (o.hot ? 0.0003 : 0.00012) * dt;
    const s = Math.max(1.5, w / 210);
    for (const p of P) {
      const a = Math.sin(p.x * 6.2 + t * 0.0004) * 2.3 + Math.cos(p.y * 5.1 - t * 0.0003) * 2.3;
      p.x = (p.x + Math.cos(a) * sp + 1) % 1;
      p.y = (p.y + Math.sin(a) * sp * (w / h) + 1) % 1;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x * w, p.y * h, s, s);
    }
  };
};

/** EXP-03: truchet tiles that keep re-deciding themselves. */
const pattern: Sketch = (ctx) => {
  const C = 8;
  const R = 6;
  const cells = Array.from({ length: C * R }, () => {
    const r = Math.floor(Math.random() * 4);
    return { r, a: (r * Math.PI) / 2 };
  });
  let next = 0;
  let last = 0;
  return (t, o) => {
    const { width: w, height: h } = ctx.canvas;
    if (t > next) {
      last = Math.floor(Math.random() * cells.length);
      cells[last].r++;
      next = t + (o.hot ? 80 : 240);
    }
    clear(ctx);
    const s = Math.max(w / C, h / R);
    ctx.lineWidth = s * 0.17;
    cells.forEach((c, i) => {
      c.a += ((c.r * Math.PI) / 2 - c.a) * 0.16;
      ctx.save();
      ctx.translate((i % C) * s + s / 2, Math.floor(i / C) * s + s / 2);
      ctx.rotate(c.a);
      ctx.strokeStyle = i === last ? ORANGE : CREAM;
      ctx.beginPath();
      ctx.arc(-s / 2, -s / 2, s / 2, 0, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    });
  };
};

/** EXP-04: a chord (4:5:6) on a phosphor scope. */
const scope: Sketch = (ctx) => (t, o) => {
  const { width: w, height: h } = ctx.canvas;
  clear(ctx);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgb(242 238 231 / 0.09)";
  ctx.beginPath();
  for (let i = 1; i < 8; i++) {
    ctx.moveTo((i * w) / 8, 0);
    ctx.lineTo((i * w) / 8, h);
  }
  for (let j = 1; j < 6; j++) {
    ctx.moveTo(0, (j * h) / 6);
    ctx.lineTo(w, (j * h) / 6);
  }
  ctx.stroke();
  const amp = h * (o.hot ? 0.36 : 0.25);
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const u = (x / w) * Math.PI * 4;
    const y = h / 2 + (amp * (Math.sin(u + t * 0.004) + Math.sin(u * 1.25 + t * 0.005) + Math.sin(u * 1.5 - t * 0.003))) / 3;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const k = w / 300;
  ctx.strokeStyle = "rgb(255 90 31 / 0.25)";
  ctx.lineWidth = 7 * k;
  ctx.stroke();
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 2 * k;
  ctx.stroke();
};

/** EXP-05: a dot grid leaning toward attention (yours, when you hover). */
const dots: Sketch = (ctx) => (t, o) => {
  const { width: w, height: h } = ctx.canvas;
  clear(ctx);
  let ax = w * (0.5 + 0.32 * Math.sin(t * 0.0009));
  let ay = h * (0.5 + 0.3 * Math.sin(t * 0.0013 + 1));
  if (o.hot) {
    const r = o.rect();
    ax = ((pointer.x - r.left) / r.width) * w;
    ay = ((pointer.y - r.top) / r.height) * h;
  }
  const C = 14;
  const R = 10;
  const k = w / 300;
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      const x0 = ((i + 0.5) * w) / C;
      const y0 = ((j + 0.5) * h) / R;
      const dx = ax - x0;
      const dy = ay - y0;
      const f = Math.max(0, 1 - Math.hypot(dx, dy) / (w * 0.36));
      ctx.globalAlpha = 0.3 + f * 0.7;
      ctx.fillStyle = f > 0.55 ? LIME : CREAM;
      ctx.beginPath();
      ctx.arc(x0 + dx * f * 0.35, y0 + dy * f * 0.35, (1.4 + f * 3.8) * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

/** EXP-06: a spinning torus, rendered in characters. */
const ascii: Sketch = (ctx) => {
  const mono = cssFont("--font-plex", "monospace");
  const ramp = ".,-~:;=!*#$@";
  const cols = 44;
  const rows = 22;
  const out: string[] = new Array(cols * rows);
  const zb = new Float32Array(cols * rows);
  let A = 1;
  let B = 1;
  let last = 0;
  return (t, o) => {
    const { width: w, height: h } = ctx.canvas;
    const dt = last ? Math.min(64, t - last) : 16;
    last = t;
    A += dt * (o.hot ? 0.0022 : 0.0011);
    B += dt * (o.hot ? 0.0011 : 0.0005);
    out.fill(" ");
    zb.fill(0);
    const cw = w / cols;
    const ch = h / rows;
    const kx = cols * 0.5;
    const ky = (kx * cw) / ch;
    const cA = Math.cos(A);
    const sA = Math.sin(A);
    const cB = Math.cos(B);
    const sB = Math.sin(B);
    for (let j = 0; j < 6.28; j += 0.14) {
      const ct = Math.cos(j);
      const st = Math.sin(j);
      for (let i = 0; i < 6.28; i += 0.04) {
        const sp = Math.sin(i);
        const cp = Math.cos(i);
        const r = ct + 2;
        const D = 1 / (sp * r * sA + st * cA + 5);
        const tt = sp * r * cA - st * sA;
        const x = Math.floor(cols / 2 + kx * D * (cp * r * cB - tt * sB));
        const y = Math.floor(rows / 2 + ky * D * (cp * r * sB + tt * cB));
        const at = x + cols * y;
        if (y < 0 || y >= rows || x < 0 || x >= cols || D <= zb[at]) continue;
        zb[at] = D;
        const N = Math.floor(8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
        out[at] = ramp[Math.max(0, Math.min(ramp.length - 1, N))];
      }
    }
    clear(ctx);
    ctx.font = `500 ${ch * 1.08}px ${mono}`;
    ctx.textBaseline = "top";
    for (let k = 0; k < out.length; k++) {
      const c = out[k];
      if (c === " ") continue;
      ctx.fillStyle = c === "@" || c === "$" || c === "#" ? LIME : CREAM;
      ctx.fillText(c, (k % cols) * cw, Math.floor(k / cols) * ch);
    }
  };
};

export const SKETCHES: Record<Experiment["slug"], Sketch> = {
  "liquid-type": liquid,
  "particle-field": field,
  "pattern-machine": pattern,
  oscilloscope: scope,
  "magnetic-dots": dots,
  "ascii-room": ascii,
};

/** Chaos: tear a horizontal band of the frame sideways. */
export function tear(ctx: CanvasRenderingContext2D) {
  const { width: w, height: h } = ctx.canvas;
  const y = Math.random() * h;
  const bh = h * (0.04 + Math.random() * 0.12);
  ctx.drawImage(ctx.canvas, 0, y, w, bh, (Math.random() - 0.5) * w * 0.14, y, w, bh);
}
