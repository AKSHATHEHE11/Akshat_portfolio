"use client";
import { useEffect, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { useSystem } from "@/lib/system";

/** Approximate relative luminance (0..1) of a computed background colour; null if mostly transparent. */
function luminance(css: string): number | null {
  const v = css.match(/-?\d*\.?\d+(?:e-?\d+)?%?/g);
  if (!v || v.length < 3) return null;
  const num = (s: string, scale: number) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s) / scale);
  if (v[3] !== undefined && num(v[3], 1) < 0.5) return null;
  if (/^okl(ab|ch)/.test(css)) return num(v[0], 1) ** 3; // OKLab L is perceptual: Y ≈ L³
  const s = css.startsWith("color(") ? 1 : 255;
  const lin = (c: string) => num(c, s) ** 2.2;
  return 0.2126 * lin(v[0]) + 0.7152 * lin(v[1]) + 0.0722 * lin(v[2]);
}

/** Dark or light, judged by the first opaque background under (x, y) that isn't the nav itself. */
function toneAt(nav: HTMLElement, x: number, y: number) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (nav.contains(el)) continue;
    const l = luminance(getComputedStyle(el).backgroundColor);
    // 0.18 ≈ where bone and ink text have equal contrast
    if (l !== null) return l < 0.18 ? 1 : -1;
  }
  return 0;
}

/**
 * The transparent (top-of-page) bar has no surface of its own, so it reads what is underneath —
 * three samples across the bar — and sets data-tone="dark|light" (nav.css swaps ink/bone).
 * Only near the top of a page and outside worlds (worlds hand over their own colours).
 */
export function useBackdropTone(ref: RefObject<HTMLElement | null>) {
  const pathname = usePathname();
  const theme = useSystem((s) => s.theme);
  const world = useSystem((s) => s.world);
  const booted = useSystem((s) => s.booted); // the boot screen itself is dark — measure again after it

  useEffect(() => {
    const nav = ref.current;
    if (!nav || world) return;
    let raf = 0;
    const probe = () => {
      raf = 0;
      if (window.scrollY > 120) return;
      const y = nav.getBoundingClientRect().height / 2;
      const w = window.innerWidth;
      const vote = toneAt(nav, w * 0.12, y) + toneAt(nav, w * 0.5, y) + toneAt(nav, w * 0.88, y);
      nav.dataset.tone = vote > 0 ? "dark" : "light";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(probe);
    };
    schedule();
    const late = window.setTimeout(schedule, 900); // after the page transition / intros settle
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, pathname, theme, world, booted]);
}
