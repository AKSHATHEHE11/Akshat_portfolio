"use client";
// Sheet A-501, as built: the outcome as dimension strings that measure themselves when the sheet
// arrives. A before → after value keeps its old dimension underneath, dashed, the way a survey keeps
// the existing line; "5 → 1" draws the five portals and strikes four. Chaos: the dimensions come
// loose and swing.
import { useMemo, useRef, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import type { Metric } from "@/lib/types";
import { seeded } from "@/lib/utils";
import { ViewTitle } from "./kit";
import { measure } from "./logic";

/** The value's centre never sits closer than this to the start of the line (it would hang off the sheet). */
const MID_MIN = 0.18;
const mid = (l: number) => (Math.max(l / 2, MID_MIN) - 1) * 100;

interface Parts {
  line: HTMLSpanElement | null;
  end: HTMLSpanElement | null;
  mid: HTMLSpanElement | null;
  val: HTMLSpanElement | null;
  row: HTMLLIElement | null;
}

export function Dimensions({ metrics }: { metrics: Metric[] }) {
  const ref = useRef<HTMLElement>(null);
  const parts = useRef<Parts[]>([]);
  const reduced = useReducedMotion();
  const dims = useMemo(() => metrics.map((m) => measure(m.value)), [metrics]);
  // ref callbacks run children-first, so whichever arrives first creates the slot
  const slot = (i: number) => (parts.current[i] ??= { line: null, end: null, mid: null, val: null, row: null });

  // every dimension starts at its old length and measures itself to the new one, once
  useGSAP(
    () => {
      if (reduced) return;
      dims.forEach((me, i) => {
        const p = parts.current[i];
        if (!p?.line || !p.end || !p.mid || !p.val || !p.row) return;
        const node = p.val.firstChild as Text | null;
        gsap.set([p.line, p.end, p.mid], { clearProps: "transform" }); // drop the server-rendered end state
        const scale = gsap.quickSetter(p.line, "scaleX");
        const end = gsap.quickSetter(p.end, "xPercent");
        const middle = gsap.quickSetter(p.mid, "xPercent");
        const s = { l: me.l0, v: me.from };
        const apply = () => {
          scale(Math.max(s.l, 0.002));
          end((s.l - 1) * 100);
          middle(mid(s.l));
          const t = me.text(s.v);
          if (node && node.data !== t) node.data = t;
        };
        apply();
        const drop = p.row.querySelectorAll("[data-drop]");
        const tl = gsap.timeline({ scrollTrigger: { trigger: p.row, start: "top 82%", once: true } });
        tl.to(s, { l: me.l1, v: me.to, duration: 1.7, ease: "power3.inOut", onUpdate: apply });
        if (drop.length) tl.to(drop, { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.08, ease: "power2.in" }, 0.35);
      });
    },
    { scope: ref, dependencies: [dims, reduced], revertOnUpdate: true },
  );

  return (
    <section ref={ref} aria-labelledby="bp-dims" className="bp-sheet bp-dims frame">
      <ViewTitle n={7} sheet="A-501" id="bp-dims" scale="As built">
        Dimensions
      </ViewTitle>

      <ul className="bp-mlist">
        {metrics.map((m, i) => {
          const me = dims[i];
          const ghost = me.l0 > 0 && me.l0 !== me.l1 ? (/→/.test(m.value) ? me.text(me.from) : "before") : null;
          const big = me.boxes ? Math.max(...me.boxes) : 0;
          return (
            <li
              key={m.label}
              ref={(el) => {
                slot(i).row = el;
              }}
              className="bp-m bp-swing"
              style={{ "--o": "0% 100%", "--a": `${(seeded(i + 5) * 6 + 3).toFixed(1)}deg`, "--t": `${(2.8 + i * 0.4).toFixed(1)}s` } as CSSProperties}
            >
              <div className="bp-dim2" aria-hidden>
                {ghost && (
                  <span className="bp-d-ghost" style={{ width: `${me.l0 * 100}%` }}>
                    <em style={{ left: `${Math.max(me.l0 / 2, MID_MIN) * 100}%` }}>{ghost}</em>
                  </span>
                )}
                {me.boxes && (
                  <span className="bp-d-boxes">
                    {Array.from({ length: big }, (_, k) => (
                      <i key={k} style={{ left: `${((k + 0.5) / big) * 100}%` }} {...(k >= me.boxes![1] ? { "data-drop": "" } : {})} />
                    ))}
                  </span>
                )}
                <span className="bp-d-ext" />
                <span
                  ref={(el) => {
                    slot(i).line = el;
                  }}
                  className="bp-d-line"
                  style={{ transform: `scaleX(${Math.max(me.l1, 0.002)})` }}
                />
                <span
                  ref={(el) => {
                    slot(i).end = el;
                  }}
                  className="bp-d-endw"
                  style={{ transform: `translateX(${(me.l1 - 1) * 100}%)` }}
                >
                  <span className="bp-d-ext bp-d-ext-b" />
                </span>
                <span
                  ref={(el) => {
                    slot(i).mid = el;
                  }}
                  className="bp-d-midw"
                  style={{ transform: `translateX(${mid(me.l1)}%)` }}
                >
                  <span
                    ref={(el) => {
                      slot(i).val = el;
                    }}
                    className="bp-d-val"
                  >
                    {me.text(me.to)}
                  </span>
                </span>
              </div>
              <div className="bp-m-cap">
                <h3 className="bp-m-l">
                  {m.label}
                  <span className="sr-only">: {m.value}</span>
                </h3>
                {m.note && <p className="bp-m-note">{m.note}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
