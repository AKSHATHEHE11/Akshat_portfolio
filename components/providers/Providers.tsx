"use client";
import "lenis/dist/lenis.css";
import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { system, useSystem } from "@/lib/system";
import { trackPointer } from "@/lib/pointer";

/**
 * App-wide runtime: system state init, shared pointer tracking, Lenis smooth scroll driven by the
 * GSAP ticker (so ScrollTrigger and Lenis share one clock). motion/react stays out of this shared
 * graph: a route that uses it wraps its motion subtree in <MotionConfig reducedMotion="user">.
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
      // 0.1 trailed the wheel by ~0.5s (felt like lag); 0.16 reaches it in ~0.3s and is still smooth
      lerp: reduced ? 1 : 0.16,
      smoothWheel: !reduced,
      anchors: true,
      allowNestedScroll: true,
    }),
    [reduced],
  );

  return (
    <ReactLenis root autoRaf={false} ref={lenisRef} options={options}>
      <ScrollSync />
      {children}
    </ReactLenis>
  );
}

/** Jump to a section. Lenis caches the scroll limit and re-measures ~250ms after the page height
 *  changes; jumping before that clamps to the previous page's bottom, so measure first. */
function toSection(lenis: ReturnType<typeof useLenis>, el: HTMLElement) {
  lenis?.resize();
  lenis?.scrollTo(el, { immediate: true, force: true });
}

/** Resets scroll on route change (and keeps a #section in view while the page settles). ScrollTrigger
 *  keeps step with Lenis on its own: Lenis moves the real scroll position every frame, which fires the
 *  scroll event ScrollTrigger listens to. Calling ScrollTrigger.update() from Lenis as well ran every
 *  trigger on the page twice per frame — about 1–2 ms a frame, a lot at 144 Hz (6.9 ms per frame). */
function ScrollSync() {
  const pathname = usePathname();
  const lenis = useLenis();
  /** a #section the route change asked for, kept in view while the page settles */
  const hold = useRef<HTMLElement | null>(null);

  // A new route starts at the top — or at the section its link names (/#contact from another page).
  // The target is measured after ScrollTrigger has laid out pin spacers, and re-aligned whenever lazy
  // content above it changes the height, until the visitor scrolls on their own (or 4 s pass).
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    hold.current = el;
    // with a target, never pass through the top: the browser has usually jumped to it already
    if (!el) lenis?.scrollTo(0, { immediate: true, force: true });
    const raf = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (el) toSection(lenis, el);
    });
    const release = () => (hold.current = null);
    const expire = window.setTimeout(release, 6000);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(expire);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
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
        const el = hold.current;
        if (el?.isConnected) toSection(lenis, el);
      }, 220);
    });
    ro.observe(main);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [lenis]);

  return null;
}
