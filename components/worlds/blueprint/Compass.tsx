"use client";
// North arrow. The cursor is a magnet: anywhere over the sheet the needle swings toward it, and
// springs back to north when it leaves. A click or tap spins it. Chaos: it never stops spinning.
// Three nested groups, one motion each, so they never fight: chaos spin (CSS) › click spin › aim.
import { useRef, type RefObject } from "react";
import { useLenis } from "lenis/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { cn } from "@/lib/utils";

export function Compass({ zone, className }: { zone: RefObject<HTMLElement | null>; className?: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const spinner = useRef<SVGGElement>(null);
  const needle = useRef<SVGGElement>(null);
  const coarse = useCoarse();
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const on = useOnScreen(btn, "0px"); // the chaos spin rests while the compass is off-screen

  useGSAP(
    () => {
      const z = zone.current;
      const n = needle.current;
      if (!z || !n || coarse || reduced) return;
      gsap.set(n, { svgOrigin: "48 48" });
      const turn = gsap.quickTo(n, "rotation", { duration: 0.9, ease: "elastic.out(1, 0.42)" });
      // the centre in page coordinates: measured once (and after a resize), never per move
      let centre: { x: number; y: number } | null = null;
      const scroll = () => lenis?.scroll ?? 0;
      const forget = () => (centre = null);
      let last = 0;
      const aim = (deg: number) => {
        // shortest way round from where it points now
        last += ((((deg - last) % 360) + 540) % 360) - 180;
        turn(last);
      };
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" || !btn.current) return;
        if (!centre) {
          const r = btn.current.getBoundingClientRect();
          centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 + scroll() };
        }
        const dx = e.clientX - centre.x;
        const dy = e.clientY - (centre.y - scroll());
        aim(Math.hypot(dx, dy) < 30 ? 0 : (Math.atan2(dx, -dy) * 180) / Math.PI);
      };
      const leave = () => aim(0);
      z.addEventListener("pointermove", move);
      z.addEventListener("pointerleave", leave);
      window.addEventListener("resize", forget);
      return () => {
        z.removeEventListener("pointermove", move);
        z.removeEventListener("pointerleave", leave);
        window.removeEventListener("resize", forget);
      };
    },
    { dependencies: [coarse, reduced, lenis], revertOnUpdate: true },
  );

  const { contextSafe } = useGSAP();
  // two turns, overshoot, spring back to north (a second click mid-spin carries on from where it is)
  const spin = contextSafe(() => {
    play("click");
    const s = spinner.current;
    if (!s) return;
    if (reduced) return emit("toast", { text: "Reduced motion is on, so north stays put." });
    const from = Number(gsap.getProperty(s, "rotation")) % 360;
    gsap
      .timeline()
      .fromTo(s, { rotation: from }, { rotation: 738, svgOrigin: "48 48", duration: 1.8, ease: "power3.out", overwrite: true })
      .to(s, { rotation: 720, duration: 1.2, ease: "elastic.out(1, 0.3)" })
      .set(s, { rotation: 0 });
  });

  return (
    <button
      ref={btn}
      type="button"
      onClick={spin}
      aria-label="North arrow. Spin it."
      data-cursor="hover"
      data-cursor-label="SPIN"
      data-chaos-escape
      data-on={on || undefined}
      className={cn("bp-compass", className)}
    >
      <svg viewBox="0 -14 96 110" aria-hidden>
        <circle cx="48" cy="48" r="38" />
        <circle cx="48" cy="48" r="31" className="bp-thin" />
        <path
          d={Array.from({ length: 24 }, (_, i) => {
            const a = (i * Math.PI) / 12;
            const r0 = i % 6 === 0 ? 26 : 34;
            return `M${(48 + Math.sin(a) * r0).toFixed(2)} ${(48 - Math.cos(a) * r0).toFixed(2)}L${(48 + Math.sin(a) * 38).toFixed(2)} ${(48 - Math.cos(a) * 38).toFixed(2)}`;
          }).join("")}
          className="bp-thin"
        />
        <g className="bp-spin">
          <g ref={spinner}>
            <g ref={needle}>
              <path d="M48 14L55 48H41Z" className="bp-fill-acc" />
              <path d="M48 82L55 48H41Z" className="bp-needle-s" />
              <circle cx="48" cy="48" r="3" className="bp-fill" />
            </g>
          </g>
        </g>
        <text x="48" y="-2" textAnchor="middle">
          N
        </text>
      </svg>
    </button>
  );
}
