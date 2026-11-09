"use client";
// Outcome as hang tags on a clothes rail. The numbers count up when the rail comes into view, and
// each tag is a pendulum: the cursor brushing past pushes it, a tap swings it. Chaos: gusts.
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import type { Metric } from "@/lib/types";
import { clamp, cn, pad, seeded } from "@/lib/utils";
import { splitValue } from "./kit";

const TAGS = [
  { bg: "#f4f1ea", fg: "#14161c", string: 56 },
  { bg: "var(--fy-accent)", fg: "#14161c", string: 104 },
  { bg: "#14161c", fg: "#f4f1ea", string: 72 },
];

export function PriceTags({ metrics, title }: { metrics: Metric[]; title: string }) {
  const root = useRef<HTMLElement>(null);
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  const nums = useRef<(HTMLSpanElement | null)[]>([]);
  const kicks = useRef<number[]>([]);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const onScreen = useOnScreen(root, "0px");

  // count up once, when the rail arrives
  useGSAP(
    () => {
      if (reduced) return;
      const parts = metrics.map((m) => splitValue(m.value));
      const write = (i: number, v: number) => {
        const p = parts[i];
        const el = nums.current[i];
        if (p && el) el.textContent = `${p.prefix}${v.toFixed(p.decimals)}${p.suffix}`;
      };
      parts.forEach((_, i) => write(i, 0));
      ScrollTrigger.create({
        trigger: root.current,
        start: "top 70%",
        once: true,
        onEnter: () =>
          parts.forEach((p, i) => {
            if (!p) return;
            const o = { v: 0 };
            gsap.to(o, { v: p.value, duration: 1.8, delay: i * 0.15, ease: "power3.out", onUpdate: () => write(i, o.v) });
            kicks.current[i] = (i % 2 ? 1 : -1) * 3.2;
          }),
      });
    },
    { scope: root, dependencies: [reduced, metrics], revertOnUpdate: true },
  );

  // pendulums
  useEffect(() => {
    if (reduced || !onScreen) return;
    const n = metrics.length;
    const th = new Array<number>(n).fill(0);
    const om = new Array<number>(n).fill(0);
    const tick = (_: number, ms: number) => {
      const dt = Math.min(ms / 1000, 1 / 30);
      tags.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const near = pointer.inside && pointer.x > r.left - 30 && pointer.x < r.right + 30 && pointer.y > r.top && pointer.y < r.bottom + 10;
        let force = near ? pointer.vx * 0.9 : 0;
        const k = kicks.current[i];
        if (k) {
          om[i] += k;
          kicks.current[i] = 0;
        }
        if (chaos && Math.random() < dt * 0.9) om[i] += (Math.random() - 0.5) * 7;
        if (chaos) force += Math.sin(performance.now() / 300 + i) * 6;
        om[i] += (-22 * th[i] - 1.5 * om[i] + force) * dt;
        th[i] = clamp(th[i] + om[i] * dt, -1.1, 1.1);
        el.style.transform = `rotate(${th[i]}rad)`;
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [reduced, onScreen, chaos, metrics.length]);

  return (
    <section ref={root} id="outcome" aria-labelledby="fy-outcome" className="relative overflow-hidden px-(--margin) pb-16 pt-24 lg:pt-36">
      <div className="mx-auto max-w-(--frame-max)">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 id="fy-outcome" data-chaos-type className="font-serif text-[clamp(3rem,1.6rem+5vw,7.5rem)] italic leading-[0.82] tracking-[-0.025em]">
            Sold through
          </h2>
          <p className="max-w-[30ch] pb-2 font-serif text-[1.35rem] italic leading-tight">The numbers, on the tags. Give one a push.</p>
        </div>

        <div className="relative mt-16 lg:mt-24">
          {/* the rail */}
          <div aria-hidden className="relative mx-[-2%] h-3.5 rounded-full bg-[linear-gradient(180deg,#6f7278,#e6e7e9_38%,#9b9ea4_70%,#55585e)] shadow-[0_10px_18px_-10px_rgb(0_0_0/0.6)]">
            <span className="absolute -left-1 top-1/2 h-10 w-2.5 -translate-y-1/2 rounded-[2px] bg-[#3a3d42]" />
            <span className="absolute -right-1 top-1/2 h-10 w-2.5 -translate-y-1/2 rounded-[2px] bg-[#3a3d42]" />
          </div>
          <ul className="grid grid-cols-3 gap-3 px-[2%] sm:gap-8 lg:px-[8%]">
            {metrics.map((m, i) => {
              const look = TAGS[i % TAGS.length];
              return (
                <li key={m.label} className="flex justify-center">
                  <div ref={(el) => void (tags.current[i] = el)} className="flex origin-top flex-col items-center will-change-transform">
                    <svg aria-hidden width="20" height={look.string + 14} viewBox={`0 0 20 ${look.string + 14}`} className="-mt-2 overflow-visible">
                      <path d={`M10 0C3 0 3 10 10 10M10 10V${look.string + 14}`} fill="none" stroke="#14161c" strokeWidth="1.2" />
                    </svg>
                    <button
                      type="button"
                      onClick={() => {
                        play("tick");
                        kicks.current[i] = (i % 2 ? -1 : 1) * 5;
                      }}
                      aria-label={`${m.label}: ${m.value}${m.note ? ` (${m.note})` : ""}. Swing the tag`}
                      data-cursor="hover"
                      className={cn("fy-tag", "relative -mt-2 flex w-[min(29vw,14rem)] flex-col px-3 pb-4 pt-9 text-left sm:px-5 sm:pt-11")}
                      style={{ background: look.bg, color: look.fg }}
                    >
                      <span aria-hidden className="absolute left-1/2 top-3.5 size-3 -translate-x-1/2 rounded-full bg-(--fy-bg) shadow-[inset_0_1px_2px_rgb(0_0_0/0.45)] sm:top-4 sm:size-3.5" />
                      <span aria-hidden className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] opacity-70 sm:tracking-[0.14em]">
                        {title} / M{pad(i + 1)}
                      </span>
                      <span ref={(el) => void (nums.current[i] = el)} className="mt-2 font-serif text-[clamp(1.9rem,1rem+3.6vw,4.6rem)] italic leading-[0.9] tabular-nums">
                        {m.value}
                      </span>
                      <span className={cn("fy-woven-text", "mt-3 text-[0.6875rem] leading-[1.35] sm:text-[0.75rem]")} style={{ textShadow: "none" }}>
                        {m.label}
                      </span>
                      {m.note ? <span className="mt-2 font-mono text-[0.6875rem] leading-snug opacity-80">{m.note}</span> : null}
                      <TagCode seed={i} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function TagCode({ seed }: { seed: number }) {
  const bars = Array.from({ length: 26 }, (_, j) => 0.6 + Math.floor(seeded(seed * 97 + j * 13) * 3) * 0.7);
  return (
    <span aria-hidden className="mt-4 flex h-5 items-stretch gap-[1.5px] opacity-80">
      {bars.map((w, j) => (
        <span key={j} className="bg-current" style={{ width: `${w}px` }} />
      ))}
    </span>
  );
}
