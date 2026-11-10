"use client";
// The campus map inside the app: the route from where the student stands to the room's door is
// drafted, the view pans to frame it, and a walker loops along it while it is on screen.
// Chaos: the scenic route.
import { useMemo, useRef, useState } from "react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { clamp } from "@/lib/utils";
import { pathD, route } from "../logic";
import type { Building, Campus } from "../scene";

if (typeof window !== "undefined") gsap.registerPlugin(MotionPathPlugin);

/** A 2:1 window around the route and its building, kept on the campus. */
function frame(pts: { x: number; y: number }[], b: Building, c: Campus) {
  const xs = [...pts.map((p) => p.x), b.x, b.x + b.w];
  const ys = [...pts.map((p) => p.y), b.y, b.y + b.h];
  let x = Math.min(...xs) - 28;
  let y = Math.min(...ys) - 22;
  let w = Math.max(...xs) + 28 - x;
  let h = Math.max(...ys) + 22 - y;
  if (w / h < 2) {
    x -= (h * 2 - w) / 2;
    w = h * 2;
  } else {
    y -= (w / 2 - h) / 2;
    h = w / 2;
  }
  x = w >= c.w ? (c.w - w) / 2 : clamp(x, 0, c.w - w);
  y = h >= c.h ? (c.h - h) / 2 : clamp(y, 0, c.h - h);
  return [x, y, w, h].map((n) => n.toFixed(1)).join(" ");
}

/** The same walk, wandering: perpendicular sine wobble sampled along each leg. */
function scenic(pts: { x: number; y: number }[]) {
  const out: { x: number; y: number }[] = [pts[0]];
  let t = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / (len || 1);
    const ny = (b.x - a.x) / (len || 1);
    for (let s = 6; s <= len; s += 6) {
      t += 6;
      const k = Math.sin(t / 7) * 9 * Math.min(1, s / 12, (len - s) / 12);
      out.push({ x: +(a.x + ((b.x - a.x) * s) / len + nx * k).toFixed(1), y: +(a.y + ((b.y - a.y) * s) / len + ny * k).toFixed(1) });
    }
    out.push(b);
  }
  return out;
}

export function MiniPlan({ campus, to, room }: { campus: Campus; to: Building; room: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const line = useRef<SVGPathElement>(null);
  const walker = useRef<SVGCircleElement>(null);
  const on = useOnScreen(svg, "0px");
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const walk = useMemo(() => route(campus, campus.you.node, to.door), [campus, to.door]);
  const you = campus.nodes.find((n) => n.id === campus.you.node)!;
  const at = useMemo(() => new Map(campus.nodes.map((n) => [n.id, n])), [campus.nodes]);
  const lanes = useMemo(() => campus.paths.map(([a, b]) => `M${at.get(a)!.x} ${at.get(a)!.y}L${at.get(b)!.x} ${at.get(b)!.y}`).join(""), [campus.paths, at]);
  const d = walk ? pathD(chaos ? scenic(walk.points) : walk.points) : "";
  const view = walk ? frame(walk.points, to, campus) : `0 0 ${campus.w} ${campus.h}`;
  const end = walk?.points.at(-1);
  const [first] = useState(view); // after mount GSAP owns the viewBox, so it can pan

  // pan + draft the route whenever the destination changes
  useGSAP(
    () => {
      if (!svg.current || !line.current) return;
      if (reduced) return void svg.current.setAttribute("viewBox", view);
      gsap.to(svg.current, { attr: { viewBox: view }, duration: 0.8, ease: "power3.inOut", overwrite: true });
      gsap.fromTo(line.current, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1, ease: "power2.inOut", delay: 0.15, overwrite: true });
    },
    { dependencies: [d, view, reduced] },
  );

  // the walker loops only while the map is visible
  useGSAP(
    () => {
      const w = walker.current;
      const p = line.current;
      if (!w || !p || !on || reduced || !walk) return;
      gsap.fromTo(
        w,
        { autoAlpha: 1 },
        {
          motionPath: { path: p, align: p, alignOrigin: [0.5, 0.5] },
          duration: clamp(walk.metres / 70, 2, 5),
          ease: "none",
          repeat: -1,
          repeatDelay: 0.9,
          delay: 1.1,
        },
      );
    },
    { dependencies: [on, d, reduced], revertOnUpdate: true },
  );

  return (
    <svg ref={svg} viewBox={first} className="sid-plan" role="img" aria-label={walk ? `Map: ${walk.metres} metres from ${campus.you.label} to ${room}, ${to.name}` : `Map of ${to.name}`}>
      <path d={lanes} className="sid-plan-lane" />
      {campus.buildings.map((b) =>
        b.oval ? (
          <ellipse key={b.id} cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} className="sid-plan-b" />
        ) : (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3" className={b.id === to.id ? "sid-plan-b sid-plan-to" : "sid-plan-b"} />
            <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 4} textAnchor="middle" className={b.id === to.id ? "sid-plan-t sid-plan-tt" : "sid-plan-t"}>
              {b.h > b.w * 2 ? b.id : b.name}
            </text>
          </g>
        ),
      )}
      <path ref={line} d={d} className="sid-plan-route" />
      <circle cx={you.x} cy={you.y} r="12" className="sid-plan-ring" />
      <circle cx={you.x} cy={you.y} r="6" className="sid-plan-you" />
      {end && (
        <g transform={`translate(${end.x} ${end.y})`}>
          <circle r="7" className="sid-plan-pin" />
          <circle r="2.5" className="sid-plan-pin-c" />
        </g>
      )}
      <circle ref={walker} r="5" className="sid-plan-walker" style={{ visibility: "hidden" }} />
    </svg>
  );
}
