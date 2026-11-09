"use client";
import { useRef } from "react";
import { Corners } from "@/components/ui/marks";
import { gsap, useGSAP } from "@/lib/gsap";
import { useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
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
      const aim = () => {
        const r = b.getBoundingClientRect();
        const dx = pointer.x - (r.left + r.width / 2);
        const dy = pointer.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d / 500) * r.width * 0.26;
        xTo((dx / d) * reach);
        yTo((dy / d) * reach);
      };
      gsap.ticker.add(aim);
      return () => gsap.ticker.remove(aim);
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
