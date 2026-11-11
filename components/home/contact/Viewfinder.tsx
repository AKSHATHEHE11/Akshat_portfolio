"use client";
import { useRef } from "react";
import { Corners } from "@/components/ui/marks";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
import { system } from "@/lib/system";
import { cn } from "@/lib/utils";

/** Viewfinder brackets whose orange crosshair quietly aims at the cursor (still on touch / reduced motion). */
export function Viewfinder({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const cross = useRef<HTMLSpanElement>(null);
  const coarse = useCoarse();
  const reduced = useReducedMotion();
  const on = useOnScreen(box);

  useGSAP(
    () => {
      const b = box.current;
      const c = cross.current;
      if (!b || !c || coarse || reduced || !on) return;
      const xTo = gsap.quickTo(c, "x", { duration: 0.8, ease: "power3.out" });
      const yTo = gsap.quickTo(c, "y", { duration: 0.8, ease: "power3.out" });
      // The box only moves when the page scrolls, resizes or re-lays out, while its section animates in,
      // or (chaos) while it drifts. So it is measured until it has held still for 10 frames, and again
      // after any of those — not on every tick: a rect read per frame forces a layout whenever anything
      // else on the page changed.
      let r = b.getBoundingClientRect();
      let still = 0;
      const goal = { x: NaN, y: NaN };
      const stale = () => (still = 0);
      window.addEventListener("scroll", stale, { passive: true });
      window.addEventListener("resize", stale);
      ScrollTrigger.addEventListener("refresh", stale);
      const aim = () => {
        if (still < 10 || system.get().chaos) {
          const n = b.getBoundingClientRect();
          still = n.x === r.x && n.y === r.y && n.width === r.width ? still + 1 : 0;
          r = n;
        }
        const dx = pointer.x - (r.left + r.width / 2);
        const dy = pointer.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d / 500) * r.width * 0.26;
        // re-aiming at the same spot would restart both tweens every frame
        const x = (dx / d) * reach;
        const y = (dy / d) * reach;
        if (x !== goal.x) xTo((goal.x = x));
        if (y !== goal.y) yTo((goal.y = y));
      };
      gsap.ticker.add(aim);
      return () => {
        gsap.ticker.remove(aim);
        window.removeEventListener("scroll", stale);
        window.removeEventListener("resize", stale);
        ScrollTrigger.removeEventListener("refresh", stale);
      };
    },
    { dependencies: [coarse, reduced, on], revertOnUpdate: true },
  );

  return (
    <div ref={box} aria-hidden data-chaos-drift className={cn("relative size-[5.5rem] shrink-0 text-fg", className)}>
      <Corners size={18} inset={0} weight={2} />
      <span ref={cross} className="absolute inset-0 grid place-items-center">
        <span className="relative block size-7 before:absolute before:inset-y-0 before:left-1/2 before:w-[2px] before:-translate-x-1/2 before:bg-signal after:absolute after:inset-x-0 after:top-1/2 after:h-[2px] after:-translate-y-1/2 after:bg-signal" />
      </span>
    </div>
  );
}
