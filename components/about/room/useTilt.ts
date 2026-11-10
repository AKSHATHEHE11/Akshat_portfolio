"use client";
import { useEffect, type RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";

/**
 * Cursor parallax for the room: the stage tilts a few degrees towards the pointer like a card in the
 * hand, the floor slides the other way. Reads the shared pointer on the GSAP ticker and writes only
 * when the eased value moved (idle = no writes). Off when `on` is false (off-screen, touch, reduced).
 */
export function useTilt(stage: RefObject<HTMLElement | null>, floor: RefObject<SVGSVGElement | null>, on: boolean) {
  useEffect(() => {
    const s = stage.current;
    const f = floor.current;
    if (!on || !s) return;
    let x = 0;
    let y = 0;
    const tick = () => {
      const tx = pointer.inside ? pointer.nx : 0;
      const ty = pointer.inside ? pointer.ny : 0;
      const dx = (tx - x) * 0.06;
      const dy = (ty - y) * 0.06;
      if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) return;
      x += dx;
      y += dy;
      s.style.transform = `perspective(1800px) rotateX(${(y * 2.6).toFixed(3)}deg) rotateY(${(x * 3.4).toFixed(3)}deg)`;
      if (f) f.style.transform = `translate3d(${(-x * 14).toFixed(2)}px, ${(y * 6).toFixed(2)}px, 0)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      s.style.transform = "";
      if (f) f.style.transform = "";
    };
  }, [stage, floor, on]);
}
