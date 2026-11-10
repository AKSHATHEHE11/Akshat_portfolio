"use client";
import { memo, useEffect, useRef } from "react";
import { site } from "@/data/site";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { pad } from "@/lib/utils";
import { cos, lab, setText, sin, toMat } from "./lab";

const X_NUMS = Array.from({ length: 26 }, (_, i) => i * 100);
const Y_NUMS = Array.from({ length: 90 }, (_, i) => i * 100);
// lab's bit-exact trig, rounded: Math.cos/sin differ between Node and Chrome and broke hydration here
const PROTRACTOR = Array.from({ length: 19 }, (_, i) => {
  const d = i * 5;
  const a = (d * Math.PI) / 180;
  const long = d % 15 === 0;
  const at = (r: number) => [+(-cos(a) * r).toFixed(2), +(-sin(a) * r).toFixed(2)];
  return { d, long, p0: at(long ? 160 : 170), p1: at(180), t: at(146) };
});

/**
 * The self-healing cutting mat: grid, angle guides, a protractor, rulers on two edges and a live
 * coordinate readout. Static markup (memo); the ruler marks follow the pointer from the shared
 * ticker while it is over the mat (fine pointers), or jump to the last tap (touch).
 */
export const Mat = memo(function Mat() {
  const root = useRef<HTMLDivElement>(null);
  const mx = useRef<HTMLSpanElement>(null);
  const my = useRef<HTMLSpanElement>(null);
  const tx = useRef<HTMLSpanElement>(null);
  const ty = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mat = root.current?.parentElement;
    if (!mat) return;
    let last = "";
    let rule = 28;
    const show = (vx: number, vy: number) => {
      const p = toMat(vx, vy);
      const x = Math.round(p.x - rule);
      const y = Math.round(p.y - rule);
      const key = `${x},${y}`;
      if (key === last) return;
      last = key;
      mx.current?.style.setProperty("transform", `translate3d(${x + rule}px,0,0)`);
      my.current?.style.setProperty("transform", `translate3d(0,${y + rule}px,0)`);
      setText(tx.current, pad(Math.max(0, x), 4));
      setText(ty.current, pad(Math.max(0, y), 4));
    };
    const tick = () => show(pointer.x, pointer.y);
    const enter = (e: PointerEvent) => {
      rule = parseFloat(getComputedStyle(mat).getPropertyValue("--rule")) || 28;
      mat.dataset.tracking = "";
      if (e.pointerType === "mouse") gsap.ticker.add(tick);
    };
    const leave = () => {
      delete mat.dataset.tracking;
      gsap.ticker.remove(tick);
    };
    const tap = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") show(e.clientX, e.clientY);
    };
    mat.addEventListener("pointerenter", enter);
    mat.addEventListener("pointerleave", leave);
    mat.addEventListener("pointerdown", tap);
    return () => {
      leave();
      mat.removeEventListener("pointerenter", enter);
      mat.removeEventListener("pointerleave", leave);
      mat.removeEventListener("pointerdown", tap);
    };
  }, []);

  return (
    <div ref={root} aria-hidden className="pg-print">
      <div className="pg-lines" />
      <div className="pg-ghost" />
      <i className="pg-diag" style={{ rotate: "30deg" }} />
      <i className="pg-diag" style={{ rotate: "45deg" }} />
      <i className="pg-diag" style={{ rotate: "60deg" }} />
      <svg className="pg-protractor" viewBox="-200 -200 200 200">
        <path d="M-180 0A180 180 0 0 1 0-180" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M-120 0A120 120 0 0 1 0-120" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 4" />
        {PROTRACTOR.map(({ d, long, p0, p1, t }) => (
          <g key={d}>
            <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke="currentColor" strokeWidth={long ? 1 : 0.6} />
            {long && d > 0 && d < 90 ? (
              <text x={t[0]} y={t[1] + 3} fontSize="8" textAnchor="middle" fill="currentColor">
                {d}
              </text>
            ) : null}
          </g>
        ))}
      </svg>

      <div className="pg-ruler pg-ruler-x">
        {X_NUMS.map((n) => (
          <span key={n} style={{ left: `calc(var(--rule) + ${n}px)` }}>
            {n}
          </span>
        ))}
        <span ref={mx} className="pg-mark" />
      </div>
      <div className="pg-ruler pg-ruler-y">
        {Y_NUMS.map((n) => (
          <span key={n} style={{ top: `calc(var(--rule) + ${n}px)` }}>
            {n}
          </span>
        ))}
        <span ref={my} className="pg-mark" />
      </div>
      <div className="pg-corner" />
      <p className="pg-coords">
        X <span ref={tx}>0000</span> · Y <span ref={ty}>0000</span>
        <span className="max-sm:hidden"> PX</span>
      </p>
      <p className="pg-spec" data-chaos-drift>
        {site.version} · self-healing lab mat · 1 cell = 20 px · always cut away from you
      </p>
    </div>
  );
});

/** Keeps lab.mat / lab.vw / lab.vh current. Measures on resize only (never inside a frame loop). */
export function measureMat(mat: HTMLElement) {
  const r = mat.getBoundingClientRect();
  lab.mat = { top: r.top + window.scrollY, left: r.left + window.scrollX, w: r.width, h: r.height };
  lab.vw = window.innerWidth;
  lab.vh = window.innerHeight;
}
