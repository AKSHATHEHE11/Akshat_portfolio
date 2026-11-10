"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useChaos, useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { cn, pad } from "@/lib/utils";
import { Meter } from "../Meter";
import { BOX, FX, GROUPS, PARENTS, ROW, SKILLS, layout, rootTrace, skillTrace, type Mode } from "./layout";
import { Readout, type Probe } from "./Readout";
import "./build.css";

if (typeof window !== "undefined") gsap.registerPlugin(DrawSVGPlugin);

const same = (a: Probe, b: Probe) => a?.kind === b?.kind && a?.i === b?.i;
const undash = (el: Element) => {
  const s = (el as SVGPathElement).style;
  s.strokeDasharray = "";
  s.strokeDashoffset = "";
};

/**
 * BUILD SYSTEM — the skill map as a schematic: root → five groups → their parts. The wires power on
 * outward the first time it scrolls in; pointing at (or focusing, or tapping) a part lights its wire
 * from the root and the readout prints its note, level and years. Chaos: the wiring rewires itself.
 */
export function BuildSystem() {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<Probe>(null);
  const [pin, setPin] = useState<Probe>(null);
  const [parents, setParents] = useState<number[]>(PARENTS);
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const booted = useSystem((s) => s.booted);
  const visible = useOnScreen(root, "0px");

  const mode: Mode = w && w < 640 ? "tall" : "wide";
  const L = useMemo(() => layout(mode, w), [mode, w]);
  const wiring = chaos && !reduced ? parents : PARENTS;
  const probe = hot ?? pin;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // power-on: root, then its wires, the groups, their wires, the parts — once, when it scrolls in
  useGSAP(
    () => {
      if (reduced || !w) return;
      const q = gsap.utils.selector(box);
      const wires = q("[data-trace]");
      const clear = "opacity,visibility,transform";
      const tl = gsap
        .timeline({ paused: true, onComplete: () => wires.forEach(undash) })
        .from(q(".ab-sys-root"), { autoAlpha: 0, scale: 0.94, duration: 0.5, ease: "snap", clearProps: clear })
        .from(q('[data-trace="root"]'), { drawSVG: 0, duration: 0.6, stagger: 0.07, ease: "power2.inOut" }, 0.2)
        .from(q(".ab-sys-group"), { autoAlpha: 0, x: -10, duration: 0.45, stagger: 0.07, clearProps: clear }, 0.5)
        .from(q('[data-trace="skill"]'), { drawSVG: 0, duration: 0.5, stagger: 0.022, ease: "power2.inOut" }, 0.75)
        .from(q(".ab-sys-skill"), { autoAlpha: 0, x: -8, duration: 0.4, stagger: 0.022, clearProps: clear }, 0.95)
        .call(() => play("toggle-on"), [], 0.95);
      ScrollTrigger.create({ trigger: box.current, start: "top 78%", once: true, onEnter: () => tl.play() });
    },
    { scope: root, dependencies: [w > 0, booted, reduced], revertOnUpdate: true },
  );

  // chaos: every so often a couple of parts get patched into the wrong group
  useEffect(() => {
    if (!chaos || reduced || !visible) return;
    const id = window.setInterval(() => {
      setParents((p) => {
        const n = [...p];
        for (let j = 0; j < 2; j++) {
          const k = (Math.random() * n.length) | 0;
          n[k] = Math.random() < 0.35 ? PARENTS[k] : (n[k] + 1 + ((Math.random() * (GROUPS.length - 1)) | 0)) % GROUPS.length;
        }
        return n;
      });
    }, 1300);
    return () => window.clearInterval(id);
  }, [chaos, reduced, visible]);

  // a wire that changes route is re-drawn from its group out
  const was = useRef(wiring);
  useEffect(() => {
    const prev = was.current;
    was.current = wiring;
    if (reduced || prev === wiring) return;
    const el = box.current;
    wiring.forEach((g, k) => {
      if (g === prev[k]) return;
      const path = el?.querySelector(`[data-trace="skill"][data-k="${k}"]`);
      if (path) gsap.fromTo(path, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.45, ease: "power2.out", overwrite: true, onComplete: () => undash(path) });
    });
  }, [wiring, reduced]);

  const lit = useMemo(() => {
    if (!probe) return null;
    if (probe.kind === "skill") return { groups: [wiring[probe.i]], skills: [probe.i] };
    return { groups: [probe.i], skills: SKILLS.flatMap((_, k) => (wiring[k] === probe.i ? [k] : [])) };
  }, [probe, wiring]);

  const handlers = (p: NonNullable<Probe>) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setHot(p);
      play("tick");
    },
    onPointerLeave: () => setHot((h) => (same(h, p) ? null : h)),
    onFocus: () => setHot(p),
    onBlur: () => setHot((h) => (same(h, p) ? null : h)),
    onClick: () => {
      play("click");
      setPin((cur) => (same(cur, p) ? null : p));
    },
  });

  const wide = mode === "wide";
  const row = ROW[mode];
  /** a node box centred on y; wide columns are fractions so they place correctly before measuring */
  const at = (x: number, fx: number, y: number, h: number): CSSProperties => ({ left: wide ? `${fx * 100}%` : x, top: y - h / 2, height: h });

  return (
    <section ref={root} id="build" data-rail="Build" aria-labelledby="ab-build" className="frame scroll-mt-[var(--nav-h)] py-[clamp(4rem,11vh,8rem)]">
      <div className="grid gap-y-8 lg:grid-cols-12 lg:gap-x-(--gutter)">
        <h2 id="ab-build" data-chaos-type className="display text-display-m lg:col-span-12">
          How I&rsquo;m <span className="serif-accent">wired.</span>
        </h2>

        <div
          ref={box}
          className="ab-sys relative lg:col-span-8"
          data-mode={mode}
          data-probe={probe ? "" : undefined}
          style={{ height: L.h }}
          onPointerLeave={() => setHot(null)}
        >
          {w > 0 && (
            <svg className="ab-sys-wires" width={w} height={L.h} viewBox={`0 0 ${w} ${L.h}`} aria-hidden>
              {GROUPS.map((g, gi) => (
                <path key={g.id} data-trace="root" d={rootTrace(L, gi)} />
              ))}
              {SKILLS.map((s, k) => (
                <path key={s.name} data-trace="skill" data-k={k} data-off={wiring[k] !== PARENTS[k] || undefined} d={skillTrace(L, k, wiring[k])} />
              ))}
              {lit && (
                <g key={`${probe?.kind}${probe?.i}`} className="ab-sys-lit">
                  {lit.groups.map((gi) => (
                    <path key={gi} d={rootTrace(L, gi)} pathLength={1} />
                  ))}
                  {lit.skills.map((k) => (
                    <path key={k} className="ab-sys-lit-2" d={skillTrace(L, k, wiring[k])} pathLength={1} />
                  ))}
                </g>
              )}
            </svg>
          )}

          <div className="ab-sys-root" style={wide ? { top: L.root.y - BOX.rootH / 2, width: BOX.rootW, height: BOX.rootH } : { top: 0, height: BOX.tallRootH }}>
            <span className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.16em]">Build system</span>
            <span className="label text-fg-muted">{pad(SKILLS.length)} parts</span>
          </div>

          <ul aria-label="Skill groups">
            {GROUPS.map((g, gi) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="ab-sys-group"
                  style={{ ...at(L.groups[gi].x, FX.group, L.groups[gi].y, BOX.groupH), width: BOX.groupW }}
                  data-on={lit?.groups.includes(gi) || undefined}
                  data-cursor="hover"
                  aria-pressed={same(pin, { kind: "group", i: gi })}
                  aria-label={`${g.label}: ${g.summary} ${g.skills.length} parts.`}
                  {...handlers({ kind: "group", i: gi })}
                >
                  <span>{g.label}</span>
                  <span className="text-fg-muted">{pad(g.skills.length)}</span>
                </button>
                <ul aria-label={g.label}>
                  {SKILLS.map((s, k) =>
                    s.gi !== gi ? null : (
                      <li key={s.name}>
                        <button
                          type="button"
                          className="ab-sys-skill"
                          style={at(L.skills[k].x, FX.skill, L.skills[k].y, row)}
                          data-on={lit?.skills.includes(k) || undefined}
                          data-cursor="hover"
                          aria-pressed={same(pin, { kind: "skill", i: k })}
                          {...handlers({ kind: "skill", i: k })}
                        >
                          <span aria-hidden className="ab-sys-pad" />
                          <span className="truncate font-medium">{s.name}</span>
                          <span className="sr-only">
                            , level {s.level} of 5, {s.years} {s.years === 1 ? "year" : "years"}. {s.note}
                          </span>
                          <span aria-hidden className="ab-sys-leader" />
                          <Meter level={s.level} className="shrink-0" />
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <Readout
          probe={probe}
          wiring={wiring}
          coarse={coarse}
          className={cn(
            "lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:col-span-4 lg:self-start",
            "max-lg:sticky max-lg:bottom-0 max-lg:z-[20] max-lg:-mx-(--margin) max-lg:border-t max-lg:border-line-strong max-lg:bg-bg max-lg:px-(--margin) max-lg:pt-3 max-lg:pb-safe",
          )}
        />
      </div>
    </section>
  );
}
