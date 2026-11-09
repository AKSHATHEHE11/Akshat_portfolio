"use client";
import { useId, useRef, type CSSProperties, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import type { PipelineStage } from "@/data/think";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { clamp, cn } from "@/lib/utils";
import { Module, type ModuleState } from "./Module";
import "./think.css";

/* Board geometry in viewBox units. The modules are HTML laid over the SVG at the same coordinates,
   so the board keeps the viewBox aspect ratio and pipes, nodes and modules scale together. */
const W = 1400;
const H = 370;
const MOD_W = 170;
const MOD_H = 180;
const STEP = 205;
const TOP = 100;
const MID = TOP + MOD_H / 2; // link pipes
const BUS = 340;
const LOOP = "M40 100V76Q40 40 76 40H1324Q1360 40 1360 76V100"; // SHIP → OBSERVE feedback pipe
const DASH = "70 1100"; // one packet on the loop (pathLength 1000); the gap keeps it fully off-path at rest
const cx = (i: number) => MOD_W / 2 + i * STEP;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Scroll progress 0..1 → signal position in module units (0..last), dwelling at each module. */
function signalAt(p: number, last: number) {
  const f = clamp(p) * last;
  const k = Math.min(Math.floor(f), last - 1);
  const t = clamp((f - k - 0.2) / 0.6);
  return k + t * t * (3 - 2 * t);
}

interface Props {
  stages: readonly PipelineStage[];
  active: number;
  hover: number | null;
  reduced: boolean;
  chaos: boolean;
  onActive: (i: number) => void;
  onHover: (i: number | null) => void;
  describedBy: (i: number) => string;
  className?: string;
  /** rendered under the board, inside the sticky stage (the readout) */
  children?: ReactNode;
}

/**
 * Desktop pipeline: seven modules on a pipe board. Scrolling walks an orange signal along the bus
 * (the board holds in a sticky stage meanwhile); reaching SHIP sends a packet back over the feedback
 * loop to OBSERVE. Clicking a module scrolls the signal to it.
 */
export function Pipeline({ stages, active, hover, reduced, chaos, onActive, onHover, describedBy, className, children }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const pulse = useRef<SVGGElement>(null);
  const packet = useRef<SVGGElement>(null);
  const spill = useRef<SVGGElement>(null);
  const lit = useRef<SVGLineElement>(null);
  const heat = useRef<SVGRectElement>(null);
  const flare = useRef<SVGRectElement>(null);
  const loop = useRef<SVGGElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const prevActive = useRef(active);
  const lenis = useLenis();
  const uid = useId().replace(/[^\w-]/g, "");
  const ref = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${uid}-${name})`;
  const last = stages.length - 1;
  const shown = hover ?? active;
  const stateOf = (i: number): ModuleState => (i === shown ? "active" : reduced || i <= active ? "passed" : "idle");

  // The sticky stage's height sets the track length (see .track). Measured before sibling sections
  // create their ScrollTriggers. Re-measured only when the WIDTH changes: the readout swapping text
  // must not resize the track (and refresh every trigger) mid-scroll.
  useIsomorphicLayoutEffect(() => {
    const t = track.current;
    const st = stage.current;
    if (!t || !st) return;
    let w = 0;
    let timer = 0;
    const measure = () => {
      const width = st.offsetWidth;
      if (width === w) return;
      const first = w === 0;
      w = width;
      t.style.setProperty("--stage-h", `${st.offsetHeight}px`);
      if (!first) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => ScrollTrigger.refresh(), 160);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(st);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // Writes straight to the SVG — no React render per scroll frame.
  const render = (p: number) => {
    const pos = signalAt(p, last);
    const x = (cx(0) + pos * STEP).toFixed(1);
    pulse.current?.setAttribute("transform", `translate(${x} ${BUS})`);
    packet.current?.setAttribute("transform", `translate(${x} ${MID})`);
    spill.current?.setAttribute("transform", `translate(${x} 0)`);
    lit.current?.setAttribute("x2", x);
    heat.current?.setAttribute("opacity", (0.18 + 0.62 * p).toFixed(3));
    onActive(Math.round(pos));
  };

  useGSAP(
    () => {
      if (reduced) {
        lit.current?.setAttribute("x2", String(cx(last)));
        heat.current?.setAttribute("opacity", "0.8");
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(
        { tall: "(min-width: 1024px) and (min-height: 600px)", short: "(min-width: 1024px) and (max-height: 599.98px)" },
        (ctx) => {
          const st = stage.current;
          if (!st || !track.current || !board.current) return;
          const stickyTop = () => parseFloat(getComputedStyle(st).top) || 0;
          const proxy = { p: 0 };
          const tween = gsap.to(proxy, {
            p: 1,
            ease: "none",
            onUpdate: () => render(proxy.p),
            scrollTrigger: ctx.conditions?.tall
              ? {
                  trigger: track.current,
                  start: () => `top top+=${stickyTop()}`,
                  end: () => `bottom top+=${stickyTop() + st.offsetHeight}`,
                  scrub: 0.5,
                  invalidateOnRefresh: true,
                }
              : { trigger: board.current, start: "top 80%", end: "bottom 30%", scrub: 0.5 },
          });
          trigger.current = tween.scrollTrigger ?? null;
          render(0);
          return () => {
            trigger.current = null;
          };
        },
      );
      return () => mm.revert();
    },
    { dependencies: [reduced], revertOnUpdate: true },
  );

  // The loop closes: arriving at SHIP sends a packet back over the top to OBSERVE.
  useGSAP(
    () => {
      const was = prevActive.current;
      prevActive.current = active;
      if (reduced || active !== last || was !== last - 1 || !loop.current || !flare.current) return;
      play("toggle-on");
      gsap
        .timeline()
        .fromTo(
          loop.current.children,
          { attr: { "stroke-dashoffset": -1010 } },
          { attr: { "stroke-dashoffset": 80 }, duration: 1.4, ease: "power1.inOut" },
        )
        .fromTo(flare.current, { opacity: 0 }, { opacity: 1, duration: 0.22, yoyo: true, repeat: 1, ease: "power2.out" }, 0.55);
    },
    { dependencies: [active, reduced] },
  );

  const pick = (i: number) => {
    play("press");
    const t = trigger.current;
    if (!t) return onActive(i);
    const y = t.start + ((t.end - t.start) * i) / last;
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div ref={track} className={cn("brain-track", className)}>
      <div ref={stage} className="brain-stage py-6">
        <div className="frame">
          <div ref={board} className="brain-board">
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden focusable="false">
              <defs>
                <radialGradient id={ref("spill")}>
                  <stop offset="0" stopColor="#ff5a1f" stopOpacity="0.2" />
                  <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={ref("glow")}>
                  <stop offset="0" stopColor="#fff1e6" />
                  <stop offset="0.22" stopColor="#ff8a4c" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={ref("heat")}>
                  <stop offset="0" stopColor="#ffb27f" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={ref("metal")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#24221f" />
                  <stop offset="0.3" stopColor="#cfc8bc" />
                  <stop offset="0.55" stopColor="#857f75" />
                  <stop offset="0.82" stopColor="#3a3733" />
                  <stop offset="1" stopColor="#141312" />
                </linearGradient>
                <linearGradient id={ref("copper")} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffd9bf" />
                  <stop offset="0.28" stopColor="#ff9a5c" />
                  <stop offset="0.55" stopColor="#ff5a1f" />
                  <stop offset="0.85" stopColor="#a8360a" />
                  <stop offset="1" stopColor="#5a1d05" />
                </linearGradient>
              </defs>

              {/* light the signal throws on the wall behind the board */}
              <g ref={spill} transform={`translate(${cx(0)} 0)`}>
                <ellipse cx="0" cy={MID} rx="320" ry="230" fill={url("spill")} />
              </g>

              {/* feedback loop pipe + its packet */}
              <path d={LOOP} fill="none" stroke="#060606" strokeWidth="16" strokeLinecap="round" />
              <path d={LOOP} fill="none" stroke="#3d3a35" strokeWidth="12" strokeLinecap="round" />
              <path d={LOOP} fill="none" stroke="#7d776d" strokeWidth="6" />
              <path d={LOOP} fill="none" stroke="#e1dacd" strokeWidth="1.4" strokeOpacity="0.5" />
              <g ref={loop}>
                <path d={LOOP} pathLength={1000} fill="none" stroke="#ff5a1f" strokeOpacity="0.35" strokeWidth="11" strokeLinecap="round" strokeDasharray={DASH} strokeDashoffset={-1010} />
                <path d={LOOP} pathLength={1000} fill="none" stroke="#ffd2b3" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={DASH} strokeDashoffset={-1010} />
              </g>
              {[40, 1360].map((x) => (
                <g key={x}>
                  {[80, 85.5, 91].map((y) => (
                    <rect key={y} x={x - 11} y={y} width="22" height="3.6" rx="1.8" fill={url("copper")} stroke="#3a1405" strokeWidth="0.6" />
                  ))}
                </g>
              ))}

              {/* the coil heats up as the signal progresses */}
              <g transform="translate(700 40)">
                <rect x="-66" y="-9" width="132" height="18" fill="#141312" />
                {Array.from({ length: 9 }, (_, k) => (
                  <rect key={k} x={-60 + k * 14} y="-18" width="8" height="36" rx="4" fill={url("copper")} stroke="#3a1405" strokeWidth="0.8" />
                ))}
                <rect x="-88" y="-16" width="22" height="32" rx="5" fill={url("metal")} stroke="#060606" />
                <rect x="66" y="-16" width="22" height="32" rx="5" fill={url("metal")} stroke="#060606" />
                <rect ref={heat} x="-80" y="-34" width="160" height="68" rx="34" fill={url("heat")} opacity="0.18" />
                <rect ref={flare} x="-110" y="-48" width="220" height="96" rx="48" fill={url("heat")} opacity="0" />
              </g>

              {/* short pipes between modules; their core lights once the signal has passed */}
              {stages.slice(0, -1).map((st, i) => {
                const x0 = MOD_W + i * STEP;
                const len = STEP - MOD_W;
                return (
                  <g key={st.id}>
                    <rect x={x0 - 2} y={MID - 8} width={len + 4} height="16" fill={url("metal")} />
                    <rect x={x0 + 1} y={MID - 12} width="5" height="24" rx="1.5" fill={url("metal")} stroke="#060606" strokeWidth="0.8" />
                    <rect x={x0 + len - 6} y={MID - 12} width="5" height="24" rx="1.5" fill={url("metal")} stroke="#060606" strokeWidth="0.8" />
                    <g className="brain-linkLit" data-on={reduced || i < active ? "1" : "0"}>
                      <rect x={x0 + 6} y={MID - 5} width={len - 12} height="10" rx="5" fill="#ff5a1f" opacity="0.35" />
                      <rect x={x0 + 6} y={MID - 2} width={len - 12} height="4" rx="2" fill="#ffc29b" />
                    </g>
                  </g>
                );
              })}

              {/* the same signal at pipe height: modules hide it, so it only shows travelling through the links */}
              <g ref={packet} transform={`translate(${cx(0)} ${MID})`} opacity={reduced ? 0 : 1}>
                <circle r="11" fill={url("glow")} />
                <circle r="2.6" fill="#fff4ec" />
              </g>

              {/* drops into the bus */}
              {[`M40 ${TOP + MOD_H}V${BUS - 22}Q40 ${BUS} 62 ${BUS}`, `M1360 ${TOP + MOD_H}V${BUS - 22}Q1360 ${BUS} 1338 ${BUS}`].map((d) => (
                <g key={d}>
                  <path d={d} fill="none" stroke="#060606" strokeWidth="11" />
                  <path d={d} fill="none" stroke="#5b5650" strokeWidth="7" />
                  <path d={d} fill="none" stroke="#d6cfc3" strokeWidth="1.2" strokeOpacity="0.5" />
                </g>
              ))}

              {/* dotted bus, the lit trail behind the signal, one node per module */}
              <line x1="62" x2="1338" y1={BUS} y2={BUS} stroke="#f2eee7" strokeOpacity="0.45" strokeWidth="2.2" strokeDasharray="0.1 8" strokeLinecap="round" />
              <line ref={lit} x1={cx(0)} x2={cx(0)} y1={BUS} y2={BUS} stroke="#ff5a1f" strokeWidth="2.5" strokeLinecap="round" />
              {stages.map((st, i) => (
                <g key={st.id} className="brain-node" data-state={stateOf(i)} transform={`translate(${cx(i)} ${BUS})`}>
                  <circle r="15" className="brain-ping" />
                  <circle r="15.5" className="brain-halo" />
                  <circle r="9" className="brain-dot" />
                </g>
              ))}
              <g ref={pulse} transform={`translate(${cx(0)} ${BUS})`} opacity={reduced ? 0 : 1}>
                <circle r="28" fill={url("glow")} />
                <circle r="4.5" fill="#fff4ec" />
              </g>

              {/* chaos: several signals at once */}
              {chaos && !reduced && (
                <g>
                  {[0, 1, 2].map((k) => (
                    <g key={k} className="brain-comet" style={{ "--dur": `${1.05 + k * 0.6}s`, "--delay": `${-k * 0.45}s` } as CSSProperties}>
                      <circle cy={BUS} r="18" fill={url("glow")} />
                      <circle cy={BUS} r="3.5" fill="#fff4ec" />
                    </g>
                  ))}
                  {[0, 1].map((k) => (
                    <path
                      key={k}
                      d={LOOP}
                      pathLength={1000}
                      fill="none"
                      stroke="#ffd2b3"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={DASH}
                      className="brain-loopRun"
                      style={{ "--dur": `${1.3 + k * 0.8}s`, "--delay": `${-k * 0.5}s` } as CSSProperties}
                    />
                  ))}
                </g>
              )}
            </svg>

            {stages.map((st, i) => (
              <Module
                key={st.id}
                stage={st}
                index={i}
                total={stages.length}
                state={stateOf(i)}
                current={i === active}
                lamp
                describedBy={describedBy(i)}
                onHover={onHover}
                onPick={pick}
                className="brain-placed"
                style={{ left: pct(i * STEP, W), top: pct(TOP, H), width: pct(MOD_W, W), height: pct(MOD_H, H) }}
              />
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
