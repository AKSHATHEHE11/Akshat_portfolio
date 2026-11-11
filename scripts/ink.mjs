// Generates the ink-spread masks for the Lights switch (public/fx/ink-*.webp): a grid of frames in which
// ink pours out of the top-right corner (where the switch lives), creeping along a marbled field so its
// edge breaks into fingers and wisps. The page plays the grid through a view-transition mask
// (nav.css, "lights"). Opaque = the new theme shows (alpha mask, so no browser needs mask-mode).
// Deterministic: same seed, same file.
//   node scripts/ink.mjs            → writes public/fx/ink-land.webp + ink-port.webp
//   node scripts/ink.mjs --preview  → also writes a strip of every 5th frame to the OS temp folder
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const COLS = 6;
export const ROWS = 5;
const N = COLS * ROWS;

// ── gradient noise (Perlin), seeded ──────────────────────────────────────────
function noise2(seed) {
  const p = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const gx = new Float32Array(256);
  const gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const a = rnd() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const g = (h, dx, dy) => gx[h] * dx + gy[h] * dy;
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const u = fade(xf);
    const v = fade(yf);
    const x1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf));
    const x2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 1.42; // ≈ [-1, 1]
  };
}

const n1 = noise2(7);
const n2 = noise2(1999);
function fbm(n, x, y, oct = 5) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) {
    s += a * n(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s; // ≈ [-1, 1]
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// fast at first, then a long, slow settle — like ink soaking outwards
const ease = (t) => 1 - Math.pow(1 - t, 1.35);

/**
 * One sheet. fw×fh is a frame; units are frame heights so the marbling isn't stretched.
 * ox/oy: where the ink starts, as a fraction of the frame.
 */
async function sheet(fw, fh, ox, oy, file) {
  const aspect = fw / fh;
  const O = [ox * aspect, oy];
  const A = 0.5; // how far fingers reach ahead of / lag behind the round front
  // the static field: distance from the origin, bent by domain-warped marbling (iq's warp)
  const field = new Float32Array(fw * fh);
  const wisp = new Float32Array(fw * fh);
  let maxF = 0;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const u = (x + 0.5) / fh;
      const v = (y + 0.5) / fh;
      const px = u * 1.15, py = v * 1.15;
      const qx = fbm(n1, px, py, 4), qy = fbm(n1, px + 5.2, py + 1.3, 4);
      const rx = fbm(n1, px + 3 * qx + 1.7, py + 3 * qy + 9.2, 4);
      const ry = fbm(n1, px + 3 * qx + 8.3, py + 3 * qy + 2.8, 4);
      const n = fbm(n1, px + 3 * rx, py + 3 * ry, 5);
      const d = Math.hypot(u - O[0], v - O[1]);
      const f = d + A * n;
      field[y * fw + x] = f;
      if (f > maxF) maxF = f;
      // thin smoky streaks that follow the same flow
      wisp[y * fw + x] = Math.abs(fbm(n2, u * 3 + 1.6 * rx, v * 3 + 1.6 * ry, 3));
    }
  }
  const R0 = -A * 0.6;
  const R1 = maxF + 0.04;
  const out = Buffer.alloc(fw * COLS * fh * ROWS);
  const W = fw * COLS;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);
    const R = R0 + (R1 - R0) * ease(t);
    const edge = 0.005;
    const c = k % COLS;
    const r = Math.floor(k / COLS);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = y * fw + x;
        const f = field[i];
        let a = smooth(R + edge, R - edge, f); // 1 inside the ink
        // behind the front, the ink is still settling: pale streaks of the old page drift in it,
        // fading out as the front moves on (and gone entirely by the last frames)
        const behind = R - f;
        if (a > 0 && behind < 0.3 && t < 0.97) {
          const near = 1 - smooth(0.04, 0.3, behind);
          const streak = 1 - smooth(0.012, 0.05, wisp[i]);
          a *= 1 - streak * near * 0.85 * (1 - smooth(0.75, 0.97, t));
        }
        if (k === N - 1) a = 1;
        out[(r * fh + y) * W + c * fw + x] = Math.round(a * 255);
      }
    }
  }
  const img = sharp(out, { raw: { width: W, height: fh * ROWS, channels: 1 } });
  // white, with the mask in the alpha channel
  await sharp({ create: { width: W, height: fh * ROWS, channels: 3, background: "#fff" } })
    .joinChannel(out, { raw: { width: W, height: fh * ROWS, channels: 1 } })
    .webp({ quality: 80, alphaQuality: 80, effort: 6 })
    .toFile(file);
  return img;
}

mkdirSync("public/fx", { recursive: true });
const land = await sheet(640, 360, 0.93, 0.05, "public/fx/ink-land.webp");
const port = await sheet(360, 640, 0.9, 0.04, "public/fx/ink-port.webp");
console.log("wrote public/fx/ink-land.webp, public/fx/ink-port.webp");

if (process.argv.includes("--preview")) {
  for (const [name, img, fw, fh] of [["land", land, 640, 360], ["port", port, 360, 640]]) {
    const frames = [];
    for (let k = 0; k < N; k += 5) {
      const c = k % COLS, r = Math.floor(k / COLS);
      frames.push(await img.clone().extract({ left: c * fw, top: r * fh, width: fw, height: fh }).png().toBuffer());
    }
    frames.push(await img.clone().extract({ left: (COLS - 1) * fw, top: (ROWS - 1) * fh, width: fw, height: fh }).png().toBuffer());
    const strip = join(tmpdir(), `ink-${name}-strip.png`);
    await sharp({ create: { width: frames.length * (fw + 8), height: fh, channels: 3, background: "#f0f" } })
      .composite(frames.map((b, i) => ({ input: b, left: i * (fw + 8), top: 0 })))
      .png()
      .toFile(strip);
    console.log("preview", strip);
  }
}
