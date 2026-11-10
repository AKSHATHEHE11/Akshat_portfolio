"use client";
// Sheet A-201: the process as the drawing's revision history. The home screen is drawn once; every
// revision inks the part of it that step changed and clouds it, the way a drawing set marks what
// moved since the last issue. Parts a later revision adds are still dashed construction boxes.
// Pick a row in the revision block to see the drawing as it stood at that issue.
import { useCallback, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { revLetter, useDraw, ViewTitle } from "./kit";
import { cloud } from "./logic";
import type { Area, BlueprintScene } from "./scene";
import { AREA, Wireframe } from "./Wireframe";

const PAD = 9;

/** The cloud around an area, and where its revision delta sits (top-right corner). */
function shape(a: Area) {
  const [x, y, w, h] = AREA[a];
  return { d: cloud(x - PAD, y - PAD / 2, w + PAD * 2, h + PAD), tag: [x + w + PAD, y - PAD / 2] as const };
}

export function Revisions({ project }: { project: Project<BlueprintScene> }) {
  const { process } = project;
  const revs = project.scene.revisions;
  const [cur, setCur] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const clouds = useRef<(SVGPathElement | null)[]>([]);
  const reduced = useReducedMotion();
  const seen = useRef(false);
  useDraw(ref);

  const inked = useCallback(
    (a: Area) => {
      const i = revs.findIndex((r) => r.area === a);
      return i < 0 || i <= cur;
    },
    [revs, cur],
  );

  // the current cloud is drafted round its part each time a revision is picked (not on first paint)
  useGSAP(
    () => {
      const el = clouds.current[cur];
      if (!seen.current) return void (seen.current = true);
      if (!el || reduced) return;
      gsap.fromTo(el, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.9, ease: "power2.inOut" });
    },
    { dependencies: [cur, reduced], scope: ref },
  );

  const pick = (i: number) => {
    if (i === cur) return;
    play(i > cur ? "toggle-on" : "toggle-off");
    setCur(i);
  };

  return (
    <section ref={ref} id="process" data-rail="Process" aria-labelledby="bp-rev" className="bp-sheet bp-rev frame">
      <div className="bp-rev-head">
        <ViewTitle n={4} sheet="A-201" id="bp-rev" scale="1 : 1">
          Revisions
        </ViewTitle>
        <p className="bp-instr">Five issues of one screen. Each revision clouds what it changed; pick one to see the drawing as it stood.</p>
      </div>

      <figure className="bp-rev-fig">
        <svg viewBox="-28 -22 380 606" className="bp-wfsvg" aria-hidden>
          <Wireframe inked={inked} />
          {revs.map((r, i) => {
            if (i > cur) return null;
            const s = shape(r.area);
            return (
              <g key={i} className={cn("bp-cloud", i === cur && "is-cur")}>
                <path
                  data-draw
                  ref={(el) => {
                    clouds.current[i] = el;
                  }}
                  d={s.d}
                  className="bp-cloud-line"
                />
                <g transform={`translate(${s.tag[0]} ${s.tag[1]})`}>
                  <g className="bp-delta">
                    <path d="M0 -13L12 8H-12Z" />
                    <text y="5" textAnchor="middle">
                      {revLetter(i)}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
        <figcaption className="sr-only">
          The home screen at revision {revLetter(cur)}: {process[cur]?.title}.
        </figcaption>
      </figure>

      <div className="bp-revblock">
        <div className="bp-revblock-cols" aria-hidden>
          <span>Rev</span>
          <span>Date</span>
          <span>Description</span>
          <span>By</span>
        </div>
        <ol className="bp-revlist">
          {process.map((p, i) => {
            const r = revs[i];
            const on = i === cur;
            return (
              <li key={p.title} className={cn("bp-revrow", on && "is-cur", i > cur && "is-later")}>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`bp-rev-${i}`}
                  onClick={() => pick(i)}
                  onPointerEnter={() => play("tick")}
                  data-cursor="hover"
                  className="bp-revrow-btn"
                >
                  <span className="bp-revrow-l" aria-hidden>
                    <svg viewBox="-13 -14 26 24">
                      <path d="M0 -13L12 8H-12Z" />
                      <text y="5" textAnchor="middle">
                        {revLetter(i)}
                      </text>
                    </svg>
                  </span>
                  <span className="bp-revrow-d">{r?.date}</span>
                  <span className="bp-revrow-t">
                    <span className="sr-only">Revision {revLetter(i)}: </span>
                    {p.title}
                  </span>
                  <span className="bp-revrow-by">{r?.by}</span>
                </button>
                <div id={`bp-rev-${i}`} className="bp-revrow-body" hidden={!on}>
                  <p>{p.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
