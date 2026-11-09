"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { useSystem } from "./system";

export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** prefers-reduced-motion. When true: no parallax, no scrubbing, no shake — show end states. */
export const useReducedMotion = () => useSystem((s) => s.reducedMotion);
/** Touch-first device: no hover-only affordances, no custom cursor. */
export const useCoarse = () => useSystem((s) => s.coarse);
export const useChaos = () => useSystem((s) => s.chaos);
export const useSound = () => useSystem((s) => s.sound);
export const useTheme = () => useSystem((s) => s.theme);
/** True once the client has read storage/media queries (avoid acting on SSR defaults). */
export const useSystemReady = () => useSystem((s) => s.ready);

/** Generic media query hook (false during SSR). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Pause expensive work (canvas loops, R3F frameloop) while the element is off-screen. */
export function useOnScreen<T extends Element>(ref: React.RefObject<T | null>, rootMargin = "200px") {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return on;
}
