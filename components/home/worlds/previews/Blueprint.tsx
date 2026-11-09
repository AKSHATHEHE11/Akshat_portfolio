"use client";
import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { usePreview, type PreviewProps } from "./usePreview";
import "./previews.css";

// Plan lines in drawing order; `end` is where the drafting pen finishes each stroke.
const INK: { d: string; end: [number, number]; dim?: boolean }[] = [
  { d: "M70 70H290V150H332V240H70Z", end: [70, 70] },
  { d: "M170 70V160H70", end: [70, 160] },
  { d: "M230 150V240M170 200H230", end: [230, 200] },
  { d: "M170 160A32 32 0 0 1 202 192", end: [202, 192] },
  { d: "M260 110m-11 0a11 11 0 1 0 22 0a11 11 0 1 0-22 0", end: [249, 110] },
  { d: "M70 48H290M70 42V54M290 42V54", end: [290, 48], dim: true },
  { d: "M48 70V240M42 70H54M42 240H54", end: [48, 240], dim: true },
  { d: "M300 240A62 62 0 0 0 238 178", end: [238, 178], dim: true },
];

/** A sheet being drafted: walls, doors and dimensions draw themselves, the pen moving between them. */
export default function Blueprint({ p, hot, running }: PreviewProps) {
  const ref = useRef<SVGSVGElement>(null);

  usePreview(
    ref,
    (tl, q) => {
      const lines = q("[data-ink]");
      const draw = gsap.timeline({ repeat: -1, repeatDelay: 0.3 });
      draw.set(lines, { strokeDashoffset: 1 }).set(q("[data-txt]"), { opacity: 0 }).set(q("[data-sheet]"), { opacity: 1 });
      lines.forEach((el, i) => {
        draw.to(el, { strokeDashoffset: 0, duration: 0.6, ease: "power1.inOut" }, 0.2 + i * 0.42);
        draw.to(q("[data-pen]"), { x: INK[i].end[0], y: INK[i].end[1], duration: 0.6, ease: "power1.inOut" }, 0.2 + i * 0.42);
      });
      draw
        .to(q("[data-txt]"), { opacity: 1, duration: 0.25, stagger: 0.12 }, ">-0.2")
        .to(q("[data-pen]"), { x: 350, y: 268, duration: 0.8, ease: "power2.inOut" }, "<")
        .to(q("[data-sheet]"), { opacity: 0, duration: 0.5, ease: "power1.in" }, "+=1.8");
      tl.add(draw, 0);
    },
    hot,
    running,
  );

  return (
    <div className="wp-blueprint" style={{ color: "var(--p-fg)" }}>
      <svg ref={ref} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <g data-sheet fill="none" strokeLinecap="round" strokeLinejoin="round">
          {INK.map((l) => (
            <path
              key={l.d}
              data-ink
              d={l.d}
              pathLength={1}
              strokeDasharray="1"
              stroke="currentColor"
              strokeWidth={l.dim ? 1 : 2.4}
              style={l.dim ? { stroke: "var(--p-accent)" } : undefined}
            />
          ))}
          <g fill="currentColor" stroke="none" className="font-mono" fontSize="8.5" letterSpacing="0.08em">
            <text data-txt x="180" y="38" textAnchor="middle" style={{ fill: "var(--p-accent)" }}>
              22 000
            </text>
            <text data-txt x="34" y="158" textAnchor="middle" transform="rotate(-90 34 158)" style={{ fill: "var(--p-accent)" }}>
              17 000
            </text>
            <text data-txt x="120" y="118" opacity="0.8">
              01
            </text>
            <text data-txt x="250" y="200" opacity="0.8">
              02
            </text>
          </g>
        </g>
        <g stroke="currentColor" fill="none" strokeOpacity="0.85">
          <rect x="300" y="252" width="88" height="38" />
          <path d="M300 264H388M344 264V290" strokeOpacity="0.5" />
          <circle cx="362" cy="44" r="15" strokeOpacity="0.6" />
          <path d="M362 26 368 46H356Z" fill="currentColor" stroke="none" />
        </g>
        <g fill="currentColor" className="font-mono" fontSize="7" letterSpacing="0.1em">
          <text x="305" y="261">
            SHEET {p.id}
          </text>
          <text x="305" y="281">
            REV C
          </text>
          <text x="349" y="281">
            {p.year}
          </text>
          <text x="359" y="70">
            N
          </text>
        </g>
        <g data-pen transform="translate(350 268)" style={{ color: "var(--p-accent)" }}>
          <circle r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M-11 0H11M0-11V11" stroke="currentColor" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
