"use client";
import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { pad } from "@/lib/utils";

// Same maths as the `frame` utility: side margin, centred once the viewport passes --frame-max.
const MARGIN = "max(var(--margin), calc((100% - var(--frame-max)) / 2 + var(--margin)))";
const label = "font-mono text-[0.5625rem] uppercase tracking-[0.14em]";

/** The 12-column grid the site is set on, measured live (column, gutter, margin in px). */
export function Grid() {
  const root = useRef<HTMLDivElement>(null);
  const cols = useRef<HTMLDivElement>(null);
  const spec = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const measure = () => {
      const c = cols.current?.children;
      if (!c || c.length < 2 || !spec.current) return;
      const a = c[0].getBoundingClientRect();
      const b = c[1].getBoundingClientRect();
      spec.current.textContent = `12 col · ${Math.round(a.width)}px column · ${Math.round(b.left - a.right)}px gutter · ${Math.round(a.left)}px margin`;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // the blueprint unrolls from the top edge
  useGSAP(
    () => {
      if (reduced || !cols.current) return;
      gsap.from(cols.current.children, { scaleY: 0, transformOrigin: "50% 0%", duration: 0.9, stagger: 0.035, ease: "expo.out" });
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[50] text-signal">
      <div className="sys-dv-hatch absolute inset-y-0 left-0" style={{ width: MARGIN }} />
      <div className="sys-dv-hatch absolute inset-y-0 right-0" style={{ width: MARGIN }} />
      <div ref={cols} className="frame grid h-full grid-cols-12 gap-(--gutter)">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="sys-dv-col relative">
            <span className={`${label} absolute top-[calc(var(--nav-h)+0.5rem)] left-1.5`}>{pad(i + 1)}</span>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-(--nav-h) border-t border-dashed border-current opacity-60">
        <span className={`${label} absolute top-1 right-(--margin)`}>--nav-h</span>
      </div>
      <p ref={spec} className={`${label} absolute top-[calc(var(--nav-h)+1.75rem)] left-(--margin)`} />
    </div>
  );
}
