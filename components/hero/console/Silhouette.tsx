// Front-view drawing of the console, in model units × 100 (y down). It is what renders on the server,
// while the 3D loads, and permanently when WebGL is unavailable — so it is a finished drawing, not a
// placeholder. Same layout numbers as scripts/models/console.mjs.
import { memo } from "react";
import { site } from "@/data/site";
import { KEYS, LAYOUT as L, VIEW, keyX, type Mode } from "./rig";

const OR = "#ff5a1f";
const RUBBER = "#1c1a18";
const vb = `${(-VIEW.w / 2) * 100} ${(-VIEW.h / 2) * 100} ${VIEW.w * 100} ${VIEW.h * 100}`;
// screen canvas (720 × 490) → glass rect (97 × 66) centred on the bezel
const gx = (x: number) => L.window.x * 100 - 48.5 + x * (97 / 720);
const gy = (y: number) => -L.window.y * 100 - 33 + y * (66 / 490);
const SMILE = ["..X.", "X..X", "...X", "...X", "...X", "X..X", "..X."];
const LINES = ["> DESIGN_", "> CODE_", "> EXPERIMENT_", "> REPEAT_"];
const crt = { fontFamily: "var(--font-crt)", fill: OR } as const;

function Icon({ id }: { id: (typeof KEYS)[number] }) {
  const p = { fill: "none", stroke: "#1a1815", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (id === "design") return <path d="M0 -4.4 Q0.7 -0.7 4.4 0 Q0.7 0.7 0 4.4 Q-0.7 0.7 -4.4 0 Q-0.7 -0.7 0 -4.4Z" fill="#1a1815" />;
  if (id === "code") return <path d="M-2.2 -2.6 L-5 0 L-2.2 2.6 M2.2 -2.6 L5 0 L2.2 2.6 M1.1 -3.4 L-1.1 3.4" {...p} />;
  if (id === "experiment")
    return <path d="M0 -4.2 L3.6 -2.1 L3.6 2.1 L0 4.2 L-3.6 2.1 L-3.6 -2.1Z M0 0 L-3.6 -2.1 M0 0 L3.6 -2.1 M0 0 L0 4.2" {...p} />;
  return <path d="M-2 -3.2 L3.6 0 L-2 3.2Z" fill="#1a1815" />;
}

function Screen({ mode }: { mode: Mode }) {
  if (mode === "idle")
    return (
      <>
        <text x={gx(66)} y={gy(80)} fontSize={3.5} opacity={0.55} style={crt}>
          {site.version}
        </text>
        {SMILE.flatMap((row, r) =>
          [...row].map((c, k) => (c === "X" ? <rect key={`${r}-${k}`} x={gx(88 + k * 18)} y={gy(150 + r * 18)} width={2.2} height={2.2} fill={OR} /> : null)),
        )}
        {LINES.map((l, i) => (
          <text key={l} x={gx(226)} y={gy(168 + i * 60)} fontSize={7.3} style={crt}>
            {l}
          </text>
        ))}
      </>
    );
  const label = { design: "DESIGN.FIG", code: "main.ts", experiment: "OSC 3:4", play: "BREAKOUT" }[mode];
  return (
    <>
      <text x={gx(66)} y={gy(80)} fontSize={3.5} opacity={0.55} style={crt}>
        {label}
      </text>
      {mode === "design" ? (
        <path d={`M${gx(110)} ${gy(320)} C${gx(160)} ${gy(220)} ${gx(260)} ${gy(205)} ${gx(360)} ${gy(205)} S${gx(560)} ${gy(260)} ${gx(610)} ${gy(300)}`} fill="none" stroke={OR} strokeWidth={0.9} />
      ) : mode === "code" ? (
        ["export function build(spark) {", "  const proto = sketch(spark);", "  return ship(proto);", "}"].map((l, i) => (
          <text key={l} x={gx(80)} y={gy(170 + i * 52)} fontSize={4.4} style={{ ...crt, whiteSpace: "pre" }}>
            {l}
          </text>
        ))
      ) : mode === "experiment" ? (
        <path
          d={Array.from({ length: 121 }, (_, i) => {
            const u = (i / 120) * Math.PI * 2;
            return `${i ? "L" : "M"}${gx(360 + Math.sin(3 * u + 0.8) * 230).toFixed(2)} ${gy(250 + Math.sin(4 * u) * 140).toFixed(2)}`;
          }).join(" ")}
          fill="none"
          stroke={OR}
          strokeWidth={0.7}
        />
      ) : (
        <>
          {Array.from({ length: 27 }, (_, i) => (
            <rect key={i} x={gx(60 + (i % 9) * 67.3)} y={gy(104 + Math.floor(i / 9) * 22)} width={8.4} height={2.1} fill={OR} opacity={1 - Math.floor(i / 9) * 0.2} />
          ))}
          <rect x={gx(310)} y={gy(420)} width={14} height={1.4} fill={OR} />
        </>
      )}
    </>
  );
}

export const Silhouette = memo(function Silhouette({ mode, chaos }: { mode: Mode; chaos: boolean }) {
  const B = L.body;
  const bz = L.bezel;
  const k = L.knob;
  return (
    <svg viewBox={vb} className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="hero-sil-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1eadc" />
          <stop offset="1" stopColor="#ddd3c1" />
        </linearGradient>
        <radialGradient id="hero-sil-glass" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#1c1410" />
          <stop offset="1" stopColor="#090706" />
        </radialGradient>
      </defs>
      {/* cable */}
      <path d="M80 -90 C80 -106 86 -118 100 -126 C118 -136 136 -128 156 -138 C182 -151 204 -170 250 -215" fill="none" stroke={OR} strokeWidth={6} strokeLinecap="round" />
      <rect x={75.5} y={-90} width={9} height={7} rx={1.5} fill={OR} />
      <rect x={73} y={-83.5} width={14} height={4} rx={1} fill={RUBBER} />
      {/* body + depth */}
      <rect x={-B.w * 50 + 3} y={-B.h * 50 + 6} width={B.w * 100 - 6} height={B.h * 100} rx={B.r * 100} fill="#c8bda9" />
      <rect x={-B.w * 50} y={-B.h * 50} width={B.w * 100} height={B.h * 100} rx={B.r * 100} fill="url(#hero-sil-body)" stroke="rgb(0 0 0 / 0.1)" strokeWidth={0.6} />
      {/* CRT */}
      <rect x={bz.x * 100 - bz.w * 50} y={-bz.y * 100 - bz.h * 50} width={bz.w * 100} height={bz.h * 100} rx={bz.r * 100} fill="#f2ecdf" stroke="rgb(0 0 0 / 0.12)" strokeWidth={0.6} />
      <rect x={bz.x * 100 - 54} y={-bz.y * 100 - 37} width={108} height={74} rx={12} fill={RUBBER} />
      <rect x={bz.x * 100 - 47} y={-bz.y * 100 - 31} width={94} height={62} rx={7} fill="url(#hero-sil-glass)" />
      <Screen mode={mode} />
      {/* knob */}
      {Array.from({ length: 11 }, (_, i) => {
        const a = ((-135 + i * 27) * Math.PI) / 180;
        const r0 = 22.2, r1 = i % 5 === 0 ? 26.2 : 25;
        return (
          <line key={i} x1={k.x * 100 + Math.sin(a) * r0} y1={-k.y * 100 - Math.cos(a) * r0} x2={k.x * 100 + Math.sin(a) * r1} y2={-k.y * 100 - Math.cos(a) * r1} stroke="#1a1815" strokeWidth={1.2} />
        );
      })}
      <circle cx={k.x * 100} cy={-k.y * 100} r={19.8} fill={RUBBER} />
      <circle cx={k.x * 100} cy={-k.y * 100} r={16.4} fill={OR} />
      <circle cx={k.x * 100 - 3} cy={-k.y * 100 - 4} r={9} fill="#ff7a45" opacity={0.6} />
      <line x1={k.x * 100} y1={-k.y * 100 - 5.5} x2={k.x * 100} y2={-k.y * 100 - 12.3} stroke="#1a1815" strokeWidth={1.6} strokeLinecap="round" />
      {/* switch + LED */}
      <rect x={L.switch.x * 100 - 18} y={-L.switch.y * 100 - 7.5} width={36} height={15} rx={3.5} fill={RUBBER} />
      <rect x={L.switch.x * 100 + (chaos ? 0.5 : -16.5)} y={-L.switch.y * 100 - 5.6} width={16} height={11.2} rx={2} fill={OR} />
      <circle cx={L.switch.x * 100 - 21.5} cy={-L.switch.y * 100} r={1.2} fill="#1a1815" />
      <rect x={L.switch.x * 100 + 20} y={-L.switch.y * 100 - 0.6} width={5} height={1.2} fill="#1a1815" />
      <circle cx={L.led.x * 100} cy={-L.led.y * 100} r={3} fill="#1a1815" />
      <circle cx={L.led.x * 100} cy={-L.led.y * 100} r={2.2} fill={chaos ? OR : "#3a1d10"} />
      {/* grille */}
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={62.5 + (i % 4) * 7} cy={31.5 + Math.floor(i / 4) * 7} r={1.7} fill={RUBBER} />
      ))}
      {/* screws */}
      {[[-94, -64], [94, -64], [-94, 64], [94, 64]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r={3.4} fill="#9a958c" />
          <path d={`M${x - 2} ${y - 0.8} L${x + 2} ${y + 0.8} M${x - 0.8} ${y + 2} L${x + 0.8} ${y - 2}`} stroke="#1a1815" strokeWidth={0.7} />
        </g>
      ))}
      {/* keys */}
      <rect x={L.tray.x * 100 - 63.5} y={-L.tray.y * 100 - 17.5} width={127} height={35} rx={8.5} fill="#efe8da" stroke="rgb(0 0 0 / 0.1)" strokeWidth={0.5} />
      <rect x={L.tray.x * 100 - 61} y={-L.tray.y * 100 - 15} width={122} height={30} rx={6} fill={RUBBER} />
      {KEYS.map((id, i) => {
        const x = keyX(i) * 100;
        const y = -L.tray.y * 100 + (mode === id ? 1.2 : 0);
        const fill = id === "play" ? OR : "#f1eadd";
        return (
          <g key={id} transform={`translate(${x} ${y})`}>
            <rect x={-13.2} y={-10} width={26.4} height={22} rx={5} fill={id === "play" ? "#d9461a" : "#cfc6b6"} />
            <rect x={-13.2} y={-11} width={26.4} height={20.5} rx={5} fill={fill} />
            <rect x={-10.2} y={-8.6} width={20.4} height={15.4} rx={3.6} fill={fill} stroke="rgb(0 0 0 / 0.07)" strokeWidth={0.5} />
            <g transform="translate(0 -1)">
              <Icon id={id} />
            </g>
          </g>
        );
      })}
    </svg>
  );
});
