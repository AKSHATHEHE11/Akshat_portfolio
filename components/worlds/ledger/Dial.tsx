"use client";
// The score gauge, 300–900: a meter needle on a sprung pivot (elastic settle — the readout wobbles
// with it), the bands printed on the scale. The needle is its own composited layer; the dial face is
// static. Chaos: every few seconds the needle loses its grip and spins.
import { memo, useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { CUT, MAX, MIN } from "./engine";
import type { Band } from "./scene";
import { BAND_WORD } from "./Stamp";

const W = 400;
const H = 228;
const CX = 200;
const CY = 208;
const R = 172;
const NEEDLE = R - 22;

/** score → degrees from straight up (−90 = 300, +90 = 900) */
const angle = (s: number) => ((s - (MIN + MAX) / 2) / ((MAX - MIN) / 2)) * 90;
/** point on the scale at score s, radius r — rounded: Node's and the browser's cos() differ in the last digit */
function at(s: number, r: number) {
  const a = ((angle(s) - 90) * Math.PI) / 180;
  return [Math.round((CX + r * Math.cos(a)) * 100) / 100, Math.round((CY + r * Math.sin(a)) * 100) / 100] as const;
}
function arc(from: number, to: number, r: number) {
  const [x1, y1] = at(from, r);
  const [x2, y2] = at(to, r);
  return `M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`;
}

const BANDS = [
  { from: MIN, to: CUT.review, stroke: "var(--lg-down)" },
  { from: CUT.review, to: CUT.approved, stroke: "var(--lg-signal)" },
  { from: CUT.approved, to: MAX, stroke: "var(--lg-up)" },
];

/** The printed face: band arcs, ticks every 20, numerals every 100. Never re-renders. */
const Face = memo(function Face() {
  const ticks = [];
  for (let s = MIN; s <= MAX; s += 20) {
    const major = s % 100 === 0;
    const [x1, y1] = at(s, R - (major ? 18 : 10));
    const [x2, y2] = at(s, R - 2);
    ticks.push(<line key={s} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={major ? 0.9 : 0.4} strokeWidth={major ? 2 : 1} />);
    if (major) {
      const [tx, ty] = at(s, R - 36);
      ticks.push(
        <text key={`t${s}`} x={tx} y={ty + 4} textAnchor="middle" fill="currentColor" fillOpacity={0.7} fontSize="12" fontFamily="var(--font-mono)">
          {s}
        </text>,
      );
    }
  }
  return (
    <>
      {BANDS.map((b) => (
        <path key={b.from} d={arc(b.from, b.to, R + 8)} fill="none" stroke={b.stroke} strokeWidth={5} />
      ))}
      {ticks}
      <path d={arc(MIN, MAX, R - 52)} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} strokeDasharray="2 5" />
    </>
  );
});

interface Props {
  score: number | null;
  band: Band | null;
  /** a statement is printing: the gauge waits for it */
  pending: boolean;
  chaos: boolean;
  reduced: boolean;
  live: boolean;
}

export function Dial({ score, band, pending, chaos, reduced, live }: Props) {
  const needle = useRef<HTMLDivElement>(null);
  const spin = useRef<HTMLDivElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const now = useRef({ s: MIN });

  // One proxy drives needle, trail and readout together, so they can never disagree.
  useGSAP(
    () => {
      const target = score ?? MIN;
      const text = readout.current?.firstChild;
      const render = () => {
        const s = now.current.s;
        gsap.set(needle.current, { rotation: angle(s) });
        trail.current?.setAttribute("stroke-dashoffset", (1 - (s - MIN) / (MAX - MIN)).toFixed(4));
        const label = score === null ? "· · ·" : String(Math.round(Math.min(MAX, Math.max(MIN, s))));
        if (text instanceof Text && text.data !== label) text.data = label;
      };
      if (reduced) {
        now.current.s = target;
        return void render();
      }
      const far = Math.abs(target - now.current.s) > 120;
      gsap.to(now.current, {
        s: target,
        duration: score === null ? 0.6 : far ? 1.9 : 1,
        ease: score === null ? "power2.in" : "elastic.out(0.85, 0.42)",
        overwrite: true,
        onUpdate: render,
      });
    },
    { dependencies: [score, reduced] },
  );

  // chaos: the needle loses its grip now and then — a separate wrapper, so the score angle is untouched
  useEffect(() => {
    if (!chaos || reduced || !live || score === null) return;
    const el = spin.current;
    const num = readout.current;
    const id = window.setInterval(() => {
      play("glitch");
      num?.classList.add("lg-glitch");
      gsap.fromTo(el, { rotation: 0 }, { rotation: 720 + gsap.utils.random(-40, 40), duration: 1.5, ease: "power4.inOut", onComplete: () => {
        gsap.to(el, { rotation: 720, duration: 0.5, ease: "elastic.out(1, 0.4)", onComplete: () => gsap.set(el, { rotation: 0 }) });
        num?.classList.remove("lg-glitch");
      } });
    }, 4200);
    return () => {
      window.clearInterval(id);
      gsap.killTweensOf(el);
      gsap.set(el, { rotation: 0 });
      num?.classList.remove("lg-glitch");
    };
  }, [chaos, reduced, live, score]);

  return (
    <div className="relative">
      <div className="relative mx-auto w-full max-w-[26rem]" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full text-(--lg-fg)" aria-hidden>
          <Face />
          <path
            ref={trail}
            d={arc(MIN, MAX, R - 52)}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
            fill="none"
            stroke="var(--lg-signal)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
        {/* needle: both boxes pivot on (CX, CY); the outer one is chaos's, the inner one carries the score */}
        <div
          ref={spin}
          aria-hidden
          className="absolute w-3.5 origin-bottom will-change-transform"
          style={{ left: `calc(${(CX / W) * 100}% - 0.4375rem)`, top: `${((CY - NEEDLE) / H) * 100}%`, height: `${(NEEDLE / H) * 100}%` }}
        >
          <div ref={needle} className="absolute inset-0 origin-bottom will-change-transform" style={{ transform: `rotate(${angle(MIN)}deg)` }}>
            <svg viewBox="0 0 14 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
              <path d="M7 0 L9.6 100 L4.4 100 Z" fill="var(--lg-signal)" />
            </svg>
          </div>
        </div>
        <span
          aria-hidden
          className="absolute size-[1.375rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--lg-signal) bg-(--lg-bg) shadow-[0_0_0_4px_rgb(0_0_0/0.45)]"
          style={{ left: `${(CX / W) * 100}%`, top: `${(CY / H) * 100}%` }}
        />
      </div>
      <p className="mt-1 flex items-baseline justify-center gap-3">
        <span
          ref={readout}
          className={cn(
            "font-display text-[clamp(3.6rem,2.6rem+3vw,5rem)] font-[300] leading-[0.85] tracking-[-0.04em] tabular-nums [font-variation-settings:'wdth'_72]",
            score === null && "text-(--lg-fg)/35",
          )}
        >
          · · ·
        </span>
        <span className="font-mono text-[0.75rem] uppercase tracking-[0.14em]">
          <span
            className={cn(
              "block font-semibold",
              band === "approved" ? "lg-up" : band === "declined" ? "lg-down" : band === "review" ? "text-(--lg-signal)" : "text-(--lg-fg)/60",
            )}
          >
            {band ? BAND_WORD[band] : pending ? "Reading" : "No file"}
          </span>
          <span className="block text-(--lg-fg)/55">of {MAX}</span>
        </span>
      </p>
    </div>
  );
}
