"use client";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useCoarse, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Tech, TechGroup } from "@/lib/types";
import type { RailwayScene } from "./scene";

const CODE: Record<TechGroup, string> = { frontend: "FE", backend: "BE", cloud: "CL", ai: "AI", design: "DS", data: "DB", motion: "MO" };

/** Technology as the rake: a locomotive and one coach per tool, each with its coach-position code.
 *  Hover, focus or tap a coach to read why it is coupled to this train. */
export default function Consist({ technologies, train }: { technologies: Tech[]; train: RailwayScene["train"] }) {
  const root = useRef<HTMLElement>(null);
  const [sel, setSel] = useState(0);
  const coarse = useCoarse();
  const reduced = useReducedMotion();
  const codes = useMemo(() => {
    const n: Partial<Record<TechGroup, number>> = {};
    return technologies.map((t) => `${CODE[t.group]}${(n[t.group] = (n[t.group] ?? 0) + 1)}`);
  }, [technologies]);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.from(".rw-rake", {
        xPercent: 55,
        duration: 2.4,
        ease: "power3.out",
        scrollTrigger: { trigger: ".rw-rake-scroll", start: "top 80%", once: true },
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  const t = technologies[sel];
  return (
    <section ref={root} className="rw-consist" aria-labelledby="rw-consist-h">
      <div className="frame rw-consist-head">
        <h2 id="rw-consist-h" className="rw-sec-h">
          <span data-chaos-type>Coach position</span>
          <span lang="hi" className="rw-hi">
            कोच स्थिति
          </span>
        </h2>
        <p>One coach per tool. Walk the rake.</p>
      </div>

      <div className="rw-rake-scroll">
        <div className="rw-rake" role="group" aria-label="Technology, one coach each">
          <Loco no={train.no} />
          {technologies.map((x, i) => (
            <button
              key={x.name}
              type="button"
              className="rw-coach"
              style={{ "--i": i } as CSSProperties}
              aria-pressed={sel === i}
              aria-controls="rw-slip"
              onPointerEnter={() => {
                if (coarse || sel === i) return;
                play("tick");
                setSel(i);
              }}
              onFocus={() => setSel(i)}
              onClick={() => {
                play("click");
                setSel(i);
              }}
              data-cursor="hover"
            >
              <span className="rw-coach-pos">{codes[i]}</span>
              <span className="rw-coach-body">
                <span className="rw-coach-win" />
                <span className="rw-coach-name">{x.name}</span>
                <span className="rw-coach-code">{codes[i]}</span>
              </span>
              <span className="rw-bogies" />
            </button>
          ))}
        </div>
        <div className="rw-rails" aria-hidden />
      </div>

      <div className="frame">
        <div id="rw-slip" className="rw-slip" aria-live="polite">
          <span className="rw-slip-code">{codes[sel]}</span>
          <div>
            <p className="rw-slip-group">{t.group}</p>
            <h3 className="rw-slip-name">{t.name}</h3>
          </div>
          <p className="rw-slip-why">{t.why}</p>
        </div>
      </div>
    </section>
  );
}

function Loco({ no }: { no: string }) {
  return (
    <span className="rw-loco" aria-hidden>
      <svg viewBox="0 0 260 150">
        <path d="M150 30 L150 4 M150 4 L118 20 L150 30 M150 4 L182 20" stroke="#14243f" strokeWidth="3" fill="none" />
        <rect x="120" y="28" width="60" height="6" rx="2" fill="#14243f" />
        <path d="M30 40 Q 32 34 40 34 L250 34 Q 256 34 256 40 L256 118 L14 118 L14 72 Q 16 46 30 40 Z" style={{ fill: "var(--rw-mustard)" }} />
        <path d="M14 98 L256 98 L256 108 L14 108 Z" fill="#14243f" />
        <path d="M24 50 L56 46 L56 76 L18 78 Q 18 60 24 50 Z" fill="#14243f" />
        <rect x="70" y="48" width="22" height="30" rx="3" fill="#14243f" />
        <rect x="214" y="48" width="26" height="30" rx="3" fill="#14243f" />
        <text x="150" y="84" textAnchor="middle" fontSize="22" fontWeight="800" fill="#14243f" style={{ fontFamily: "var(--font-mono)" }}>
          {no}
        </text>
        <circle cx="16" cy="88" r="4" fill="#fff6d8" />
        <g fill="#14243f">
          <rect x="30" y="118" width="80" height="10" rx="3" />
          <rect x="160" y="118" width="80" height="10" rx="3" />
          {[44, 70, 96, 174, 200, 226].map((x) => (
            <circle key={x} cx={x} cy="134" r="11" />
          ))}
        </g>
        <g fill="#8d96a3">
          {[44, 70, 96, 174, 200, 226].map((x) => (
            <circle key={x} cx={x} cy="134" r="4" />
          ))}
        </g>
      </svg>
    </span>
  );
}
