"use client";
// Sheet A-301: the decisions as detail callouts. On the key plan every decision is a circle callout
// (detail number over sheet) on the part of the screen it shaped. Press one and the circle grows
// into the detail: that part drawn at 2:1, the alternatives that were on the table, and, once you
// pick one, its note, the option that was built and why.
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Project } from "@/lib/types";
import { clamp, cn } from "@/lib/utils";
import { revLetter, ViewTitle } from "./kit";
import type { Area, BlueprintScene } from "./scene";
import { AREA, centre, Wireframe } from "./Wireframe";

/** Key plan viewBox: the phone (300 × 560) with room for bubbles either side. */
const VB = { x: -64, y: -12, w: 428, h: 584 };
const pct = (v: number, o: number, s: number) => `${(((v - o) / s) * 100).toFixed(2)}%`;

/** The callout ring on the plan and where its bubble sits (alternating sides). */
function spot(a: Area, i: number) {
  const [, , w, h] = AREA[a];
  const [cx, cy] = centre(a);
  const r = Math.min(46, Math.min(w, h) / 2 + 12);
  const right = i % 2 === 0;
  const bx = right ? 334 : -34;
  return { cx, cy, r, bx, by: cy, right };
}

export function Details({ project }: { project: Project<BlueprintScene> }) {
  const { decisions } = project;
  const spots = project.scene.details;
  const [open, setOpen] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => decisions.map(() => null));
  const ref = useRef<HTMLElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const zoom = useRef<SVGSVGElement>(null);
  const bubbles = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion();
  const d = decisions[open];
  const area = spots[open]?.area ?? "next";
  const [zx, zy] = centre(area);
  const r = clamp(Math.max(AREA[area][2], AREA[area][3]) / 2 + 16, 70, 150); // the whole part, never closer than ~2:1
  const view = `${zx - r} ${zy - r} ${r * 2} ${r * 2}`;
  const [first] = useState(view); // after mount GSAP owns the viewBox, so it can pan
  const pick = picks[open];

  // pan the 2:1 view to the newly opened detail
  const { contextSafe } = useGSAP(
    () => {
      if (!zoom.current) return;
      if (reduced) return void zoom.current.setAttribute("viewBox", view);
      gsap.to(zoom.current, { attr: { viewBox: view }, duration: 0.8, ease: "power3.inOut", overwrite: true });
    },
    { dependencies: [view, reduced], scope: ref },
  );

  const show = contextSafe((i: number) => {
    if (i === open) return;
    play("open");
    setOpen(i);
    // the lens grows out of the callout that was pressed (measured at rest, not mid-flight)
    if (reduced || !lens.current) return;
    gsap.set(lens.current, { clearProps: "transform" });
    const from = bubbles.current[i]?.getBoundingClientRect();
    const to = lens.current.getBoundingClientRect();
    if (!from || !to.width) return;
    gsap.fromTo(
      lens.current,
      {
        x: from.left + from.width / 2 - (to.left + to.width / 2),
        y: from.top + from.height / 2 - (to.top + to.height / 2),
        scale: from.width / to.width,
      },
      { x: 0, y: 0, scale: 1, duration: 0.8, ease: "expo.out", overwrite: true, clearProps: "transform" },
    );
  });

  const choose = (j: number) => {
    play(j === d.chosen ? "success" : "press");
    setPicks((p) => p.map((v, k) => (k === open ? j : v)));
  };

  return (
    <section ref={ref} aria-labelledby="bp-det" className="bp-sheet bp-det frame">
      <div className="bp-det-side">
        <ViewTitle n={5} sheet="A-301" id="bp-det" scale="1 : 1 · details 2 : 1">
          Details
        </ViewTitle>
        <p className="bp-instr">
          {decisions.length} calls that shaped the screen. Open a callout, pick the option you&apos;d have built.
        </p>

        <div className="bp-keyplan">
          <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="bp-wfsvg bp-keyplan-svg" aria-hidden>
            <Wireframe initials={project.scene.student.initials} />
            {spots.map((s, i) => {
              const p = spot(s.area, i);
              const x0 = p.right ? p.cx + p.r : p.cx - p.r;
              const x1 = p.right ? p.bx - 22 : p.bx + 22;
              return (
                <g key={i} className={cn("bp-callring", i === open && "is-open")}>
                  <circle cx={p.cx} cy={p.cy} r={p.r} />
                  <path d={`M${x0} ${p.cy}H${x1}`} />
                </g>
              );
            })}
          </svg>
          <ul className="bp-bubbles" aria-label="Detail callouts">
            {spots.map((s, i) => {
              const p = spot(s.area, i);
              return (
                <li key={i} style={{ left: pct(p.bx, VB.x, VB.w), top: pct(p.by, VB.y, VB.h) }}>
                  <button
                    ref={(el) => {
                      bubbles.current[i] = el;
                    }}
                    type="button"
                    className="bp-bub"
                    aria-current={i === open ? "true" : undefined}
                    aria-label={`Detail ${i + 1}: ${decisions[i]?.question}${picks[i] != null ? " (answered)" : ""}`}
                    onClick={() => show(i)}
                    onPointerEnter={() => play("tick")}
                    data-cursor="open"
                    data-cursor-label="DETAIL"
                  >
                    <b>{i + 1}</b>
                    <i>A-301</i>
                    {picks[i] != null && (
                      <span className="bp-bub-ok" aria-hidden>
                        <Check size={10} strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {d && (
        <div className="bp-det-main">
          <div ref={lens} className="bp-lens" aria-hidden>
            <svg ref={zoom} viewBox={first} className="bp-wfsvg bp-lens-svg">
              <Wireframe initials={project.scene.student.initials} />
            </svg>
            <span className="bp-lens-ring" />
            <span className="bp-lens-cross" />
            <span className="bp-lens-tag">
              <b>{open + 1}</b>
              <i>A-301</i>
            </span>
          </div>

          <div className="bp-det-text">
            <h3 className="bp-det-q" key={open}>
              {d.question}
            </h3>
            <p className="bp-det-meta">
              Detail {open + 1} · scale 2 : 1 · {d.options.length} options
            </p>
            <div role="radiogroup" aria-label={d.question} className="bp-opts">
              {d.options.map((o, j) => {
                const picked = pick === j;
                const built = pick != null && j === d.chosen;
                const dropped = pick != null && j !== d.chosen;
                return (
                  <label key={`${open}-${o.label}`} className={cn("bp-opt", picked && "is-picked", built && "is-built", dropped && "is-dropped")} data-cursor="hover">
                    <input type="radio" name={`bp-det-${open}`} checked={picked} onChange={() => choose(j)} className="bp-opt-in" />
                    <span className="bp-opt-k" aria-hidden>
                      {revLetter(j)}
                    </span>
                    <span className="bp-opt-body">
                      <span className="bp-opt-l">{o.label}</span>
                      {(picked || built) && <span className="bp-opt-note">{o.note}</span>}
                    </span>
                    {built && <span className="bp-opt-stamp">Built</span>}
                  </label>
                );
              })}
            </div>
            <p className="bp-why" aria-live="polite">
              {pick != null && (
                <>
                  <b>{pick === d.chosen ? "That's the one I built." : `I built option ${revLetter(d.chosen)}.`}</b> {d.why}
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
