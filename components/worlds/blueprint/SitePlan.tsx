"use client";
// The campus site plan on sheet A-001: walls, walkways, trees, the structural grid, dimensions, the
// section cut through Block B and the student's walk to the next class. Decorative (the working
// plan is inside the app); its lines are drafted on boot ([data-bd]) and labels inked ([data-bi]).
import { memo, type CSSProperties } from "react";
import { seeded } from "@/lib/utils";
import { pathD, route } from "./logic";
import type { Building, Campus } from "./scene";

const GRID_X = [24, 94, 164, 226, 288, 364];
const GRID_Y = [22, 100, 151, 204];
const TREES = [
  [108, 112], [108, 128], [108, 168], [108, 184], [108, 214], [108, 232], [132, 214], [132, 232],
  [140, 88], [160, 88], [178, 112], [200, 112], [246, 88], [292, 112], [312, 112], [340, 88], [52, 100], [36, 196], [60, 196], [84, 196],
] as const;

/** Chaos: a grid line hangs from its bubble and swings (CSS .bp-swing, seeded per line). */
const loose = (origin: string, i: number) =>
  ({ "--o": origin, "--a": `${((i % 2 ? -1 : 1) * (2 + seeded(i + 40) * 5)).toFixed(1)}deg`, "--t": `${(2.2 + seeded(i + 60) * 1.6).toFixed(1)}s` }) as CSSProperties;

/**
 * A dashed line that drafts itself without losing its dashes: DrawSVG writes its own dasharray, so it
 * draws a solid twin inside a mask and the dashed line shows through it. The mask lives in the line's
 * own user space, so it swings with it in chaos.
 */
function Dashed({ id, d, className }: { id: string; d: string; className?: string }) {
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x="-48" y="-50" width="474" height="330">
        <path data-bd d={d} stroke="#fff" strokeWidth="5" strokeDasharray="none" />
      </mask>
      <path d={d} mask={`url(#${id})`} className={className} />
    </>
  );
}

/** Interior partitions per building, so each reads as what it is. */
function inside(b: Building) {
  const { x, y, w, h } = b;
  switch (b.id) {
    case "A":
      return `M${x} ${y + 40}H${x + w}${[1, 2, 3, 4].map((k) => `M${x + k * 28} ${y}V${y + 40}`).join("")}`;
    case "B":
      return `M${x} ${y + 36}H${x + w}M${x + 28} ${y}V${y + 36}M${x + 56} ${y}V${y + 36}M${x + 42} ${y + 36}V${y + h}`;
    case "AD":
      return `M${x + 26} ${y}V${y + h}M${x + 26} ${y + 22}H${x + w}`;
    case "H":
      return Array.from({ length: 9 }, (_, k) => `M${x} ${y + 15 * (k + 1)}H${x + w}`).join("");
    case "L":
      return [0, 1, 2, 3, 4].map((k) => `M${x + 10} ${y + 12 + k * 7}H${x + 46}`).join("") + `M${x + 54} ${y}V${y + h}`;
    case "C":
      return [0, 1, 2].map((k) => `M${x + 10 + k * 18} ${y + 14}h8M${x + 10 + k * 18} ${y + 30}h8`).join("") + `M${x + w - 14} ${y}V${y + h}`;
    case "AU":
      return `M${x + 8} ${y + h - 10}H${x + w - 8}` + [16, 26, 36].map((r) => `M${x + w / 2 - r} ${y + h - 12}A${r} ${r} 0 0 1 ${x + w / 2 + r} ${y + h - 12}`).join("");
    default:
      return "";
  }
}

function Room({ b, i, target }: { b: Building; i: number; target: boolean }) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const tall = b.h > b.w * 2;
  return (
    <g className="bp-room" style={{ "--i": i, "--r": `${Math.round((seeded(i + 3) - 0.5) * 50)}deg` } as CSSProperties}>
      {b.oval ? (
        <>
          <ellipse data-bd cx={cx} cy={cy} rx={b.w / 2} ry={b.h / 2} />
          <ellipse data-bd cx={cx} cy={cy} rx={b.w / 2 - 7} ry={b.h / 2 - 7} className="bp-thin" />
          <rect data-bd x={cx - 9} y={cy - 4} width="18" height="8" className="bp-thin" />
        </>
      ) : (
        <>
          <rect data-bd x={b.x} y={b.y} width={b.w} height={b.h} className="bp-wall" />
          <rect data-bd x={b.x + 2.5} y={b.y + 2.5} width={b.w - 5} height={b.h - 5} className="bp-thin" />
          {inside(b) && <path data-bd d={inside(b)} className="bp-thin" />}
        </>
      )}
      {target && <rect x={b.x + 56} y={b.y} width="28" height="36" fill="url(#bp-h-diag)" className="bp-target" data-bi />}
      <g data-bi className="bp-plan-label" transform={tall ? `rotate(-90 ${cx} ${cy})` : undefined}>
        <text x={cx} y={b.oval ? cy - b.h / 2 - 5 : cy} textAnchor="middle">
          {b.name.toUpperCase()}
        </text>
        {!tall && !b.oval && (
          <text x={cx} y={cy + 8} textAnchor="middle" className="bp-plan-use">
            {b.use}
          </text>
        )}
      </g>
    </g>
  );
}

/** Memoised: the hero re-renders on boot state; this tree of ~200 nodes never needs to. */
export const SitePlan = memo(function SitePlan({ campus, to, room, className }: { campus: Campus; to: string; room: string; className?: string }) {
  const goal = campus.buildings.find((b) => b.id === to);
  const walk = goal ? route(campus, campus.you.node, goal.door) : null;
  const you = campus.nodes.find((n) => n.id === campus.you.node)!;
  const at = new Map(campus.nodes.map((n) => [n.id, n]));
  const lanes = campus.paths.map(([a, b]) => `M${at.get(a)!.x} ${at.get(a)!.y}L${at.get(b)!.x} ${at.get(b)!.y}`).join("");
  const gate = at.get(campus.gate)!;

  return (
    <svg viewBox="-48 -50 474 330" className={className} aria-hidden focusable="false">
      {/* structural grid */}
      <g className="bp-gridref">
        {GRID_X.map((x, i) => (
          <g key={x} className="bp-swing" style={loose("50% 0%", i)}>
            <Dashed id={`bp-gx-${i}`} d={`M${x} -20V256`} />
            <circle data-bd cx={x} cy="-31" r="8" />
            <text data-bi x={x} y="-28" textAnchor="middle">
              {i + 1}
            </text>
          </g>
        ))}
        {GRID_Y.map((y, i) => (
          <g key={y} className="bp-swing" style={loose("0% 50%", i + 6)}>
            <Dashed id={`bp-gy-${i}`} d={`M-20 ${y}H396`} />
            <circle data-bd cx="-31" cy={y} r="8" />
            <text data-bi x="-31" y={y + 3} textAnchor="middle">
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        ))}
      </g>

      {/* boundary wall with the main gate */}
      <path data-bd className="bp-wall" d={`M${gate.x - 12} 252H8V8H392V252H${gate.x + 12}`} />
      <path data-bd className="bp-thin" d={`M${gate.x - 12} 252a12 12 0 0 1 12 -12M${gate.x + 12} 252a12 12 0 0 0 -12 -12`} />
      <text data-bi className="bp-plan-use" x={gate.x} y="266" textAnchor="middle">
        MAIN GATE
      </text>

      {/* walkways + trees */}
      <path data-bd d={lanes} className="bp-lane" />
      <path d={lanes} className="bp-lane-c" data-bi />
      <g className="bp-trees" data-bi>
        {TREES.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="4.2" />
            <path d={`M${x - 2} ${y}h4M${x} ${y - 2}v4`} />
          </g>
        ))}
      </g>

      {campus.buildings.map((b, i) => (
        <Room key={b.id} b={b} i={i} target={b.id === to} />
      ))}

      {/* section cut A–A through Block B's upper rooms (drawn on sheet A-401) */}
      <g className="bp-cut bp-swing" style={{ "--o": "0% 50%" } as CSSProperties}>
        <Dashed id="bp-cut-aa" d="M170 40H282" />
        <circle data-bd cx="164" cy="40" r="6" />
        <circle data-bd cx="288" cy="40" r="6" />
        <path data-bi d="M160 32l4-6 4 6zM284 32l4-6 4 6z" className="bp-fill" />
        <text data-bi x="164" y="43" textAnchor="middle">
          A
        </text>
        <text data-bi x="288" y="43" textAnchor="middle">
          A
        </text>
      </g>

      {/* overall dimensions */}
      <g className="bp-dim bp-swing" style={{ "--o": "0% 50%", "--a": "4deg" } as CSSProperties}>
        <path data-bd d="M8 -12V-4M392 -12V-4M4 -8H396M5 -5l6-6M389 -5l6-6" />
        <text data-bi x="200" y="-11.5" textAnchor="middle">
          {`${campus.w - 16}.00`}
        </text>
      </g>
      <g className="bp-dim bp-swing" style={{ "--o": "50% 0%", "--a": "5deg", "--t": "2.6s" } as CSSProperties}>
        <path data-bd d="M-12 8H-4M-12 252H-4M-8 4V256M-11 11l6-6M-11 255l6-6" />
        <text data-bi x="-11.5" y="130" textAnchor="middle" transform="rotate(-90 -11.5 130)">
          {`${campus.h - 16}.00`}
        </text>
      </g>

      {/* the walk: library steps → the next class */}
      {walk && (
        <g className="bp-walk">
          <Dashed id="bp-walk-mask" d={pathD(walk.points)} className="bp-walk-line" />
          <circle cx={you.x} cy={you.y} r="9" className="bp-you-ring" data-bi />
          <circle cx={you.x} cy={you.y} r="3.6" className="bp-fill-acc" data-bi />
          <g data-bi className="bp-plan-label bp-acc">
            <path d={`M${you.x - 6} ${you.y + 7}l-14 18h-34`} className="bp-leader" />
            <text x={you.x - 56} y={you.y + 22}>
              YOU
            </text>
            <text x={walk.points.at(-1)!.x + 12} y={walk.points.at(-1)!.y - 66} className="bp-plan-use">
              {room} · {walk.metres} M
            </text>
          </g>
        </g>
      )}
    </svg>
  );
});
