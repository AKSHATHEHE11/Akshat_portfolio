import { useId } from "react";
import type { ProjectColor, WorldType } from "@/lib/types";
import { cn } from "@/lib/utils";
import "./motif.css";

/** Smooth sine as quadratic segments: wavelength 40, so translating by -40 loops seamlessly. */
const wave = (y: number, a: number) => {
  let d = `M-40 ${y} Q-30 ${y - a} -20 ${y}`;
  for (let x = 0; x <= 200; x += 20) d += ` T${x} ${y}`;
  return d;
};

const BARS = [7, 12, 9, 15, 10, 6, 13];

/**
 * A tiny, code-drawn picture of a world type in the project's own colours — the "colour chip"
 * every portal carries. No images: it has to look finished at 12px and at full-bleed.
 * Animations run only while an ancestor sets `--motif-play: running`.
 */
export function Motif({ env, color, className }: { env: WorldType; color: ProjectColor; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { bg, fg, accent: ac } = color;

  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className={cn("mf-motif", className)}
      aria-hidden
      focusable="false"
    >
      <rect width="160" height="100" fill={bg} />

      {env === "command-center" && (
        <g>
          {[
            [8, 10],
            [120, 10],
            [8, 66],
            [120, 66],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect width="32" height="22" rx="2" fill="none" stroke={fg} strokeOpacity=".32" strokeWidth=".8" />
              {BARS.slice(i, i + 5).map((h, b) => (
                <rect
                  key={b}
                  className="mf-bar"
                  x={4 + b * 5.2}
                  y={19 - h}
                  width="3"
                  height={h}
                  fill={ac}
                  style={{ animationDelay: `${-(b * 0.17 + i * 0.3)}s` }}
                />
              ))}
            </g>
          ))}
          <g transform="translate(80 45)" fill="none" stroke={ac}>
            <circle r="23" strokeWidth="1.1" />
            <ellipse rx="23" ry="7.5" strokeWidth=".6" strokeOpacity=".7" />
            <path d="M-20 -11.5 H20 M-20 11.5 H20" strokeWidth=".5" strokeOpacity=".6" />
            <g className="mf-spin">
              <ellipse rx="9" ry="23" strokeWidth=".7" />
              <ellipse rx="17" ry="23" strokeWidth=".5" strokeOpacity=".7" />
            </g>
          </g>
          <ellipse cx="80" cy="84" rx="27" ry="4" fill="none" stroke={ac} strokeOpacity=".55" />
          <path d="M58 84 L68 70 M102 84 L92 70" stroke={ac} strokeOpacity=".28" />
        </g>
      )}

      {env === "railway" && (
        <g>
          <path d="M0 62 L22 48 L40 55 L66 38 L94 52 L118 42 L160 57 V100 H0 Z" fill={fg} fillOpacity=".07" />
          <line x1="0" y1="66" x2="160" y2="66" stroke={fg} strokeOpacity=".28" strokeWidth="7" strokeDasharray="1.4 4.2" />
          <path d="M0 63.5 H160 M0 68.5 H160" stroke={ac} strokeWidth="1" />
          {[20, 62, 104, 146].map((x) => (
            <g key={x}>
              <circle cx={x} cy="66" r="3.4" fill={bg} stroke={ac} strokeWidth="1.2" />
              <rect x={x - 8} y="75" width="16" height="6" rx="1" fill={fg} fillOpacity=".85" />
            </g>
          ))}
          <g className="mf-train">
            <rect x="0" y="52" width="28" height="9.5" rx="2.6" fill={fg} />
            <rect x="3.5" y="54.5" width="4.5" height="3" fill={bg} />
            <rect x="10" y="54.5" width="4.5" height="3" fill={bg} />
            <rect x="16.5" y="54.5" width="4.5" height="3" fill={bg} />
            <rect x="24.5" y="54" width="3" height="5" rx="1" fill={ac} />
          </g>
        </g>
      )}

      {env === "fashion" && (
        <g>
          <defs>
            <pattern id={`${id}tw`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
              <line x1="1" y1="0" x2="1" y2="5" stroke={fg} strokeOpacity=".13" strokeWidth="2.2" />
            </pattern>
          </defs>
          <rect width="160" height="100" fill={`url(#${id}tw)`} />
          <path
            d="M38 12 H122 V58 C122 78 100 88 80 93 C60 88 38 78 38 58 Z"
            fill={fg}
            fillOpacity=".06"
            stroke={fg}
            strokeOpacity=".5"
          />
          <path
            className="mf-stitch"
            d="M44 18 H116 V57 C116 73 98 82 80 87 C62 82 44 73 44 57 Z"
            fill="none"
            stroke={fg}
            strokeOpacity=".75"
            strokeWidth="1.1"
            strokeDasharray="3 2.4"
          />
          <rect x="116" y="30" width="15" height="8" fill={ac} stroke={fg} strokeOpacity=".4" strokeWidth=".5" />
          <circle cx="44" cy="18" r="2.3" fill={fg} />
          <circle cx="116" cy="18" r="2.3" fill={fg} />
        </g>
      )}

      {env === "ledger" && (
        <g>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1="0" x2="160" y1={10 + i * 10} y2={10 + i * 10} stroke={fg} strokeOpacity=".08" />
          ))}
          <line x1="16" y1="0" x2="16" y2="100" stroke={ac} strokeOpacity=".55" />
          {[34, 22, 40, 28, 18, 36].map((w, i) => (
            <g key={i} fill={fg}>
              <rect x="22" y={16.5 + i * 10} width={w} height="3" fillOpacity=".5" />
              <rect x={86 - (i % 3) * 4 - 10} y={16.5 + i * 10} width={10 + (i % 3) * 4} height="3" fillOpacity=".8" />
            </g>
          ))}
          <g transform="translate(126 64)" fill="none" strokeWidth="6">
            <path d="M-24 0 A24 24 0 0 1 24 0" stroke={fg} strokeOpacity=".14" />
            <path className="mf-gauge" d="M-24 0 A24 24 0 0 1 24 0" stroke={ac} pathLength={100} strokeDasharray="100" />
          </g>
          <circle cx="126" cy="64" r="2.4" fill={fg} />
        </g>
      )}

      {env === "blueprint" && (
        <g>
          <defs>
            <pattern id={`${id}gr`} width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M8 0H0V8" fill="none" stroke={fg} strokeOpacity=".16" strokeWidth=".5" />
            </pattern>
          </defs>
          <rect width="160" height="100" fill={`url(#${id}gr)`} />
          <g fill="none" stroke={fg} strokeWidth="1.2">
            <rect x="26" y="16" width="86" height="60" />
            <path d="M26 46 H60 M60 16 V34 M84 46 V76 M84 46 H112" />
            <path d="M60 46 A11 11 0 0 1 71 57" strokeOpacity=".6" strokeWidth=".8" />
          </g>
          <g stroke={ac} strokeWidth=".9">
            <path d="M26 86 H112 M26 82 V90 M112 82 V90" />
          </g>
          <g transform="translate(136 26)" fill="none" stroke={ac}>
            <circle r="9" />
            <path d="M0 -9 L3 0 L0 9 L-3 0 Z" fill={ac} fillOpacity=".45" />
          </g>
          <line className="mf-scan" x1="0" y1="10" x2="0" y2="82" stroke={ac} strokeOpacity=".8" strokeDasharray="2 2" />
        </g>
      )}

      {env === "lab" && (
        <g>
          <defs>
            <pattern id={`${id}dt`} width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r=".55" fill={fg} fillOpacity=".22" />
            </pattern>
            <radialGradient id={`${id}gl`}>
              <stop offset="0" stopColor={ac} stopOpacity=".5" />
              <stop offset="1" stopColor={ac} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="160" height="100" fill={`url(#${id}dt)`} />
          <circle cx="108" cy="42" r="42" fill={`url(#${id}gl)`} />
          <circle cx="108" cy="42" r="18" fill="none" stroke={fg} strokeOpacity=".35" strokeDasharray="2 3" />
          <g className="mf-wave" fill="none">
            <path d={wave(56, 18)} stroke={ac} strokeWidth="1.6" />
            <path d={wave(62, 7)} stroke={fg} strokeOpacity=".45" strokeWidth=".8" />
          </g>
        </g>
      )}
    </svg>
  );
}
