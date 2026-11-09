"use client";
// Live wireframe terrain for the dark patch-bay module: a fixed peak over rolling ground, projected by
// hand onto a 2D canvas (no WebGL context spent on it). Paused off-screen, one frame under reduced motion.
import { useEffect, useRef } from "react";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
import { cn } from "@/lib/utils";

const COLS = 30;
const ROWS = 22;

export function Terrain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const chaosRef = useRef(chaos);
  useEffect(() => {
    chaosRef.current = chaos;
  }, [chaos]);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    // left/width are cached on resize: vertical scrolling never moves the canvas horizontally, and a
    // getBoundingClientRect() per frame forced a full page layout every frame (the kinetic headline
    // invalidates layout each tick) — that was the hero's biggest mouse-move cost.
    let w = 0, h = 0, raf = 0, visible = false, t = 0, last = 0, camX = 0, left = 0;
    const pts = new Float32Array(COLS * ROWS * 2);

    const height = (x: number, z: number, time: number, wild: boolean) => {
      const peak = 1.55 * Math.exp(-(x * x) / 1.5 - ((z - 6.6) * (z - 6.6)) / 5.5);
      const ridge = Math.sin(x * 2.1 + (z + time) * 1.25) * Math.cos((z + time) * 0.85 - x * 0.7);
      return peak + ridge * (wild ? 0.42 : 0.16) + (wild && Math.random() < 0.012 ? Math.random() * 0.9 : 0);
    };

    const draw = () => {
      if (!w || !h) return;
      const wild = chaosRef.current && !reduced;
      const target = pointer.inside && pointer.x > left && pointer.x < left + w ? ((pointer.x - left) / w - 0.5) * 1.2 : 0;
      camX += (target - camX) * 0.06;
      const f = Math.min(w, h * 1.6) * 0.62;
      const horizon = h * 0.3;
      for (let j = 0; j < ROWS; j++) {
        const z = 1.7 + j * 0.44;
        for (let i = 0; i < COLS; i++) {
          const x = -4.2 + (i / (COLS - 1)) * 8.4;
          const y = height(x, z, t, wild);
          const k = (j * COLS + i) * 2;
          pts[k] = w / 2 + ((x - camX) / z) * f;
          pts[k + 1] = horizon + ((1.25 - y) / z) * f;
        }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let j = ROWS - 1; j >= 0; j--) {
        ctx.strokeStyle = `rgba(255, 90, 31, ${(0.95 - (j / ROWS) * 0.75).toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i < COLS; i++) {
          const k = (j * COLS + i) * 2;
          if (i) ctx.lineTo(pts[k], pts[k + 1]);
          else ctx.moveTo(pts[k], pts[k + 1]);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255, 90, 31, 0.32)";
      ctx.beginPath();
      for (let i = 0; i < COLS; i++)
        for (let j = 0; j < ROWS; j++) {
          const k = (j * COLS + i) * 2;
          if (j) ctx.lineTo(pts[k], pts[k + 1]);
          else ctx.moveTo(pts[k], pts[k + 1]);
        }
      ctx.stroke();
      // the summit beacon
      const pz = 6.6;
      const px = w / 2 + ((0 - camX) / pz) * f;
      const py = horizon + ((1.25 - height(0, pz, t, false)) / pz) * f;
      ctx.fillStyle = "#ff5a1f";
      ctx.shadowColor = "rgba(255, 90, 31, 0.9)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py - 3, 2.6 + (reduced ? 0 : Math.sin(t * 4) * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - last > 32) {
        t += Math.min(0.05, (now - last) / 1000) * (chaosRef.current ? 2.2 : 0.55);
        last = now;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      left = r.left;
      w = r.width;
      h = r.height;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    window.addEventListener("resize", resize, { passive: true }); // position can shift without a size change
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !reduced && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(c);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return <canvas ref={ref} aria-hidden className={cn("absolute inset-0 h-full w-full", className)} />;
}
