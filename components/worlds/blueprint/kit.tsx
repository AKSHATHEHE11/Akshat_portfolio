"use client";
// Drawing primitives every sheet of the set uses: the view title (bubble + title + scale), the
// hatches, and the "lines draw themselves" scroll hook.
import { useRef, type ReactNode, type RefObject } from "react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { system } from "@/lib/system";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") gsap.registerPlugin(DrawSVGPlugin);

/** Revision letters: 0 → "A". */
export const revLetter = (i: number) => String.fromCharCode(65 + i);

/**
 * `shown(el, at)` is true when this component hydrated server HTML whose intro trigger (`at` of the
 * viewport) had already passed: a reload mid-page, a #link. The visitor is looking at the finished
 * drawing, so it stays finished; un-drawing it to replay the intro would flash. Client navigations
 * mount before their first paint (with the system ready), so they always get the intro. The flag is
 * taken at first render, so StrictMode's second effect pass reads the same answer. Call in effects.
 */
export function useShownAtHydration() {
  const hydrating = useRef(!system.get().ready);
  return (el: Element | null, at: number) => hydrating.current && !!el && el.getBoundingClientRect().top < window.innerHeight * at;
}

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
          {/* a ratio never breaks across lines: "2 : 1", not "2 / : 1" */}
          <span className="sr-only">Sheet {sheet}, </span>Scale&nbsp;{scale.replace(/ : /g, " : ")}
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
    </defs>
  );
}

/**
 * Lines draw themselves when the sheet scrolls in: every [data-draw] path is drafted, then every
 * [data-ink] label fades onto the paper. Reduced motion: the finished drawing.
 */
export function useDraw(scope: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  const shown = useShownAtHydration();
  useGSAP(
    () => {
      const el = scope.current;
      if (!el || reduced || shown(el, 0.74)) return;
      const lines = el.querySelectorAll("[data-draw]");
      const ink = el.querySelectorAll("[data-ink]");
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 74%", once: true } });
      if (lines.length) tl.from(lines, { drawSVG: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.035 }, 0);
      if (ink.length) tl.from(ink, { autoAlpha: 0, duration: 0.5, stagger: 0.025, ease: "power1.out" }, 0.45);
    },
    { scope, dependencies: [reduced], revertOnUpdate: true },
  );
}
