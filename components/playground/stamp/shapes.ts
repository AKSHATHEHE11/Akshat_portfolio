// Generative rubber-stamp prints. Print n is always the same shape (seeded), drawn in a 100×100 box.
// The next print renders on the server too, so the trig is lab's bit-exact sin/cos, not Math's.
import { seeded } from "@/lib/utils";
import { cos, sin } from "../lab";

export type Tone = "ink" | "signal" | "accent";
export interface Mark {
  d: string;
  /** stroke width; absent = a filled shape */
  w?: number;
}
export interface Print {
  name: string;
  marks: Mark[];
  tone: Tone;
  rot: number;
  /** px across at 1× */
  size: number;
}

const f = (n: number) => +n.toFixed(1);
const ring = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
const polar = (r: number, a: number) => [50 + cos(a) * r, 50 + sin(a) * r] as const;
const line = (r0: number, r1: number, a: number) => {
  const [x0, y0] = polar(r0, a);
  const [x1, y1] = polar(r1, a);
  return `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
};

type Gen = (r: (i: number) => number) => { name: string; marks: Mark[] };

const KINDS: Gen[] = [
  // sun: a disc and its rays
  (r) => {
    const n = 8 + Math.floor(r(1) * 9);
    const core = 14 + r(2) * 8;
    const rays = Array.from({ length: n }, (_, i) => line(core + 7, core + 16 + r(3) * 14, (i / n) * Math.PI * 2)).join("");
    return { name: `SUN·${n}`, marks: [{ d: ring(50, 50, core) }, { d: rays, w: 5 }] };
  },
  // target: concentric rings, a dot
  (r) => {
    const n = 3 + Math.floor(r(1) * 3);
    const d = Array.from({ length: n }, (_, i) => ring(50, 50, 44 - i * (36 / n))).join("");
    return { name: `TARGET·${n}`, marks: [{ d, w: 4 + r(2) * 3 }, { d: ring(50, 50, 6) }] };
  },
  // flower: petals around a hole
  (r) => {
    const n = 5 + Math.floor(r(1) * 5);
    const len = 40 + r(2) * 6;
    const wide = 0.32 + r(3) * 0.2;
    const d = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const [tx, ty] = polar(len, a);
      const [lx, ly] = polar(len * 0.62, a - wide);
      const [rx, ry] = polar(len * 0.62, a + wide);
      return `M50 50Q${f(lx)} ${f(ly)} ${f(tx)} ${f(ty)}Q${f(rx)} ${f(ry)} 50 50Z`;
    }).join("");
    return { name: `PETAL·${n}`, marks: [{ d }, { d: ring(50, 50, 7), w: 4 }] };
  },
  // dot grid with gaps
  (r) => {
    const n = 4 + Math.floor(r(1) * 2);
    const step = 84 / (n - 1);
    let d = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) if (r(10 + y * n + x) > 0.22) d += ring(8 + x * step, 8 + y * step, step * (0.22 + r(40 + y * n + x) * 0.14));
    return { name: `GRID·${n}×${n}`, marks: [{ d }] };
  },
  // stairs
  (r) => {
    const n = 3 + Math.floor(r(1) * 3);
    const s = 84 / n;
    let d = `M8 92`;
    for (let i = 0; i < n; i++) d += `V${f(92 - (i + 1) * s)}H${f(8 + (i + 1) * s)}`;
    d += `V92Z`;
    return { name: `STAIR·${n}`, marks: [{ d }] };
  },
  // blob: a lumpy closed curve
  (r) => {
    const n = 7 + Math.floor(r(1) * 4);
    const pts = Array.from({ length: n }, (_, i) => polar(26 + r(10 + i) * 20, (i / n) * Math.PI * 2));
    let d = "";
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % n];
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      d += i === 0 ? `M${f((pts[n - 1][0] + x0) / 2)} ${f((pts[n - 1][1] + y0) / 2)}` : "";
      d += `Q${f(x0)} ${f(y0)} ${f(mx)} ${f(my)}`;
    }
    return { name: `BLOB·${n}`, marks: [{ d: d + "Z" }] };
  },
  // asterisk
  (r) => {
    const n = 3 + Math.floor(r(1) * 4);
    const d = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI;
      return `M${f(50 - cos(a) * 42)} ${f(50 - sin(a) * 42)}L${f(50 + cos(a) * 42)} ${f(50 + sin(a) * 42)}`;
    }).join("");
    return { name: `STAR·${n * 2}`, marks: [{ d, w: 10 + r(2) * 5 }] };
  },
  // crescent
  (r) => {
    const o = 12 + r(1) * 14;
    return { name: `MOON·${Math.round(o)}`, marks: [{ d: `M50 6A44 44 0 1 0 50 94A${f(44 - o * 0.3)} ${f(44 - o * 0.3)} 0 1 1 50 6Z` }] };
  },
  // zigzag
  (r) => {
    const n = 4 + Math.floor(r(1) * 4);
    const s = 84 / n;
    let d = `M8 ${f(50 + 16)}`;
    for (let i = 1; i <= n; i++) d += `L${f(8 + i * s)} ${f(i % 2 ? 34 : 66)}`;
    return { name: `ZAG·${n}`, marks: [{ d, w: 9 }] };
  },
  // half disc on a line
  (r) => {
    const tall = 30 + r(1) * 12;
    return { name: `HALF·${Math.round(tall)}`, marks: [{ d: `M10 ${f(50 + tall / 3)}A40 40 0 0 1 90 ${f(50 + tall / 3)}Z` }, { d: `M6 ${f(62 + tall / 3)}H94`, w: 6 }] };
  },
];

/** Print number n (1-based). Chaos makes it bigger. */
export function printFor(n: number, chaos = false): Print {
  const r = (i: number) => seeded(n * 977 + i * 31 + 5);
  const kind = KINDS[Math.floor(r(0) * KINDS.length)];
  const { name, marks } = kind(r);
  const t = r(90);
  const tone: Tone = t < 0.5 ? "ink" : t < 0.84 ? "signal" : "accent";
  return { name, marks, tone, rot: Math.round(r(91) * 50 - 25), size: Math.round((70 + r(92) * 50) * (chaos ? 1.5 : 1)) };
}
