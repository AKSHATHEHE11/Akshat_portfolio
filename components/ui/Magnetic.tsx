"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useCoarse, useReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Pulls its child toward the cursor while hovered, springs back on leave.
 * The outer span stays put (stable hit area); the inner span moves. Off on touch + reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.32,
  className,
}: {
  children: React.ReactNode;
  /** 0..1 — fraction of the cursor offset the child follows */
  strength?: number;
  className?: string;
}) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const coarse = useCoarse();
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i || coarse || reduced) return;
      const xTo = gsap.quickTo(i, "x", { duration: 0.7, ease: "elastic.out(1, 0.45)" });
      const yTo = gsap.quickTo(i, "y", { duration: 0.7, ease: "elastic.out(1, 0.45)" });
      const move = (e: PointerEvent) => {
        const r = o.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };
      o.addEventListener("pointermove", move);
      o.addEventListener("pointerleave", leave);
      return () => {
        o.removeEventListener("pointermove", move);
        o.removeEventListener("pointerleave", leave);
      };
    },
    { dependencies: [coarse, reduced, strength] },
  );

  return (
    <span ref={outer} className={cn("inline-flex", className)}>
      <span ref={inner} className="inline-flex will-change-transform">
        {children}
      </span>
    </span>
  );
}
