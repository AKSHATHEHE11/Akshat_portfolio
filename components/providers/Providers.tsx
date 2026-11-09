"use client";
import "lenis/dist/lenis.css";
import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { system, useSystem } from "@/lib/system";
import { trackPointer } from "@/lib/pointer";

/**
 * App-wide runtime: system state init, shared pointer tracking, Lenis smooth scroll driven by the
 * GSAP ticker (so ScrollTrigger and Lenis share one clock), and Motion's reduced-motion handling.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const reduced = useSystem((s) => s.reducedMotion);

  useEffect(() => {
    system.init();
    return trackPointer();
  }, []);

  useEffect(() => {
    const tick = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(tick);
  }, []);

  const options = useMemo(
    () => ({
      autoRaf: false,
      lerp: reduced ? 1 : 0.1,
      smoothWheel: !reduced,
      anchors: true,
      allowNestedScroll: true,
    }),
    [reduced],
  );

  return (
    <MotionConfig reducedMotion="user">
      <ReactLenis root autoRaf={false} ref={lenisRef} options={options}>
        <ScrollSync />
        {children}
      </ReactLenis>
    </MotionConfig>
  );
}

/** Keeps ScrollTrigger in step with Lenis and resets scroll on route change. */
function ScrollSync() {
  const pathname = usePathname();
  const lenis = useLenis(() => ScrollTrigger.update());

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname, lenis]);

  return null;
}
