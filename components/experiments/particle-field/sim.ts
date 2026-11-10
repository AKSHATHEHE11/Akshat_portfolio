// EXP-02 simulation, plain typed arrays shared by the WebGL view (Field.tsx) and the 2D still frame.
// Points rest on wavy horizontal threads; the pointer combs them aside and drags them along, and a
// soft spring brings them back over ~2 s — the field "remembers" where you have been.
import { seeded } from "@/lib/utils";

export interface Sim {
  w: number;
  h: number;
  n: number;
  /** x, y, 0 per point — the position attribute itself */
  pos: Float32Array;
  home: Float32Array;
  vel: Float32Array;
  /** 0..1 displacement from home — the colour/size attribute */
  heat: Float32Array;
  /** thread index per point (idle wave phase in the shader) */
  row: Float32Array;
  /** something is still moving: upload + draw next frame */
  awake: boolean;
  displaced: number;
}

/** A pointer-like sweep that is not the visitor: chaos gusts and the keyboard's arrow strokes. */
export interface Gust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function createSim(w: number, h: number, n: number): Sim {
  const rows = Math.max(22, Math.min(110, Math.round(h / 10.5)));
  const per = Math.max(8, Math.floor(n / rows));
  const count = rows * per;
  const pos = new Float32Array(count * 3);
  const home = new Float32Array(count * 2);
  const row = new Float32Array(count);
  const gap = h / rows;
  const pad = w * 0.04;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < per; i++) {
      const k = j * per + i;
      const x = -pad + ((i + seeded(k * 3 + 1) * 0.8) / per) * (w + 2 * pad);
      const env = 0.55 + 0.45 * Math.sin((x / w) * Math.PI);
      const y =
        (j + 0.5) * gap +
        gap * 1.7 * env * Math.sin(x * 0.0062 + j * 0.2) +
        gap * 0.55 * Math.sin(x * 0.019 - j * 0.41 + 1.3) +
        (seeded(k * 3 + 2) - 0.5) * 0.9;
      home[k * 2] = x;
      home[k * 2 + 1] = y;
      pos[k * 3] = x;
      pos[k * 3 + 1] = y;
      row[k] = j;
    }
  return { w, h, n: count, pos, home, vel: new Float32Array(count * 2), heat: new Float32Array(count), row, awake: true, displaced: 0 };
}

export interface Input {
  /** pointer in sim px, or null when it is not over the field */
  x: number;
  y: number;
  on: boolean;
  /** pointer velocity, px per second */
  vx: number;
  vy: number;
}

export interface Tune {
  radius: number;
  push: number;
  /** spring stiffness (1/s²) and damping (1/s) of the way home */
  k: number;
  d: number;
}

export const tune = (chaos: boolean, reduced: boolean, coarse: boolean): Tune => ({
  radius: (chaos ? 125 : 88) * (coarse ? 0.8 : 1),
  push: chaos ? 2600 : 1700,
  k: chaos ? 2.4 : 3.6,
  // reduced motion: critically damped — points slide home without the wobble
  d: reduced ? 2 * Math.sqrt(chaos ? 2.4 : 3.6) : chaos ? 1.5 : 2.2,
});

function comb(s: Sim, px: number, py: number, pvx: number, pvy: number, T: Tune, dt: number) {
  const R = T.radius;
  const R2 = R * R;
  const carry = Math.min(1, dt * 9);
  const { pos, vel } = s;
  for (let k = 0; k < s.n; k++) {
    const dx = pos[k * 3] - px;
    const dy = pos[k * 3 + 1] - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R2) continue;
    const d = Math.sqrt(d2) + 1e-3;
    let f = 1 - d / R;
    f *= f;
    vel[k * 2] += (dx / d) * T.push * f * dt + (pvx - vel[k * 2]) * f * carry;
    vel[k * 2 + 1] += (dy / d) * T.push * f * dt + (pvy - vel[k * 2 + 1]) * f * carry;
  }
  s.awake = true;
}

/** One physics step. Returns false when everything has settled (nothing to upload). */
export function step(s: Sim, input: Input, gusts: Gust[], T: Tune, dt: number) {
  if (input.on) comb(s, input.x, input.y, input.vx, input.vy, T, dt);
  for (const g of gusts) {
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.life -= dt;
    comb(s, g.x, g.y, g.vx * 0.8, g.vy * 0.8, T, dt);
  }
  for (let i = gusts.length - 1; i >= 0; i--) if (gusts[i].life <= 0) gusts.splice(i, 1);
  if (!s.awake) return false;

  const damp = Math.exp(-T.d * dt);
  const { pos, vel, home, heat } = s;
  let moving = 0;
  let displaced = 0;
  for (let k = 0; k < s.n; k++) {
    const ox = home[k * 2] - pos[k * 3];
    const oy = home[k * 2 + 1] - pos[k * 3 + 1];
    let vx = (vel[k * 2] + ox * T.k * dt) * damp;
    let vy = (vel[k * 2 + 1] + oy * T.k * dt) * damp;
    const off = Math.abs(ox) + Math.abs(oy);
    if (off < 0.05 && Math.abs(vx) + Math.abs(vy) < 0.5) {
      vx = vy = 0;
      pos[k * 3] = home[k * 2];
      pos[k * 3 + 1] = home[k * 2 + 1];
      heat[k] = 0;
    } else {
      moving++;
      pos[k * 3] += vx * dt;
      pos[k * 3 + 1] += vy * dt;
      const ht = Math.min(1, off / 70);
      heat[k] = ht;
      if (ht > 0.12) displaced++;
    }
    vel[k * 2] = vx;
    vel[k * 2 + 1] = vy;
  }
  s.displaced = displaced;
  s.awake = moving > 0 || input.on || gusts.length > 0;
  return true;
}

/** A click/tap: a ring of points thrown outward from (x, y). */
export function burst(s: Sim, x: number, y: number, strength: number) {
  const R = 170;
  for (let k = 0; k < s.n; k++) {
    const dx = s.pos[k * 3] - x;
    const dy = s.pos[k * 3 + 1] - y;
    const d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
    if (d > R) continue;
    const f = (1 - d / R) * strength;
    s.vel[k * 2] += (dx / d) * f;
    s.vel[k * 2 + 1] += (dy / d) * f;
  }
  s.awake = true;
}

const STILL = ["rgb(242 238 231 / 0.42)", "#ff5a1f", "#d8ff00"];

/** The still frame: the field exactly as it is now, drawn once in 2D (inactive / reduced / before WebGL). */
export function drawStill(ctx: CanvasRenderingContext2D, s: Sim, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, s.w, s.h);
  for (let b = 0; b < STILL.length; b++) {
    ctx.fillStyle = STILL[b];
    ctx.beginPath();
    for (let k = 0; k < s.n; k++) {
      const h = s.heat[k];
      if ((h < 0.15 ? 0 : h < 0.92 ? 1 : 2) !== b) continue;
      const r = 1.5 + h * 1.6;
      ctx.rect(s.pos[k * 3] - r / 2, s.pos[k * 3 + 1] - r / 2, r, r);
    }
    ctx.fill();
  }
}
