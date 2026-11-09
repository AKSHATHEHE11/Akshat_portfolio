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

  // Lazy content (canvases, dynamic imports, fonts) changes page height after mount; re-measure every
  // ScrollTrigger once the height settles. Pin spacers settle on the second pass, so this can't loop.
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    let last = main.offsetHeight;
    let timer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const h = main.offsetHeight;
        if (Math.abs(h - last) < 2) return;
        last = h;
        ScrollTrigger.refresh();
        last = main.offsetHeight;
      }, 220);
    });
    ro.observe(main);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
