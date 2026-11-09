"use client";
// Everything chaos mode adds to the page. Loaded on demand by ChaosLayer — the calm site never
// downloads this chunk (or its CSS).
import "./chaos.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useCoarse, useMediaQuery, useReducedMotion, useTheme } from "@/lib/hooks";
import { useSystem } from "@/lib/system";
import { createEngine, stillTuck, type Engine } from "./engine";
import { pickFragments } from "./slots";
import { Fragments } from "./Fragments";
import { Keycaps } from "./Keycaps";

const seedOf = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 97;
};

export default function ChaosEffects({ active, onSettled }: { active: boolean; onSettled: () => void }) {
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const narrow = useMediaQuery("(max-width: 640px)");
  const theme = useTheme();
  const world = useSystem((s) => s.world);
  const booted = useSystem((s) => s.booted);
  const pathname = usePathname();
  const layer = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  // which fragments show depends on the page chaos was switched on from
  const [seed] = useState(() => seedOf(pathname));
  const compact = narrow || coarse;
  const items = useMemo(() => pickFragments(seed, world, compact, reduced), [seed, world, compact, reduced]);

  // Reduced motion gets no engine at all: just the colour remap (CSS) and static stickers.
  useLayoutEffect(() => {
    if (reduced || !layer.current) return;
    const e = createEngine(layer.current, coarse);
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = null;
    };
  }, [reduced, coarse]);

  useLayoutEffect(() => {
    engine.current?.fragments(Array.from(layer.current?.querySelectorAll<HTMLElement>("[data-cx-frag]") ?? []));
  }, [items, reduced, coarse]);

  // Reduced motion: the stickers don't move, they just step aside once scrolling settles.
  useEffect(() => {
    const el = layer.current;
    if (!reduced || !el) return;
    let t = 0;
    const later = () => {
      clearTimeout(t);
      t = window.setTimeout(() => stillTuck(el), 140);
    };
    // a sticker that stepped off-screen comes back while it has keyboard focus
    const focus = (e: FocusEvent) => {
      const frag = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-cx-frag]") : null;
      if (frag) frag.style.transform = "";
    };
    stillTuck(el);
    window.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    el.addEventListener("focusin", focus);
    el.addEventListener("focusout", later);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", later);
      window.removeEventListener("resize", later);
      el.removeEventListener("focusin", focus);
      el.removeEventListener("focusout", later);
    };
  }, [reduced, items]);

  useEffect(() => {
    engine.current?.ground();
  }, [theme, world, reduced, coarse]);

  useEffect(() => {
    engine.current?.rescan();
  }, [pathname]);

  useEffect(() => {
    const e = engine.current;
    if (!e) {
      if (!active) onSettled();
    } else if (!active) e.exit(onSettled);
    else if (booted) e.enter();
    else e.hold(); // the boot screen is up; the surge plays once it hands over
  }, [active, booted, reduced, coarse, onSettled]);

  const bang = useCallback((x: number, y: number) => engine.current?.bang(x, y), []);

  return createPortal(
    <div
      ref={layer}
      data-chaos-layer=""
      className="pointer-events-none fixed inset-0 z-[45] overflow-hidden"
      style={{ "--cx-bottom": world ? "6rem" : "1.25rem" } as CSSProperties}
    >
      <aside aria-label="Chaos mode">
        <Fragments items={items} live={!reduced} compact={compact} />
        <Keycaps on={active && (booted || reduced)} compact={compact} reduced={reduced} onBang={bang} />
      </aside>
    </div>,
    document.body,
  );
}
