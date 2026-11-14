"use client";
import "./graffiti.css";
import { Sedgwick_Ave_Display } from "next/font/google";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  Graffiti: spray-painted tags and marks dropped onto a few spots of the site.
  <Tag> is a word in a spray-can hand with an ink outline; paint drips run down from it.
  <Mark> is a sprayed shape (crown, arrow, circle, underline, x).
  Both spray on the first time they scroll into view and are hidden from screen readers (decoration).
  To remove the whole look: delete this folder and the <Tag>/<Mark> lines that use it.
*/

const hand = Sedgwick_Ave_Display({ subsets: ["latin"], weight: "400", display: "swap", preload: false });

type Paint = "orange" | "lime" | "ink";

function useSprayIn<T extends Element>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.setAttribute("data-in", "");
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Rough spray edges: shared by a tag or mark through its own filter id. */
function Rough({ id, scale = 2.5 }: { id: string; scale?: number }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale={scale} />
      </filter>
    </svg>
  );
}

export function Tag({
  children,
  paint = "orange",
  tilt = -6,
  drips = [0.18, 0.52, 0.81],
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  paint?: Paint;
  tilt?: number;
  /** where along the word paint runs down, 0–1 */
  drips?: number[];
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useSprayIn<HTMLSpanElement>();
  const id = useId().replace(/:/g, "");
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn("gf gf-tag", hand.className, className)}
      data-paint={paint}
      style={{ "--tilt": `${tilt}deg`, "--delay": `${delay}ms`, "--rough": `url(#${id})`, ...style } as CSSProperties}
    >
      <Rough id={id} />
      <span className="gf-word">{children}</span>
      {drips.map((x, i) => (
        <i key={i} className="gf-drip" style={{ "--x": x, "--i": i } as CSSProperties} />
      ))}
    </span>
  );
}

const SHAPES = {
  crown: { box: "0 0 120 84", d: ["M12 74 L18 22 L40 50 L60 10 L80 50 L102 22 L108 74 Z", "M10 80 C 40 76, 80 78, 112 76"] },
  arrow: { box: "0 0 160 90", d: ["M10 74 C 42 22, 92 12, 140 38", "M116 18 L142 39 L114 58"] },
  circle: { box: "0 0 220 100", d: ["M36 56 C 20 18, 182 4, 202 44 C 214 80, 70 98, 26 68 C 8 50, 64 18, 136 16"] },
  underline: { box: "0 0 240 30", d: ["M6 18 C 60 6, 140 28, 234 10", "M26 26 C 92 16, 168 28, 214 21"] },
  x: { box: "0 0 80 80", d: ["M12 12 L68 68", "M68 14 L14 66"] },
} as const;

export function Mark({
  shape,
  paint = "orange",
  weight = 7,
  tilt = 0,
  delay = 0,
  className,
  style,
}: {
  shape: keyof typeof SHAPES;
  paint?: Paint;
  weight?: number;
  tilt?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useSprayIn<SVGSVGElement>();
  const id = useId().replace(/:/g, "");
  const s = SHAPES[shape];
  return (
    <svg
      ref={ref}
      aria-hidden
      focusable="false"
      viewBox={s.box}
      fill="none"
      className={cn("gf gf-mark", className)}
      data-paint={paint}
      style={{ "--tilt": `${tilt}deg`, "--delay": `${delay}ms`, ...style } as CSSProperties}
    >
      <defs>
        <filter id={id} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} strokeLinecap="round" strokeLinejoin="round">
        {s.d.map((d, i) => (
          <g key={i} style={{ "--i": i } as CSSProperties}>
            {/* overspray: the soft haze a can leaves around a line */}
            <path className="gf-haze" d={d} pathLength={1} strokeWidth={weight * 2.6} />
            <path className="gf-line" d={d} pathLength={1} strokeWidth={weight} />
          </g>
        ))}
      </g>
    </svg>
  );
}
