"use client";
import { useEffect, useId, useRef, type RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { useChaos, useCoarse, useReducedMotion } from "@/lib/hooks";
import { clamp, cn } from "@/lib/utils";
import type { Station } from "./scene";
import { CloudsArt, FieldsArt, GroundArt, HillsArt, PlatformArt, PolesArt, StationBoardArt, TreesArt, TILE } from "./Scenery";

/**
 * Shared, mutable train state. Owners write it; the landscape reads it every frame.
 *  d       distance travelled, in window widths (the ground layer moves 1 W per unit)
 *  t       time of day, 0 = morning departure … 1 = dusk arrival
 *  speed   W per second (the motor integrates it unless d is driven externally)
 *  target  cruising speed the motor eases towards
 *  stopAt  when set, the motor brakes so the train stops exactly at this distance
 */
export interface Drive {
  d: number;
  t: number;
  speed: number;
  target: number;
  stopAt: number | null;
}
export const newDrive = (p: Partial<Drive> = {}): Drive => ({ d: 0, t: 0, speed: 0, target: 0, stopAt: null, ...p });

export interface SceneryItem {
  D: number;
  station: Station;
  kind: "platform" | "board";
}

const LAYERS = [
  { key: "clouds", cls: "rw-l-clouds", speed: 0.03, depth: 4, tile: TILE.clouds, Art: CloudsArt },
  { key: "hills", cls: "rw-l-hills", speed: 0.07, depth: 7, tile: TILE.hills, Art: HillsArt },
  { key: "trees", cls: "rw-l-trees", speed: 0.22, depth: 12, tile: TILE.trees, Art: TreesArt },
  { key: "fields", cls: "rw-l-fields", speed: 0.5, depth: 18, tile: TILE.fields, Art: FieldsArt },
  { key: "ground", cls: "rw-l-ground", speed: 1, depth: 26, tile: TILE.ground, Art: GroundArt },
] as const;
const POLE_SPEED = 1.55;
const COPIES = 6;

// Sky along the day. t: 0 morning (08:15) · .45 noon · .75 afternoon · 1 dusk (17:15)
const STOPS = [0, 0.45, 0.75, 1];
const SKY_TOP = ["#a7c9df", "#74aad5", "#8aa8c4", "#2d3a69"];
const SKY_BOT = ["#f6e7c8", "#dbecf4", "#f5d6a2", "#f08a4b"];
const SUN = ["#fff1c8", "#fffbea", "#ffd27a", "#ff6a3a"];
const TINT = ["#eef1f4", "#ffffff", "#fde6c5", "#cf866a"];
function along(colors: string[], t: number) {
  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1]) i++;
  return gsap.utils.interpolate(colors[i], colors[i + 1], clamp((t - STOPS[i]) / (STOPS[i + 1] - STOPS[i]))) as string;
}
const wrap = (v: number, m: number) => (m ? -(((v % m) + m) % m) : 0);

export function Landscape({
  driveRef,
  items = [],
  active,
  coach,
  className,
}: {
  driveRef: RefObject<Drive>;
  items?: SceneryItem[];
  /** run the frame loop (pass false while off-screen) */
  active: boolean;
  /** coach number shown on the platform's coach-position board */
  coach: string;
  className?: string;
}) {
  const uid = useId().replace(/[^\w-]/g, "");
  const root = useRef<HTMLDivElement>(null);
  const layerEls = useRef<(HTMLDivElement | null)[]>([]);
  const poleEl = useRef<HTMLDivElement>(null);
  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const sunEl = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const live = useRef({ items, chaos, reduced, coarse });
  useEffect(() => {
    live.current = { items, chaos, reduced, coarse };
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const size = { w: 0, h: 0 };
    const tiles = LAYERS.map(() => 0);
    let poleTile = 0;
    let lastT = -1;
    const measure = () => {
      size.w = el.clientWidth;
      size.h = el.clientHeight;
      // tiles overlap by 1px in CSS, so the repeat period is one pixel shorter than the tile
      LAYERS.forEach((L, i) => (tiles[i] = ((layerEls.current[i]?.clientHeight ?? 0) * L.tile.w) / L.tile.h - 1));
      poleTile = ((poleEl.current?.clientHeight ?? 0) * TILE.poles.w) / TILE.poles.h - 1;
      lastT = -1;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let par = 0;
    let skew = 0;
    let lastD = driveRef.current.d;
    const approach = { to: NaN, from: 0, at: 0, T: 1 };

    const render = (dt: number) => {
      const D = driveRef.current;
      const L = live.current;
      const now = performance.now() / 1000;

      // motor: brake onto a platform, or ease towards cruising speed
      if (L.reduced) {
        if (D.stopAt != null) D.d = D.stopAt;
        D.speed = 0;
      } else if (D.stopAt != null) {
        if (approach.to !== D.stopAt) {
          approach.to = D.stopAt;
          approach.from = D.d;
          approach.at = now;
          approach.T = clamp((1.6 * (D.stopAt - D.d)) / Math.max(D.speed, 0.2), 2.2, 5.5);
        }
        const k = Math.min(1, (now - approach.at) / approach.T);
        const nd = approach.from + (D.stopAt - approach.from) * (1 - (1 - k) ** 3);
        D.speed = k >= 1 ? 0 : (nd - D.d) / Math.max(dt, 1e-3);
        D.d = nd;
      } else {
        approach.to = NaN;
        D.speed += (D.target - D.speed) * Math.min(1, dt * 0.9);
        D.d += D.speed * dt;
      }

      // chaos: the world runs backwards past the window
      const sign = L.chaos ? -1 : 1;
      const W = size.w;
      const H = size.h;
      par += ((L.reduced || L.coarse ? 0 : pointer.nx) - par) * 0.05;
      LAYERS.forEach((Ly, i) => {
        const e = layerEls.current[i];
        if (e) e.style.transform = `translate3d(${wrap(sign * D.d * W * Ly.speed + par * Ly.depth, tiles[i]).toFixed(1)}px,0,0)`;
      });

      const pw = Math.min(3 * H, 2.4 * W) / 2;
      const bw = (0.3 * H * 400) / 260 / 2;
      let nearest = Infinity;
      L.items.forEach((it, i) => {
        const e = itemEls.current[i];
        if (!e) return;
        const x = sign * (it.D - D.d) * W * (it.kind === "board" ? 1.1 : 1) - par * 26;
        if (it.kind === "platform") nearest = Math.min(nearest, Math.abs(x));
        const show = Math.abs(x) < (it.kind === "platform" ? pw : bw) + W / 2 + 8;
        e.style.visibility = show ? "visible" : "hidden";
        if (show) e.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px),0,0)`;
      });

      // masts: lean with speed; under a platform canopy they fade out so they never cross the nameboard
      const v = dt > 0 ? (D.d - lastD) / dt : 0;
      lastD = D.d;
      skew += (clamp(-sign * v * 1.4, -11, 11) - skew) * 0.2;
      if (poleEl.current) {
        poleEl.current.style.transform = `translate3d(${wrap(sign * D.d * W * POLE_SPEED + par * 34, poleTile).toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
        poleEl.current.style.opacity = clamp((nearest - pw * 0.25) / (pw * 0.75 + W * 0.25)).toFixed(3);
      }

      if (Math.abs(D.t - lastT) > 0.0005) {
        lastT = D.t;
        el.style.setProperty("--sky-top", along(SKY_TOP, D.t));
        el.style.setProperty("--sky-bot", along(SKY_BOT, D.t));
        el.style.setProperty("--tint", along(TINT, D.t));
        const s = sunEl.current;
        if (s) {
          s.style.setProperty("--sun", along(SUN, D.t));
          s.style.transform = `translate3d(${((0.12 + 0.76 * D.t) * W).toFixed(1)}px,${((0.44 - 0.34 * Math.sin(Math.PI * D.t)) * H).toFixed(1)}px,0)`;
        }
      }
    };

    render(0);
    if (!active) return () => ro.disconnect();
    const tick = (_t: number, deltaMs: number) => render(Math.min(deltaMs, 64) / 1000);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
    };
  }, [active, driveRef]);

  return (
    <div ref={root} className={cn("rw-land", className)} aria-hidden>
      <div ref={sunEl} className="rw-sun" />
      {LAYERS.map((L, i) => (
        <div
          key={L.key}
          ref={(e) => {
            layerEls.current[i] = e;
          }}
          className={cn("rw-layer", L.cls)}
        >
          {Array.from({ length: COPIES }, (_, k) => (
            <svg key={k} viewBox={`0 0 ${L.tile.w} ${L.tile.h}`} style={{ aspectRatio: `${L.tile.w} / ${L.tile.h}` }}>
              {k === 0 ? (
                <g id={`${uid}-${L.key}`}>
                  <L.Art />
                </g>
              ) : (
                <use href={`#${uid}-${L.key}`} />
              )}
            </svg>
          ))}
        </div>
      ))}
      {items.map((it, i) => (
        <div
          key={`${it.kind}-${it.station.code}-${it.D.toFixed(2)}`}
          ref={(e) => {
            itemEls.current[i] = e;
          }}
          className={it.kind === "platform" ? "rw-platform" : "rw-sboard"}
        >
          {it.kind === "platform" ? <PlatformArt station={it.station} coach={coach} /> : <StationBoardArt station={it.station} />}
        </div>
      ))}
      <div ref={poleEl} className="rw-layer rw-l-poles">
        {Array.from({ length: COPIES }, (_, k) => (
          <svg key={k} viewBox={`0 0 ${TILE.poles.w} ${TILE.poles.h}`} style={{ aspectRatio: `${TILE.poles.w} / ${TILE.poles.h}` }}>
            {k === 0 ? (
              <g id={`${uid}-poles`}>
                <PolesArt />
              </g>
            ) : (
              <use href={`#${uid}-poles`} />
            )}
          </svg>
        ))}
      </div>
      <div className="rw-tint" />
    </div>
  );
}
