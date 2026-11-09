"use client";
import type { RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { useSystem } from "@/lib/system";

/**
 * Heading entrance for the home scenes: every [data-rise] line inside `scope` rises out of its
 * clipping parent the first time the heading scrolls in, and re-arms after a boot replay
 * (restart). No SplitText on purpose — these headings carry data-chaos-type and the chaos layer
 * owns their letters.
 */
export function useRise(scope: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  const booted = useSystem((s) => s.booted);
  useGSAP(
    () => {
      const el = scope.current;
      if (!el || reduced) return;
      gsap.from(el.querySelectorAll("[data-rise]"), {
        yPercent: 118,
        rotate: 2.5,
        duration: 1.1,
        stagger: 0.09,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    },
    // revertOnUpdate: booted/reduced settle after mount; without it the first tween keeps fighting the new one
    { scope, dependencies: [reduced, booted], revertOnUpdate: true },
  );
}
