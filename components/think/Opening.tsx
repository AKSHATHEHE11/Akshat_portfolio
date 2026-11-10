"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";

const WORD = "Think";
/* figure-eight riding the strokes of the two italic o's of "loops" (viewBox = the "oo" box, stretched) */
const LOOP =
  "M50.5 60C54.5 44 69 32 81 32C90 32 94 45 94 60C94 75 81 88 69 88C60 88 54.5 76 50.5 60C46.5 44 44 32 32 32C23 32 7 45 7 60C7 75 8 88 20 88C29 88 46.5 76 50.5 60";

/**
 * The page's one typographic moment: THINK, wide and heavy, letters that squash under the pointer
 * (the width axis stepped, never tweened through decimals), and "in loops." with a signal running
 * a figure-eight through its two o's. Chaos: the signal runs backwards, faster.
 */
export function Opening() {
  const root = useRef<HTMLElement>(null);
  const orbit = useRef<SVGSVGElement>(null);
  const [squash, setSquash] = useState<number | null>(null);
  const letGo = useRef(0); // one release timer for taps, so a quick second tap isn't cut short by the first
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const visible = useOnScreen(root, "0px");

  // the orbit is SMIL: no JS loop, and it stops while the opening is off screen
  useEffect(() => {
    const svg = orbit.current;
    if (!svg) return;
    if (visible && !reduced) svg.unpauseAnimations();
    else svg.pauseAnimations();
  }, [visible, reduced, chaos]);

  const press = (i: number) => {
    if (reduced || chaos) return;
    setSquash(i);
    play("tick");
  };
  const level = (i: number) => (squash === null ? 0 : i === squash ? 2 : Math.abs(i - squash) === 1 ? 1 : 0);
  const lap = chaos ? "1.6s" : "5.5s";
  const path = chaos ? "1;0" : "0;1";

  return (
    <section ref={root} id="think" data-rail="Think" aria-labelledby="tk-h1" className="tk-open frame">
      <h1 id="tk-h1" className="tk-h1" aria-label="Think in loops.">
        <span className="tk-think" data-chaos-type onPointerLeave={() => setSquash(null)}>
          {WORD.split("").map((ch, i) => (
            <span
              key={i}
              className="tk-l"
              data-sq={level(i)}
              style={{ "--i": i } as CSSProperties}
              onPointerEnter={(e) => e.pointerType === "mouse" && press(i)}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse") return;
                press(i);
                window.clearTimeout(letGo.current);
                letGo.current = window.setTimeout(() => setSquash(null), 420);
              }}
            >
              <span aria-hidden className="tk-l-ghost">
                {ch}
              </span>
              <span className="tk-l-ink">{ch}</span>
            </span>
          ))}
        </span>
        <em className="tk-loops">
          in l
          <span className="tk-oo">
            oo
            <svg ref={orbit} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="tk-orbit">
              <path d={LOOP} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
              {!reduced && (
                <path
                  key={`tail-${chaos}`}
                  d={LOOP}
                  pathLength={100}
                  fill="none"
                  stroke="#ff5a1f"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="16 84"
                >
                  <animate attributeName="stroke-dashoffset" values={chaos ? "-100;0" : "16;-84"} dur={lap} repeatCount="indefinite" />
                </path>
              )}
              <g key={`dot-${chaos}`}>
                {!reduced && <animateMotion dur={lap} repeatCount="indefinite" path={LOOP} keyPoints={path} keyTimes="0;1" calcMode="linear" />}
                <ellipse cx={reduced ? 50.5 : 0} cy={reduced ? 60 : 0} rx="3.4" ry="3" fill="#ff5a1f" />
              </g>
            </svg>
          </span>
          ps.
        </em>
      </h1>
    </section>
  );
}
