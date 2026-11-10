"use client";
// Sheet A-002, general notes: the story as the three states every drawing set knows. EXISTING —
// five portals, five logins. PROPOSED — one building in front, the portals moved behind it.
// AS BUILT — two of them demolished. One timeline holds all three; the layer toggles scrub it.
import { useRef, useState, type KeyboardEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { useDraw, ViewTitle } from "./kit";
import type { BlueprintScene } from "./scene";

const STATES = ["Existing", "Proposed", "As built"] as const;
const S = { x: 78, y: 160 }; // the student
const SPREAD = [
  [250, 18],
  [404, 60],
  [292, 138],
  [420, 198],
  [236, 252],
];
const W = 100;
const H = 40;
const column = (i: number) => [408, 14 + i * 60];
const SID = { x: 186, y: 96, w: 136, h: 128 };

export function Story({ project }: { project: Project<BlueprintScene> }) {
  const { portals } = project.scene;
  const notes = [project.challenge, project.solution, project.outcome];
  const ref = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [state, setState] = useState(0);
  const reduced = useReducedMotion();
  useDraw(ref);

  useGSAP(
    () => {
      const q = gsap.utils.selector(svg);
      const t = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      // existing → proposed
      t.to(q("[data-login]"), { drawSVG: "0%", duration: 0.35, stagger: 0.04 }, 0)
        .to(q("[data-count5]"), { autoAlpha: 0, duration: 0.2 }, 0)
        .fromTo(q("[data-sid]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5 }, 0.35)
        .fromTo(q("[data-one]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.3 }, 0.7)
        .fromTo(q("[data-sid-ink]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.6)
        .fromTo(q("[data-service]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.3, stagger: 0.05 }, 0.75);
      portals.forEach((_, i) => {
        const [x, y] = column(i);
        t.fromTo(`[data-portal="${i}"]`, { x: SPREAD[i][0], y: SPREAD[i][1] }, { x, y, duration: 0.55 }, 0.15 + i * 0.03);
      });
      t.addLabel("p1", 1.1);
      // proposed → as built
      t.fromTo(q("[data-hatch]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, 1.15)
        .to(q("[data-retire-solid]"), { autoAlpha: 0.25, duration: 0.3 }, 1.15)
        .fromTo(q("[data-retire]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 1.2)
        .fromTo(q("[data-x]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.3, stagger: 0.08 }, 1.3)
        .to(q("[data-service-retired]"), { drawSVG: "0%", duration: 0.25 }, 1.2);
      t.addLabel("p2", 1.7);
      tl.current = t;
      svg.current?.setAttribute("data-live", ""); // GSAP holds the Existing state now; the CSS stand-in can go
      return () => {
        tl.current = null;
      };
    },
    { scope: svg, dependencies: [portals.length] },
  );

  const show = (i: number) => {
    if (i === state) return;
    play(i > state ? "toggle-on" : "toggle-off");
    setState(i);
    const t = tl.current;
    if (!t) return;
    const time = i === 0 ? 0 : t.labels[`p${i}`];
    if (reduced) t.pause(time);
    else t.tweenTo(time, { duration: Math.abs(time - t.time()) * 0.95 + 0.2, ease: "power1.inOut", overwrite: true });
  };

  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = (state + d + STATES.length) % STATES.length;
    show(i);
    tabs.current[i]?.focus();
  };

  return (
    <section ref={ref} aria-labelledby="bp-notes" className="bp-sheet bp-story frame">
      <div className="bp-story-text">
        <ViewTitle n={2} sheet="A-002" id="bp-notes" scale="NTS">
          General notes
        </ViewTitle>
        <div role="tablist" aria-label="Drawing state" className="bp-layers" onKeyDown={onKey}>
          {STATES.map((s, i) => (
            <button
              key={s}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`bp-state-${i}`}
              aria-selected={state === i}
              aria-controls="bp-note"
              tabIndex={state === i ? 0 : -1}
              onClick={() => show(i)}
              onPointerEnter={() => play("tick")}
              data-cursor="hover"
              className="bp-layer"
            >
              <span className="bp-layer-box" aria-hidden />
              {s}
            </button>
          ))}
        </div>
        <div id="bp-note" role="tabpanel" aria-labelledby={`bp-state-${state}`} className="bp-note-panel">
          <p className="bp-note-n label">Note {state + 1}</p>
          <p key={state} className="bp-note-text">
            {notes[state]}
          </p>
        </div>
      </div>

      <figure className="bp-story-fig">
        <svg ref={svg} viewBox="0 0 540 320" className="bp-story-svg" aria-hidden>
          <path data-draw className="bp-thin bp-frame" d="M2 2H538V318H2Z" />
          {/* the student */}
          <g className="bp-person">
            <circle data-draw cx={S.x} cy={S.y - 16} r="7" />
            <path data-draw d={`M${S.x} ${S.y - 9}V${S.y + 14}M${S.x - 11} ${S.y}H${S.x + 11}M${S.x} ${S.y + 14}l-8 14M${S.x} ${S.y + 14}l8 14`} />
            <text data-ink x={S.x} y={S.y + 46} textAnchor="middle">
              STUDENT
            </text>
          </g>
          {/* five logins */}
          {SPREAD.map(([x, y], i) => (
            <path key={i} data-login className="bp-login" d={`M${S.x + 12} ${S.y}L${x} ${y + H / 2}`} />
          ))}
          <text data-count5 x={S.x + 30} y={S.y - 36} className="bp-acc-text">
            {portals.length} LOGINS
          </text>
          {/* the new front door */}
          <path data-sid className="bp-wall" d={`M${SID.x} ${SID.y + 50}V${SID.y}H${SID.x + SID.w}V${SID.y + SID.h}H${SID.x}V${SID.y + 78}`} />
          <rect data-hatch x={SID.x + 3} y={SID.y + 3} width={SID.w - 6} height={SID.h - 6} fill="url(#bp-h-diag)" className="bp-hatch" />
          <g data-sid-ink>
            <text x={SID.x + SID.w / 2} y={SID.y + SID.h / 2 - 4} textAnchor="middle" className="bp-sid-name">
              {project.title.toUpperCase()}
            </text>
            <text x={SID.x + SID.w / 2} y={SID.y + SID.h / 2 + 12} textAnchor="middle" className="bp-small">
              ONE DOOR
            </text>
            <path d={`M${SID.x} ${SID.y + 50}a28 28 0 0 1 -28 28`} className="bp-thin" />
          </g>
          <path data-one className="bp-one" d={`M${S.x + 12} ${S.y}H${SID.x - 2}`} />
          {/* services from the new building back to the old systems */}
          {portals.map((p, i) => {
            const [, y] = column(i);
            const y0 = SID.y + 16 + i * 24;
            return (
              <path
                key={p.name}
                {...(p.retired ? { "data-service-retired": "" } : {})}
                data-service
                className="bp-service"
                d={`M${SID.x + SID.w} ${y0}H${SID.x + SID.w + 30}L404 ${y + H / 2}`}
              />
            );
          })}
          {/* the old systems */}
          {portals.map((p, i) => (
            <g key={p.name} data-portal={i} transform={`translate(${SPREAD[i][0]} ${SPREAD[i][1]})`}>
              <rect {...(p.retired ? { "data-retire-solid": "" } : {})} width={W} height={H} className="bp-portal" />
              <text x="8" y="17" className="bp-portal-name">
                {p.name.toUpperCase()}
              </text>
              <text x="8" y="31" className="bp-small">
                {p.does}
              </text>
              {p.retired && (
                <>
                  <rect data-retire width={W} height={H} className="bp-portal-gone" />
                  <path data-x d={`M0 0L${W} ${H}M${W} 0L0 ${H}`} className="bp-x" />
                  <text data-retire x={W} y={H + 11} textAnchor="end" className="bp-acc-text">
                    RETIRED
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>
        <figcaption className="sr-only">
          {STATES[state]}: {notes[state]}
        </figcaption>
      </figure>
    </section>
  );
}
