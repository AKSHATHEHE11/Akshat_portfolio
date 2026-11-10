"use client";
// Outcome as VU meters: one backlit dial per metric, the needle swings up with VU ballistics (a little
// overshoot, then it settles and breathes) while the figure counts. Chaos pins every needle in the red.
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import type { Metric } from "@/lib/types";
import type { MeterScale } from "./scene";

const SWEEP = 50; // degrees either side of upright
const PIVOT = { x: 100, y: 132 };
const R = 104;

/** "1.9k" → 1900, "120" → 120 */
export function metricValue(v: string) {
  const n = parseFloat(v.replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  return /k\b/i.test(v) ? n * 1000 : n;
}
const angle = (v: number, max: number) => -SWEEP + 2 * SWEEP * Math.min(1, Math.max(0, v / max));
const at = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: PIVOT.x + Math.cos(a) * r, y: PIVOT.y + Math.sin(a) * r };
};
const arc = (from: number, to: number, r: number) => {
  const a = at(from, r);
  const b = at(to, r);
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}A${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};

export function Meters({ metrics, scales, model }: { metrics: Metric[]; scales: MeterScale[]; model: string }) {
  return (
    <section aria-labelledby="nf-out-h" className="frame relative py-24 md:py-36">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2 id="nf-out-h" data-chaos-type className="nf-h2">
          Output
        </h2>
        <p className="max-w-[30ch] pb-1 text-[1.0625rem] leading-snug text-(--fg)/75">Levels after a year of evenings on the {model}.</p>
      </div>
      <ul className="mt-12 grid grid-cols-1 gap-x-(--gutter) gap-y-10 min-[420px]:grid-cols-2 md:mt-16 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <Meter key={m.label} m={m} scale={scales[i]} model={model} />
        ))}
      </ul>
    </section>
  );
}

function Meter({ m, scale: given, model }: { m: Metric; scale?: MeterScale; model: string }) {
  const root = useRef<HTMLLIElement>(null);
  const needle = useRef<HTMLSpanElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const value = metricValue(m.value);
  const scale = given ?? { max: value * 1.25 || 1, ticks: [0, value], red: value * 1.1 || 1 };
  const deg = angle(value, scale.max);
  const kilo = /k\b/i.test(m.value);
  const decimals = kilo ? 1 : (m.value.split(".")[1]?.length ?? 0);

  useGSAP(
    () => {
      if (reduced) return;
      const o = { v: 0 };
      const text = num.current?.firstChild;
      const write = () => {
        if (!(text instanceof Text)) return;
        const s = kilo ? `${(o.v / 1000).toFixed(decimals)}k` : o.v.toFixed(decimals);
        if (text.data !== s) text.data = s;
      };
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 82%", once: true } });
      tl.fromTo(needle.current, { rotation: -SWEEP }, { rotation: deg, duration: 1.5, ease: "back.out(2.4)" }, 0).fromTo(
        o,
        { v: 0 },
        { v: value, duration: 1.3, ease: "power2.out", onUpdate: write, onComplete: () => text instanceof Text && (text.data = m.value) },
        0,
      );
      write();
      // the figure is a text node GSAP doesn't own: put the real value back when this is reverted
      return () => void (text instanceof Text && (text.data = m.value));
    },
    { scope: root, dependencies: [reduced, deg, value], revertOnUpdate: true },
  );

  return (
    <li ref={root} className="nf-meter min-w-0">
      <div className="nf-vu">
        <div className="nf-vu-face">
          <svg viewBox="0 0 200 120" className="absolute inset-0 size-full" aria-hidden>
            <path d={arc(-SWEEP, SWEEP, R - 8)} className="nf-vu-scale" />
            <path d={arc(angle(scale.red, scale.max), SWEEP, R - 4)} className="nf-vu-red" />
            {scale.ticks.map((t) => {
              const a = angle(t, scale.max);
              const p1 = at(a, R - 12);
              const p2 = at(a, R);
              const tx = at(a, R - 24);
              return (
                <g key={t}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="nf-vu-tick" />
                  <text x={tx.x} y={tx.y + 3} textAnchor="middle" className="nf-vu-num-s">
                    {t >= 1000 ? `${t / 1000}k` : t}
                  </text>
                </g>
              );
            })}
            <text x="100" y="92" textAnchor="middle" className="nf-vu-brand">
              {model} · VU
            </text>
          </svg>
          <span ref={needle} aria-hidden className="nf-needle" style={{ transform: `rotate(${deg}deg)` }}>
            <span className="nf-needle-wob" />
          </span>
        </div>
      </div>
      <p className="mt-4">
        <span ref={num} className="nf-vu-value">
          {m.value}
        </span>
      </p>
      <p className="mt-1 text-[1rem] font-[650] leading-tight tracking-[-0.01em]">{m.label}</p>
      {m.note && <p className="mt-1 font-serif text-[1.15rem] italic leading-[1.15] text-(--fg)/72">{m.note}</p>}
    </li>
  );
}
