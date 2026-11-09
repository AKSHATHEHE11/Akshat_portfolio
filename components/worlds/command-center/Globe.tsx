"use client";
// The hologram at the centre of the room: projector ring, halo and base are CSS; the globe itself is
// WebGL (GlobeCanvas, code-split) or — for reduced motion / no WebGL / a crashed context — a static
// 2D-canvas render of the same map, so arcs still point at the regions a decision touches.
import dynamic from "next/dynamic";
import { Component, memo, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { arcPath, landDots, toVec, view } from "./geo";
import type { City } from "./scene";

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false });

export interface GlobeArc {
  key: string;
  to: string;
  tone: "lime" | "alert";
}
export interface GlobeProps {
  cities: City[];
  hq: string;
  /** [lon, lat] to face, null = idle drift */
  focus: [number, number] | null;
  arcs: GlobeArc[];
  chaos: boolean;
}

let webgl: boolean | undefined;
function hasWebGL() {
  if (webgl === undefined) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      webgl = !!gl;
    } catch {
      webgl = false;
    }
  }
  return webgl;
}
const never = () => () => {};

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export const Globe = memo(function Globe(props: GlobeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref, "120px");
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  // null on the server and during hydration, then the probed answer
  const gl = useSyncExternalStore(never, hasWebGL, () => null);
  const live = gl === true && !reduced;
  // the static globe holds the room while three.js downloads; WebGL takes over once it has a context
  const [glReady, setGlReady] = useState(false);

  const flat = <GlobeFlat {...props} />;
  return (
    <div ref={ref} aria-hidden className="relative aspect-square w-full">
      <div className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,rgb(216_255_0/0.14),transparent_64%)]" />
      <div className="cc-orbit absolute inset-[4%]" />
      <div className="cc-ring absolute left-1/2 top-[2%] h-[6%] w-[54%] -translate-x-1/2" />
      {gl !== null && (!live || !glReady) && flat}
      {live && (
        <Fallback fallback={glReady ? flat : null}>
          <GlobeCanvas {...props} active={visible} coarse={coarse} onReady={() => setGlReady(true)} />
        </Fallback>
      )}
      <div className="absolute bottom-[1%] left-1/2 h-[7%] w-[48%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgb(216_255_0/0.3),transparent_70%)]" />
    </div>
  );
});

/** Static render: same projection as the WebGL globe, drawn once per change. */
function GlobeFlat({ cities, hq, focus, arcs, chaos }: GlobeProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dots = useMemo(() => landDots(1.8), []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const byId = new Map(cities.map((c) => [c.id, c]));
    const home = byId.get(hq);
    const lon0 = focus?.[0] ?? home?.lon ?? 0;
    const lat0 = (focus?.[1] ?? 22) * 0.6;
    const ink = chaos ? "255,90,31" : "216,255,0";

    const draw = () => {
      const size = canvas.clientWidth;
      if (!size) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const R = size * 0.345;
      const c = size / 2;
      const at = (v: number[]) => [c + v[0] * R, c - v[1] * R] as const;

      for (let i = 0; i < dots.length; i += 2) {
        const v = view(toVec(dots[i], dots[i + 1]), lon0, lat0);
        if (v[2] <= 0) continue;
        const [x, y] = at(v);
        ctx.fillStyle = `rgba(${ink},${0.2 + v[2] * 0.75})`;
        ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
      }
      ctx.lineWidth = 1.6;
      for (const a of arcs) {
        const to = byId.get(a.to);
        if (!home || !to) continue;
        ctx.strokeStyle = a.tone === "alert" ? "rgba(255,90,31,0.95)" : "rgba(216,255,0,0.95)";
        ctx.beginPath();
        let pen = false;
        for (const p of arcPath([home.lon, home.lat], [to.lon, to.lat])) {
          const v = view(p, lon0, lat0);
          const hidden = v[2] < 0 && Math.hypot(v[0], v[1]) < 1;
          const [x, y] = at(v);
          if (hidden) pen = false;
          else if (pen) ctx.lineTo(x, y);
          else {
            ctx.moveTo(x, y);
            pen = true;
          }
        }
        ctx.stroke();
      }
      const lit = new Set(arcs.map((a) => a.to));
      for (const city of cities) {
        const v = view(toVec(city.lon, city.lat), lon0, lat0);
        if (v[2] <= 0) continue;
        const [x, y] = at(v);
        const on = lit.has(city.id) || city.id === hq;
        ctx.fillStyle = `rgba(${ink},1)`;
        ctx.beginPath();
        ctx.arc(x, y, on ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fill();
        if (on) {
          ctx.strokeStyle = `rgba(${ink},0.6)`;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [dots, cities, hq, focus, arcs, chaos]);

  return <canvas ref={ref} className="absolute inset-0 size-full" />;
}
