"use client";
import { useEffect, useRef } from "react";
import { Corners } from "@/components/ui/marks";
import { gsap } from "@/lib/gsap";
import { useChaos, useCoarse, useOnScreen, useReducedMotion, useTheme } from "@/lib/hooks";
import { clamp, cn } from "@/lib/utils";

const TAU = Math.PI * 2;
type Dot = { x: number; y: number; d: number; row: number };

/** Darkness 0..1 sampled on a hex grid from whatever the source canvas shows. */
function sample(src: HTMLCanvasElement, step: number) {
  const { width: w, height: h } = src;
  const data = src.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const dots: Dot[] = [];
  const dy = step * 0.866;
  for (let row = 0, y = dy / 2; y < h; row++, y += dy) {
    for (let x = row % 2 ? step : step / 2; x < w; x += step) {
      const i = ((y | 0) * w + (x | 0)) * 4;
      const d = 1 - (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      if (d > 0.04) dots.push({ x, y, d, row });
    }
  }
  return dots;
}

const blank = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!] as const;
};

/** The stand-in: initials set huge in Archivo over a soft vignette, like a lit monogram. */
async function initialsSource(w: number, h: number, initials: string) {
  const [c, ctx] = blank(w, h);
  const g = ctx.createRadialGradient(w * 0.45, h * 0.38, 0, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.55, "#e9e9e9");
  g.addColorStop(1, "#7a7a7a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-archivo").trim() || "sans-serif";
  const font = (px: number) => `900 ${px}px ${family}`;
  await document.fonts.load(font(100)).catch(() => {});
  ctx.font = font(100);
  const size = (100 * w * 0.84) / Math.max(1, ctx.measureText(initials).width);
  ctx.font = font(Math.min(size, h * 0.72));
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, w / 2, h * 0.53);
  return c;
}

/** A real photo (same-origin URL), cover-fitted. */
function photoSource(w: number, h: number, src: string) {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [c, ctx] = blank(w, h);
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      ctx.drawImage(img, (w - img.naturalWidth * s) / 2, (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      resolve(c);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * A portrait frame that prints its subject as a halftone dot field. No photo yet: it prints the
 * initials. Pass `photo` (a same-origin image URL) and the same field prints the photo instead.
 * The dots develop once, the first time the frame is seen; the pointer pushes them apart like a loupe.
 * Chaos: rows of dots slip sideways like a bad scan.
 */
export function Portrait({ initials, photo, label, className }: { initials: string; photo?: string; label: string; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const visible = useOnScreen(frame, "100px");
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const theme = useTheme();
  // survives effect re-runs (scrolling away and back must not re-sample or re-develop)
  const field = useRef({ key: "", dots: [] as Dot[], rows: 0, w: 1, h: 1, step: 8, developed: 0 });
  const glitchy = chaos && !reduced;

  useEffect(() => {
    const el = frame.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx || !visible) return;
    const f = field.current;
    if (reduced) f.developed = 1;
    const cs = getComputedStyle(el);
    const ink = cs.color;
    const hot = cs.getPropertyValue("--signal").trim() || "#ff5a1f";
    const p = { x: 0, y: 0, in: false };
    let lens = 0;
    let glitch = new Float32Array(f.rows);
    let running = false;
    let dirty = true;
    let alive = true;

    const draw = () => {
      const { w, h, step } = f;
      ctx.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const base = new Path2D();
      const lit = new Path2D();
      const R = step * (glitchy ? 11 : 7);
      const maxR = step * 0.56;
      const far = Math.hypot(w / 2, h / 2);
      for (const dot of f.dots) {
        // develop: a wave from the centre outwards
        const dev = clamp(f.developed * 1.6 - (Math.hypot(dot.x - w / 2, dot.y - h / 2) / far) * 0.6);
        if (dev <= 0) continue;
        let x = dot.x + (glitch[dot.row] ?? 0);
        let y = dot.y;
        let r = maxR * Math.sqrt(dot.d) * dev * (2 - dev);
        let near = false;
        if (lens > 0.001) {
          const dx = x - p.x;
          const dy = y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < R) {
            const k = (1 - dist / R) ** 2 * lens;
            x += (dx / (dist || 1)) * k * step * 1.5;
            y += (dy / (dist || 1)) * k * step * 1.5;
            r *= 1 + k * 0.9;
            near = k > 0.18;
          }
        }
        const path = near ? lit : base;
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, TAU);
      }
      ctx.fillStyle = ink;
      ctx.fill(base);
      ctx.fillStyle = hot;
      ctx.fill(lit);
    };

    const tick = () => {
      let busy = false;
      if (f.developed < 1) {
        f.developed = Math.min(1, f.developed + gsap.ticker.deltaRatio() / 100);
        busy = true;
      }
      const target = p.in ? 1 : 0;
      if (Math.abs(target - lens) > 0.002) {
        lens += (target - lens) * 0.12;
        busy = true;
      } else lens = target;
      if (glitchy) {
        busy = true;
        for (let i = 0; i < glitch.length; i++) glitch[i] *= 0.84;
        if (Math.random() < 0.06) {
          const at = (Math.random() * glitch.length) | 0;
          const off = (Math.random() - 0.5) * f.step * 7;
          for (let i = at; i < Math.min(glitch.length, at + 2 + ((Math.random() * 7) | 0)); i++) glitch[i] = off;
        }
      } else if (glitch.some((g) => Math.abs(g) > 0.2)) {
        busy = true;
        for (let i = 0; i < glitch.length; i++) glitch[i] *= 0.8;
      }
      if (busy || dirty) draw();
      dirty = false;
      if (!busy) {
        running = false;
        gsap.ticker.remove(tick);
      }
    };
    const start = () => {
      dirty = true;
      if (running || !alive) return;
      running = true;
      gsap.ticker.add(tick);
    };

    const build = async () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const key = `${w}x${h}|${coarse}|${photo ?? initials}`;
      if (key !== f.key) {
        const step = Math.max(coarse ? 9 : 7, w / (coarse ? 32 : 44));
        const src = photo ? await photoSource(w, h, photo).catch(() => initialsSource(w, h, initials)) : await initialsSource(w, h, initials);
        if (!alive) return;
        let dots: Dot[];
        try {
          dots = sample(src, step);
        } catch {
          dots = sample(await initialsSource(w, h, initials), step); // a cross-origin photo taints the canvas
        }
        Object.assign(f, { key, dots, w, h, step, rows: dots.length ? dots[dots.length - 1].row + 1 : 0 });
        glitch = new Float32Array(f.rows);
      }
      start();
    };

    const move = (e: PointerEvent) => {
      p.x = e.offsetX;
      p.y = e.offsetY;
      p.in = true;
      start();
    };
    const out = () => {
      p.in = false;
      start();
    };
    const up = (e: PointerEvent) => e.pointerType !== "mouse" && out();
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerdown", move);
    cv.addEventListener("pointerleave", out);
    cv.addEventListener("pointercancel", out);
    cv.addEventListener("pointerup", up);

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => void build());
    });
    ro.observe(el);

    return () => {
      alive = false;
      gsap.ticker.remove(tick);
      ro.disconnect();
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerdown", move);
      cv.removeEventListener("pointerleave", out);
      cv.removeEventListener("pointercancel", out);
      cv.removeEventListener("pointerup", up);
    };
  }, [visible, reduced, coarse, theme, photo, initials, glitchy]);

  return (
    <div ref={frame} role="img" aria-label={label} className={cn("relative aspect-[4/5] text-fg", className)}>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full touch-pan-y" data-cursor="hide" />
      <Corners className="text-fg/45" inset={-1} size={16} weight={1.5} />
    </div>
  );
}
