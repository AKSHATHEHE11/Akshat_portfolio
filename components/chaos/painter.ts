// The chaos canvas: one fixed 2D canvas for the gravity-well grid, the cursor ribbon and bursts.
// Drawn by the engine's single loop; skips the frame entirely when nothing on it changed.
// Plain compositing, colours that read on both paper and the site's dark panels (a blend mode
// picked from the page ground would vanish over a dark hero on a light page).
type RGB = readonly [number, number, number];

const LIME: RGB = [216, 255, 0];
const ORANGE: RGB = [255, 90, 31];
/** grid lines: a warm mid-tone shows as a faint rule on bone and on near-black alike */
const GRID = "128,120,108";
const TRAIL_MS = 420;
const MAX_PARTS = 140;
const MARK_MS = 520;
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

interface Part {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  streak: boolean;
  /** 0 lime · 1 orange · 2 ink/bone */
  col: number;
}

export type Painter = ReturnType<typeof createPainter>;

export function createPainter(coarse: boolean) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:45;pointer-events:none";
  const ctx = canvas.getContext("2d")!;

  const cell = coarse ? 44 : 56;
  const sigma = coarse ? 100 : 130;
  const reach = sigma * 3.5;
  const inv = 1 / (2 * sigma * sigma);
  // tail (orange) → head (lime)
  const ramp = Array.from({ length: 16 }, (_, i) => css(mix(ORANGE, LIME, i / 15)));
  let colours = [css(LIME), css(ORANGE), "rgb(17,17,17)"];

  const parts: Part[] = Array.from({ length: MAX_PARTS }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 0, streak: false, col: 0 }));
  const marks = Array.from({ length: 6 }, () => ({ on: false, x: 0, y: 0, age: 0 }));
  const trail: { x: number; y: number; t: number }[] = [];
  const well = { x: -1e4, y: -1e4, s: 0, kick: 0 };
  let next = 0;
  let nextMark = 0;
  let w = 0;
  let h = 0;
  let dirty = true;
  let lastScroll = Number.NaN;
  let lastAmp = -1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }
  resize();

  /** Relative luminance 0..1 of any CSS colour (the canvas parses it for us). */
  function luma(color: string) {
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    const v = String(ctx.fillStyle);
    const [r = 0, g = 0, b = 0] = v.startsWith("#")
      ? [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16))
      : (v.match(/[\d.]+/g) ?? []).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  /** Page ground decides only the third particle colour: ink on paper, bone on dark. */
  function setGround(dark: boolean) {
    colours = [css(LIME), css(ORANGE), dark ? "rgb(242,238,231)" : "rgb(17,17,17)"];
    dirty = true;
  }

  function spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, streak: boolean, col: number) {
    const p = parts[next];
    next = (next + 1) % MAX_PARTS; // ring buffer: a full pool recycles the oldest
    p.on = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.age = 0;
    p.life = life;
    p.size = size;
    p.streak = streak;
    p.col = col;
  }

  function burst(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * (coarse ? 5 : 8);
      const col = Math.random() < 0.42 ? 0 : Math.random() < 0.7 ? 1 : 2;
      spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1.2, 420 + Math.random() * 520, 2.5 + Math.random() * 4.5, Math.random() < 0.38, col);
    }
    const m = marks[nextMark];
    nextMark = (nextMark + 1) % marks.length;
    m.on = true;
    m.x = x;
    m.y = y;
    m.age = 0;
    // touch has no hover: the well jumps to the tap and sinks back
    if (coarse) {
      well.x = x;
      well.y = y;
      well.kick = 1;
    }
    dirty = true;
  }

  function frame(now: number, dt: number, amp: number, px: number, py: number, hover: boolean, speed: number) {
    const ms = dt * 16.667;
    const ox = well.x;
    const oy = well.y;
    const os = well.s;
    if (hover) {
      if (well.s < 0.002) {
        well.x = px;
        well.y = py;
      } else {
        well.x += (px - well.x) * Math.min(1, 0.22 * dt);
        well.y += (py - well.y) * Math.min(1, 0.22 * dt);
      }
    }
    well.kick *= Math.pow(0.97, dt);
    const target = (hover ? 0.42 : coarse ? 0.5 * well.kick : 0) * amp;
    well.s += (target - well.s) * Math.min(1, 0.07 * dt);
    if (Math.abs(well.s - target) < 0.0005) well.s = target;

    if (hover && amp > 0.01) {
      const last = trail[trail.length - 1];
      if (!last || Math.abs(px - last.x) + Math.abs(py - last.y) > 2) {
        trail.push({ x: px, y: py, t: now });
        if (trail.length > 36) trail.shift();
        // fast flicks shed pixels
        if (speed > 22 && Math.random() < 0.5) {
          spawn(px, py, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 260 + Math.random() * 240, 1.5 + Math.random() * 2, false, Math.random() < 0.5 ? 0 : 1);
        }
      }
    }
    while (trail.length && now - trail[0].t > TRAIL_MS) {
      trail.shift();
      dirty = true;
    }

    let alive = 0;
    const drag = Math.pow(0.95, dt);
    for (const p of parts) {
      if (!p.on) continue;
      p.age += ms;
      if (p.age >= p.life) {
        p.on = false;
        dirty = true;
        continue;
      }
      alive++;
      p.vx *= drag;
      p.vy = p.vy * drag + 0.16 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const m of marks) {
      if (!m.on) continue;
      m.age += ms;
      if (m.age > MARK_MS) {
        m.on = false;
        dirty = true;
      } else alive++;
    }

    const scroll = window.scrollY;
    const still = Math.abs(well.x - ox) < 0.1 && Math.abs(well.y - oy) < 0.1 && well.s === os;
    if (!dirty && !alive && trail.length < 2 && still && scroll === lastScroll && amp === lastAmp) return;
    dirty = false;
    lastScroll = scroll;
    lastAmp = amp;

    ctx.clearRect(0, 0, w, h);
    if (amp < 0.004) return;
    grid(scroll, amp);
    if (trail.length > 1) ribbon(now, amp);
    if (alive) bits(amp);
  }

  /** Graph paper that scrolls with the page and sinks into a well around the cursor. */
  function grid(scroll: number, amp: number) {
    const s = well.s;
    const cx = well.x;
    const cy = well.y;
    const warp = s > 0.002;
    const base = new Path2D();
    const hi = new Path2D();
    const sample = (x: number, y: number, path: Path2D, first: boolean) => {
      const dx = cx - x;
      const dy = cy - y;
      const e = s * Math.exp(-(dx * dx + dy * dy) * inv);
      const qx = x + dx * e;
      const qy = y + dy * e;
      base.lineTo(qx, qy);
      if (first) path.moveTo(qx, qy);
      else path.lineTo(qx, qy);
    };

    const x0 = ((w % cell) / 2) + 0.5;
    for (let x = x0; x <= w; x += cell) {
      base.moveTo(x, 0);
      if (warp && Math.abs(x - cx) < reach) {
        const a = Math.max(0, cy - reach);
        const b = Math.min(h, cy + reach);
        for (let y = a, first = true; ; y = Math.min(b, y + 12), first = false) {
          sample(x, y, hi, first);
          if (y >= b) break;
        }
      }
      base.lineTo(x, h);
    }
    const y0 = -(((scroll % cell) + cell) % cell) + 0.5;
    for (let y = y0; y <= h; y += cell) {
      base.moveTo(0, y);
      if (warp && Math.abs(y - cy) < reach) {
        const a = Math.max(0, cx - reach);
        const b = Math.min(w, cx + reach);
        for (let x = a, first = true; ; x = Math.min(b, x + 12), first = false) {
          sample(x, y, hi, first);
          if (x >= b) break;
        }
      }
      base.lineTo(w, y);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${GRID},${(0.16 * amp).toFixed(3)})`;
    ctx.stroke(base);
    if (warp) {
      const a = Math.min(1, s / 0.42) * amp;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach * 0.8);
      g.addColorStop(0, `rgba(255,90,31,${(0.75 * a).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(255,90,31,${(0.28 * a).toFixed(3)})`);
      g.addColorStop(1, "rgba(255,90,31,0)");
      ctx.strokeStyle = g;
      ctx.stroke(hi);
    }
  }

  /** Tapered ribbon, orange tail → lime head. */
  function ribbon(now: number, amp: number) {
    ctx.lineCap = "round";
    ctx.globalAlpha = amp;
    const n = trail.length;
    for (let i = 1; i < n; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const life = 1 - (now - b.t) / TRAIL_MS;
      if (life <= 0) continue;
      const k = i / (n - 1);
      ctx.strokeStyle = ramp[Math.round(k * 15)];
      ctx.lineWidth = 0.5 + 9 * k * life;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Pixel squares + streaks (shrinking, not fading — batchable by colour) and viewfinder marks. */
  function bits(amp: number) {
    ctx.globalAlpha = amp;
    ctx.lineCap = "butt";
    ctx.lineWidth = 1.6;
    for (let c = 0; c < 3; c++) {
      const fill = new Path2D();
      const lines = new Path2D();
      for (const p of parts) {
        if (!p.on || p.col !== c) continue;
        const k = 1 - p.age / p.life;
        if (p.streak) {
          lines.moveTo(p.x, p.y);
          lines.lineTo(p.x - p.vx * 3 * k, p.y - p.vy * 3 * k);
        } else {
          const s = p.size * k;
          fill.rect(p.x - s / 2, p.y - s / 2, s, s);
        }
      }
      ctx.fillStyle = colours[c];
      ctx.strokeStyle = colours[c];
      ctx.fill(fill);
      ctx.stroke(lines);
    }
    // viewfinder corners + crosshair, in signal orange (reads on paper and on dark panels)
    ctx.strokeStyle = colours[1];
    ctx.lineWidth = 1.5;
    for (const m of marks) {
      if (!m.on) continue;
      const p = m.age / MARK_MS;
      const r = 8 + 40 * (1 - (1 - p) ** 3);
      const arm = 4 + 6 * (1 - p);
      ctx.globalAlpha = (1 - p) * amp;
      ctx.beginPath();
      for (const [sx, sy] of CORNERS) {
        const x = m.x + sx * r;
        const y = m.y + sy * r;
        ctx.moveTo(x - sx * arm, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y - sy * arm);
      }
      if (p < 0.5) {
        ctx.moveTo(m.x - 5, m.y);
        ctx.lineTo(m.x + 5, m.y);
        ctx.moveTo(m.x, m.y - 5);
        ctx.lineTo(m.x, m.y + 5);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function reset() {
    trail.length = 0;
    dirty = true;
  }

  function clear() {
    trail.length = 0;
    for (const p of parts) p.on = false;
    for (const m of marks) m.on = false;
    ctx.clearRect(0, 0, w, h);
    dirty = true;
  }

  return { canvas, resize, luma, setGround, burst, frame, reset, clear };
}
