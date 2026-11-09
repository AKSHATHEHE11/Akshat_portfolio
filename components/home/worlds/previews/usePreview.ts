"use client";
import { useEffect, useId, useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import type { ProjectSummary } from "@/lib/types";

export interface PreviewProps {
  p: ProjectSummary;
  /** hovered / focused: the environment runs hotter */
  hot: boolean;
  /** on screen: otherwise the loop is paused */
  running: boolean;
}

type Q = (selector: string) => Element[];

/**
 * One looping timeline per preview. Paused off-screen, sped up while hot (timeScale eases so it
 * spools up like a machine), never built for reduced motion — the markup is the still frame.
 */
export function usePreview(ref: RefObject<Element | null>, build: (tl: gsap.core.Timeline, q: Q) => void, hot: boolean, running: boolean) {
  const reduced = useReducedMotion();
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (reduced || !ref.current) return;
      const t = gsap.timeline({ paused: true });
      build(t, gsap.utils.selector(ref.current));
      tl.current = t;
      return () => {
        tl.current = null;
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (running) t.play();
    else t.pause();
  }, [running, reduced]);

  useEffect(() => {
    const t = tl.current;
    if (t) gsap.to(t, { timeScale: hot ? 2.6 : 1, duration: 0.7, ease: "power2.out", overwrite: true });
  }, [hot, reduced]);
}

/** useId, safe inside url(#…) references */
export function useSvgId(prefix: string) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
