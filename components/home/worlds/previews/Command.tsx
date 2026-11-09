"use client";
import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { seeded } from "@/lib/utils";
import { usePreview, type PreviewProps } from "./usePreview";

const CX = 132;
const CY = 150;
const R = 104;
const PERIOD = 4; // seconds per sweep
const BLIPS = Array.from({ length: 7 }, (_, i) => {
  const deg = seeded(i * 13 + 5) * 360;
  const r = 22 + seeded(i * 7 + 2) * 76;
  const a = (deg * Math.PI) / 180;
  return { deg, x: +(CX + Math.cos(a) * r).toFixed(1), y: +(CY + Math.sin(a) * r).toFixed(1) };
});
const ROWS = [0, 1, 2, 3];
const BARS = [0, 1, 2, 3, 4, 5, 6];

/** A war room at a glance: radar sweep finding signals, four panels of live bars, a brief compiling. */
export default function Command({ hot, running }: PreviewProps) {
  const ref = useRef<SVGSVGElement>(null);

  usePreview(
    ref,
    (tl, q) => {
      tl.to(q("[data-sweep]"), { rotate: 360, svgOrigin: `${CX} ${CY}`, duration: PERIOD, ease: "none", repeat: -1 }, 0);
      q("[data-blip]").forEach((el, i) => {
        tl.fromTo(
          el,
          { opacity: 1, scale: 1.8, transformOrigin: "50% 50%" },
          { opacity: 0, scale: 1, transformOrigin: "50% 50%", duration: 1.7, ease: "power2.out", repeat: -1, repeatDelay: PERIOD - 1.7 },
          (BLIPS[i].deg / 360) * PERIOD,
        );
      });
      q("[data-bar]").forEach((el, i) => {
        tl.fromTo(
          el,
          { scaleY: 0.25 + seeded(i + 40) * 0.5, transformOrigin: "50% 100%" },
          {
            scaleY: 0.35 + seeded(i + 90) * 0.65,
            transformOrigin: "50% 100%",
            duration: 0.5 + seeded(i + 3) * 0.9,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          },
          seeded(i + 11) * 0.8,
        );
      });
      tl.to(q("[data-led]"), { opacity: 0.15, duration: 0.45, ease: "steps(1)", yoyo: true, repeat: -1, stagger: 0.3 }, 0).fromTo(
        q("[data-brief]"),
        { scaleX: 0, transformOrigin: "0% 50%" },
        { scaleX: 1, transformOrigin: "0% 50%", duration: 5, ease: "power1.inOut", repeat: -1, repeatDelay: 0.6 },
        0,
      );
      gsap.set(q("[data-blip]"), { opacity: 0 });
    },
    hot,
    running,
  );

  return (
    <svg
      ref={ref}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      style={{ color: "var(--p-fg)", background: "var(--p-bg)" }}
    >
      <g fill="none" stroke="currentColor">
        {[R, 78, 52, 26].map((r, i) => (
          <circle key={r} cx={CX} cy={CY} r={r} strokeOpacity={i === 0 ? 0.3 : 0.14} />
        ))}
        <circle cx={CX} cy={CY} r={R + 9} strokeOpacity="0.3" strokeDasharray="1.2 6" strokeWidth="5" />
        <path d={`M${CX - R - 6} ${CY}H${CX + R + 6}M${CX} ${CY - R - 6}V${CY + R + 6}`} strokeOpacity="0.12" />
      </g>
      <g data-sweep style={{ color: "var(--p-accent)" }}>
        <path d={`M${CX} ${CY}L${CX + R} ${CY}A${R} ${R} 0 0 0 211.7 83.1Z`} fill="currentColor" opacity="0.16" />
        <path d={`M${CX} ${CY}L${CX + R} ${CY}`} stroke="currentColor" strokeWidth="1.6" />
      </g>
      <g style={{ color: "var(--p-accent)" }}>
        {BLIPS.map((b) => (
          <circle key={b.deg} data-blip cx={b.x} cy={b.y} r="3.2" fill="currentColor" />
        ))}
        <circle cx={CX} cy={CY} r="3" fill="currentColor" />
      </g>

      {ROWS.map((row) => {
        const y = 40 + row * 52;
        return (
          <g key={row}>
            <rect x="262" y={y} width="118" height="44" rx="4" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.18" />
            <circle data-led cx="272" cy={y + 9} r="2.4" style={{ fill: "var(--p-accent)" }} />
            <path d={`M280 ${y + 9}h${22 + row * 6}`} stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
            {BARS.map((b) => (
              <rect
                key={b}
                data-bar
                x={272 + b * 14}
                y={y + 18}
                width="8"
                height="20"
                rx="1"
                fill="currentColor"
                fillOpacity={b === (row * 3) % 7 ? 1 : 0.45}
                style={b === (row * 3) % 7 ? { fill: "var(--p-accent)", fillOpacity: 1 } : undefined}
              />
            ))}
          </g>
        );
      })}
      <rect x="262" y="250" width="118" height="5" rx="2.5" fill="currentColor" fillOpacity="0.14" />
      <rect data-brief x="262" y="250" width="118" height="5" rx="2.5" style={{ fill: "var(--p-accent)" }} />
    </svg>
  );
}
