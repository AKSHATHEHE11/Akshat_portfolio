"use client";
import { useRef } from "react";
import { usePreview, useSvgId, type PreviewProps } from "./usePreview";

const FAR = "M0 206C40 176 74 170 112 186S182 160 226 172 316 196 352 182 386 196 400 206V300H0Z";
const NEAR = "M0 224C30 208 58 206 90 216S150 228 196 212 270 198 312 216 372 232 400 224V300H0Z";
const POLES = [0, 100, 200, 300, 400, 500];
const SLEEPERS = Array.from({ length: 20 }, (_, i) => i * 24 - 24);
const STATIONS = [44, 148, 252, 356];

/** Dusk from a train window: hills sliding by, catenary poles whipping past, the route ticking along. */
export default function Railway({ hot, running }: PreviewProps) {
  const ref = useRef<SVGSVGElement>(null);
  const sky = useSvgId("sky");

  usePreview(
    ref,
    (tl, q) => {
      tl.to(q("[data-far]"), { x: -400, duration: 48, ease: "none", repeat: -1 }, 0)
        .to(q("[data-near]"), { x: -400, duration: 15, ease: "none", repeat: -1 }, 0)
        .to(q("[data-poles]"), { x: -100, duration: 0.9, ease: "none", repeat: -1 }, 0)
        .to(q("[data-sleepers]"), { x: -24, duration: 0.2, ease: "none", repeat: -1 }, 0)
        .fromTo(q("[data-train]"), { x: 0 }, { x: 312, duration: 10, ease: "none", repeat: -1 }, 0)
        .to(q("[data-sun]"), { scale: 1.08, transformOrigin: "50% 50%", duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0);
    },
    hot,
    running,
  );

  return (
    <svg ref={ref} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" style={{ color: "var(--p-fg)" }}>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.2" style={{ stopColor: "var(--p-bg)" }} />
          <stop offset="0.78" style={{ stopColor: "var(--p-accent)", stopOpacity: 0.42 }} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" style={{ fill: "var(--p-bg)" }} />
      <rect width="400" height="300" fill={`url(#${sky})`} />
      <g style={{ color: "var(--p-accent)" }}>
        <circle cx="292" cy="170" r="54" fill="currentColor" opacity="0.14" />
        <circle data-sun cx="292" cy="170" r="30" fill="currentColor" opacity="0.92" />
      </g>
      <g data-far fill="currentColor" opacity="0.1">
        <path d={FAR} />
        <path d={FAR} transform="translate(400 0)" />
      </g>
      <g data-near fill="#000" opacity="0.38">
        <path d={NEAR} />
        <path d={NEAR} transform="translate(400 0)" />
      </g>
      <rect y="236" width="400" height="64" fill="#000" opacity="0.42" />
      <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5">
        <path d="M0 246H400M0 254H400" />
      </g>
      <g data-sleepers fill="currentColor" opacity="0.16">
        {SLEEPERS.map((x) => (
          <rect key={x} x={x} y="243" width="5" height="14" />
        ))}
      </g>
      <g data-poles stroke="currentColor" fill="none" strokeLinecap="round">
        <path d="M-100 74Q-50 90 0 74T100 74T200 74T300 74T400 74T500 74" strokeOpacity="0.35" strokeWidth="1" />
        <path d="M-100 86Q-50 98 0 86T100 86T200 86T300 86T400 86T500 86" strokeOpacity="0.25" strokeWidth="1" />
        {POLES.map((x) => (
          <g key={x} transform={`translate(${x} 0)`} strokeOpacity="0.7">
            <path d="M0 60V242" strokeWidth="3.5" />
            <path d="M-18 74H20" strokeWidth="2" />
            <circle cx="-14" cy="80" r="2.5" fill="currentColor" stroke="none" />
          </g>
        ))}
      </g>
      <rect x="22" y="262" width="356" height="27" rx="13.5" style={{ fill: "var(--p-bg)" }} fillOpacity="0.88" stroke="currentColor" strokeOpacity="0.22" />
      <path d="M44 275.5H356" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="2 4" />
      {STATIONS.map((x) => (
        <circle key={x} cx={x} cy="275.5" r="3.5" style={{ fill: "var(--p-bg)" }} stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.5" />
      ))}
      <g data-train style={{ color: "var(--p-accent)" }}>
        <circle cx="44" cy="275.5" r="9" fill="currentColor" opacity="0.28" />
        <circle cx="44" cy="275.5" r="4.5" fill="currentColor" />
      </g>
    </svg>
  );
}
