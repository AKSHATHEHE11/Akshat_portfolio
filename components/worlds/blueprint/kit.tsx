"use client";
// Drawing primitives every sheet of the set uses: the view title (bubble + title + scale), the
// hatches, and the "lines draw themselves" scroll hook.
import type { ReactNode, RefObject } from "react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(DrawSVGPlugin);

/** Revision letters: 0 → "A". */
export const revLetter = (i: number) => String.fromCharCode(65 + i);

/**
 * An architectural view title: the split bubble (view number over sheet number), the title on a
 * heavy rule, and the scale under it. The title is the section's h2.
 */
export function ViewTitle({
  n,
  sheet,
  id,
  scale,
  children,
  className,
}: {
  n: number;
  sheet: string;
  id: string;
  scale: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bp-vt", className)}>
      <span className="bp-bubble" aria-hidden>
        <b>{n}</b>
        <i>{sheet}</i>
      </span>
      <div className="min-w-0">
        <h2 id={id} data-chaos-type className="bp-vt-title">
          {children}
        </h2>
        <p className="bp-vt-scale">
          <span className="sr-only">Sheet {sheet}, </span>Scale {scale}
        </p>
      </div>
    </div>
  );
}

/** Hatch patterns (one set per page; ids are global). */
export function Hatches() {
  return (
    <defs>
      <pattern id="bp-h-diag" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth=".7" />
      </pattern>
      <pattern id="bp-h-cross" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0V7M0 0H7" stroke="currentColor" strokeWidth=".6" />
      </pattern>
      <pattern id="bp-h-dots" width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r=".8" fill="currentColor" />
        <circle cx="6.5" cy="5.5" r=".55" fill="currentColor" />
        <path d="M4 7.6l1.4-1.6 1 1.9z" fill="none" stroke="currentColor" strokeWidth=".45" />
      </pattern>
      <pattern id="bp-h-earth" width="14" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 10L10 0M7 10L14 3" stroke="currentColor" strokeWidth=".6" />
        <circle cx="10" cy="8" r=".7" fill="currentColor" />
      </pattern>
      <pattern id="bp-h-zig" width="8" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 6L2 1L6 11L8 6" fill="none" stroke="currentColor" strokeWidth=".6" />
      </pattern>
    </defs>
  );
}

/**
 * Lines draw themselves when the sheet scrolls in: every [data-draw] path is drafted, then every
 * [data-ink] label fades onto the paper. Reduced motion: the finished drawing.
 */
export function useDraw(scope: RefObject<HTMLElement | null>, start = "top 74%") {
  const reduced = useReducedMotion();
  useGSAP(
    () => {
      const el = scope.current;
      if (!el || reduced) return;
      const lines = el.querySelectorAll("[data-draw]");
      const ink = el.querySelectorAll("[data-ink]");
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start, once: true } });
      if (lines.length) tl.from(lines, { drawSVG: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.035 }, 0);
      if (ink.length) tl.from(ink, { autoAlpha: 0, duration: 0.5, stagger: 0.025, ease: "power1.out" }, 0.45);
    },
    { scope, dependencies: [reduced], revertOnUpdate: true },
  );
}

/** Architectural dimension: extension lines, 45° ticks, text above. Coordinates in the parent SVG. */
export function Dim({ x1, x2, y, text, ext = 6, draw = true }: { x1: number; x2: number; y: number; text: string; ext?: number; draw?: boolean }) {
  const d = draw ? { "data-draw": "" } : {};
  return (
    <g className="bp-dim">
      <path {...d} d={`M${x1} ${y - ext}V${y + 3}M${x2} ${y - ext}V${y + 3}M${x1 - 4} ${y}H${x2 + 4}`} />
      <path {...d} d={`M${x1 - 3} ${y + 3}l6 -6M${x2 - 3} ${y + 3}l6 -6`} className="bp-tick" />
      <text data-ink x={(x1 + x2) / 2} y={y - 3.5} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
