"use client";
import "./cursor/cursor.css";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { ArrowUpRight } from "lucide-react";
import { inkOn } from "@/components/worlds/shell/palette";
import { useChaos, useCoarse, useReducedMotion, useSystemReady } from "@/lib/hooks";
import { useSystem } from "@/lib/system";
import { createCursor, type CursorEngine } from "./cursor/engine";

const GHOSTS = [0, 1, 2, 3, 4];

// 36 ticks around the disc, every third one long: the disc reads as a knob and rolls as it travels.
const DIAL = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2;
  const at = (r: number) => [+(50 + Math.cos(a) * r).toFixed(2), +(50 + Math.sin(a) * r).toFixed(2)];
  return [...at(i % 3 === 0 ? 40 : 44), ...at(48)];
});

/**
 * The custom cursor. Desktop fine pointers only — renders nothing on touch (or before the system has
 * read the device). Markup is static; cursor/engine.ts moves it outside React.
 * Elements opt in with data-cursor="hover|open|view|drag|text|hide" (+ data-cursor-label).
 */
export default function Cursor() {
  const ready = useSystemReady();
  const coarse = useCoarse();
  return ready && !coarse ? <CursorLayers /> : null;
}

function CursorLayers() {
  const blend = useRef<HTMLDivElement>(null);
  const solid = useRef<HTMLDivElement>(null);
  const engine = useRef<CursorEngine | null>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const world = useSystem((s) => s.world);
  const pathname = usePathname();

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  // Worlds tint the pointer with their accent — unless accent and background sit on the same side of
  // light/dark (e.g. lime on bone), where it would vanish: then it takes the world's ink (cursor.css).
  useEffect(() => {
    const st = getComputedStyle(document.documentElement);
    const tone = (v: string) => inkOn(st.getPropertyValue(v).trim() || "#000");
    blend.current?.toggleAttribute("data-pale", !!world && tone("--world-bg") === tone("--world-accent"));
  }, [world]);

  useEffect(() => {
    if (!blend.current || !solid.current) return;
    const e = createCursor(blend.current, solid.current, () => lenisRef.current);
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setMode({ chaos, reduced });
  }, [chaos, reduced]);

  // A new page appears under a still pointer: re-read the target once it has painted.
  useEffect(() => {
    const id = requestAnimationFrame(() => engine.current?.probe());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <>
      <div
        ref={blend}
        aria-hidden
        className="cur-layer cur-blend pointer-events-none fixed inset-0 z-[100]"
        style={{ viewTransitionName: "site-cursor-blend" }}
      >
        <span data-c="ring" className="cur-ring" />
        <span data-c="ripple" className="cur-ripple" />
        <span data-c="beam" className="cur-beam" />
        <span data-c="dot" className="cur-dot" />
      </div>
      <div
        ref={solid}
        aria-hidden
        className="cur-layer pointer-events-none fixed inset-0 z-[100]"
        style={{ viewTransitionName: "site-cursor" }}
      >
        {GHOSTS.map((i) => (
          <span key={i} data-c="ghost" className="cur-glyph cur-ghost" style={{ animationDelay: `${-0.16 * (i + 1)}s` }} />
        ))}
        <span data-c="glyph" className="cur-glyph">
          ✦
        </span>
        <span data-c="disc" data-kind="open" className="cur-disc">
          <svg data-c="dial" className="cur-dial" viewBox="0 0 100 100">
            {DIAL.map(([x1, y1, x2, y2], i) => (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={i % 3 === 0 ? 1.5 : 0.9}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <span className="cur-label">
            <span className="cur-k cur-k-drag cur-k-l">←</span>
            <span className="cur-k cur-k-view">[</span>
            <span data-c="label">OPEN</span>
            <span className="cur-k cur-k-view">]</span>
            <ArrowUpRight className="cur-k cur-k-open" size={13} strokeWidth={2.4} />
            <span className="cur-k cur-k-drag cur-k-r">→</span>
          </span>
        </span>
      </div>
    </>
  );
}
