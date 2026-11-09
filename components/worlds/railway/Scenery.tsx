// SVG art for the view out of the coach window. Server-safe (no hooks).
// Every tile is drawn so its left and right edges meet: the Landscape engine repeats and slides them.
import type { CSSProperties } from "react";
import { seeded } from "@/lib/utils";
import { toMin } from "./rail";
import type { Station } from "./scene";

export const TILE = {
  clouds: { w: 1600, h: 300 },
  hills: { w: 1200, h: 240 },
  trees: { w: 1000, h: 200 },
  fields: { w: 1000, h: 220 },
  ground: { w: 600, h: 120 },
  poles: { w: 800, h: 1000 },
} as const;

const MUSTARD: CSSProperties = { fill: "var(--rw-mustard)" };
const HI: CSSProperties = { fontFamily: "var(--rw-hi)" };
const EN: CSSProperties = { fontFamily: "var(--font-display)", fontVariationSettings: '"wdth" 72' };
const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Periodic Catmull-Rom ridge: a smooth skyline whose two ends join without a kink. */
function ridge(pts: [number, number][], w: number, h: number) {
  const n = pts.length;
  const P = (i: number): [number, number] => {
    const [x, y] = pts[((i % n) + n) % n];
    return [x + Math.floor(i / n) * w, y];
  };
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P(i - 1);
    const [x1, y1] = P(i);
    const [x2, y2] = P(i + 1);
    const [x3, y3] = P(i + 2);
    d += ` C${r1(x1 + (x2 - x0) / 6)} ${r1(y1 + (y2 - y0) / 6)} ${r1(x2 - (x3 - x1) / 6)} ${r1(y2 - (y3 - y1) / 6)} ${x2} ${y2}`;
  }
  return `${d} V${h} H0 Z`;
}

const HILL_BACK = ridge(
  [[0, 150], [140, 104], [290, 126], [420, 84], [560, 116], [700, 96], [850, 138], [980, 102], [1100, 124]],
  1200,
  240,
);
const HILL_FRONT = ridge(
  [[0, 192], [110, 172], [250, 186], [380, 160], [520, 184], [660, 170], [800, 190], [930, 164], [1070, 180]],
  1200,
  240,
);

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="18" rx="120" ry="22" />
      <circle cx="-55" cy="4" r="34" />
      <circle cx="-5" cy="-14" r="48" />
      <circle cx="52" cy="2" r="36" />
      <circle cx="90" cy="14" r="22" />
    </g>
  );
}

export function CloudsArt() {
  return (
    <g fill="#fbf6ea" opacity="0.88">
      <Cloud x={260} y={130} s={1} />
      <Cloud x={860} y={70} s={0.7} />
      <Cloud x={1330} y={170} s={0.85} />
    </g>
  );
}

export function HillsArt() {
  return (
    <>
      <path d={HILL_BACK} fill="#b4c0cb" />
      <path d={HILL_FRONT} fill="#94a69c" />
    </>
  );
}

function Tree({ x, s, c = "#47623f" }: { x: number; s: number; c?: string }) {
  return (
    <g fill={c}>
      <rect x={r1(x - 3 * s)} y={r1(200 - 34 * s)} width={r1(6 * s)} height={r1(34 * s)} />
      <circle cx={x} cy={r1(200 - 64 * s)} r={r1(30 * s)} />
      <circle cx={r1(x - 22 * s)} cy={r1(200 - 50 * s)} r={r1(22 * s)} />
      <circle cx={r1(x + 22 * s)} cy={r1(200 - 48 * s)} r={r1(24 * s)} />
    </g>
  );
}
const Eucalyptus = ({ x }: { x: number }) => (
  <g fill="#55704a">
    <rect x={x - 2} y={90} width={4} height={110} />
    <ellipse cx={x} cy={100} rx={11} ry={44} />
  </g>
);
const Palm = ({ x }: { x: number }) => (
  <g stroke="#3f5a39" strokeLinecap="round" fill="none">
    <path d={`M${x} 200 Q ${x + 6} 140 ${x + 2} 84`} strokeWidth={5} />
    <path
      d={`M${x + 2} 84 q -26 -6 -38 12 M${x + 2} 84 q 26 -8 38 10 M${x + 2} 84 q -16 -20 -32 -16 M${x + 2} 84 q 18 -20 32 -14 M${x + 2} 84 q -2 -18 2 -28`}
      strokeWidth={4}
    />
  </g>
);
const Kiln = ({ x }: { x: number }) => (
  <g>
    <path d={`M${x - 10} 200 L${x - 5} 62 L${x + 5} 62 L${x + 10} 200Z`} fill="#8a4a33" />
    <rect x={x - 6} y={57} width={12} height={6} fill="#6f3a28" />
    <g fill="#a3a9ae" opacity="0.4">
      <circle cx={x + 6} cy={44} r={9} />
      <circle cx={x + 18} cy={30} r={12} />
      <circle cx={x + 36} cy={20} r={14} />
    </g>
  </g>
);
const Temple = ({ x }: { x: number }) => (
  <g>
    <rect x={x - 26} y={168} width={52} height={32} fill="#d9b68b" />
    <path d={`M${x - 22} 170 C ${x - 22} 130, ${x - 8} 104, ${x} 96 C ${x + 8} 104, ${x + 22} 130, ${x + 22} 170 Z`} fill="#d8a46c" />
    <ellipse cx={x} cy={95} rx={8} ry={3.5} fill="#c48d55" />
    <line x1={x} y1={92} x2={x} y2={66} stroke="#5b4636" strokeWidth={2} />
    <path d={`M${x} 66 L${x + 22} 72 L${x} 79 Z`} fill="#e8742a" />
  </g>
);

export function TreesArt() {
  return (
    <>
      <Tree x={56} s={1} />
      <Tree x={108} s={0.78} c="#55704a" />
      <Eucalyptus x={150} />
      <Tree x={214} s={1.15} />
      <Tree x={262} s={0.86} c="#55704a" />
      <Palm x={330} />
      <Kiln x={418} />
      <Tree x={500} s={1.05} />
      <Tree x={548} s={0.8} c="#55704a" />
      <Eucalyptus x={598} />
      <Temple x={686} />
      <Tree x={772} s={0.95} />
      <Palm x={842} />
      <Tree x={912} s={1.05} />
      <Tree x={956} s={0.7} c="#55704a" />
    </>
  );
}

const SPECKS = Array.from({ length: 70 }, (_, i) => [r1(seeded(i) * 990 + 5), r1(10 + seeded(i + 300) * 70)]);
const FURROWS = Array.from({ length: 30 }, (_, i) => 20 + i * 34)
  .map((x) => `M${x} 86 L${x - 70} 220`)
  .join(" ");

export function FieldsArt() {
  return (
    <>
      <path d="M0 8 L200 2 L236 86 L0 86Z" fill="#dcae2a" />
      <path d="M200 2 L450 6 L500 86 L236 86Z" fill="#8aa34f" />
      <path d="M450 6 L700 0 L736 86 L500 86Z" fill="#dcae2a" />
      <path d="M700 0 L900 5 L944 86 L736 86Z" fill="#7f9a48" />
      <path d="M900 5 L1000 8 L1000 86 L944 86Z" fill="#dcae2a" />
      <g fill="#f4d45c" opacity="0.8">
        {SPECKS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.8" />
        ))}
      </g>
      <rect x="0" y="86" width="1000" height="134" fill="#7d9845" />
      <path d="M520 86 L880 86 L820 220 L440 220Z" fill="#d6a628" />
      <path d={FURROWS} stroke="#000" strokeOpacity="0.09" strokeWidth="3" />
      <path d="M150 130 Q 176 70 202 130Z" fill="#cfa64a" />
      <path d="M196 134 Q 214 94 232 134Z" fill="#c39a40" />
      <rect x="690" y="44" width="44" height="30" fill="#b98a5e" />
      <path d="M684 46 L712 22 L740 46Z" fill="#8a6a3a" />
      <rect x="706" y="58" width="10" height="16" fill="#5e4632" />
      <path d="M360 220 C 380 170, 400 124, 424 86" stroke="#c2a074" strokeWidth="12" fill="none" />
    </>
  );
}

const STREAKS = Array.from({ length: 16 }, (_, i) => {
  const len = 20 + seeded(i + 40) * 50;
  const x = seeded(i + 80) * (590 - len);
  return `M${r1(x)} ${r1(8 + seeded(i + 120) * 44)} h${r1(len)}`;
}).join(" ");
const STONES = Array.from({ length: 60 }, (_, i) => [r1(seeded(i + 500) * 594), r1(68 + seeded(i + 700) * 48), seeded(i + 900) > 0.5]);

export function GroundArt() {
  return (
    <>
      <rect x="0" y="0" width="600" height="60" fill="#3b5834" />
      <path d={STREAKS} stroke="#5a7b4c" strokeWidth="3" strokeLinecap="round" />
      <rect x="0" y="54" width="600" height="9" fill="#a39d90" />
      <rect x="0" y="63" width="600" height="57" fill="#7b766c" />
      {STONES.map(([x, y, light], i) => (
        <rect key={i} x={x as number} y={y as number} width="6" height="4" rx="1.5" fill={light ? "#9a958a" : "#5e5a52"} />
      ))}
    </>
  );
}

const DROPPERS = Array.from({ length: 16 }, (_, i) => 25 + i * 50)
  .map((x) => `M${x} 90 V128`)
  .join(" ");

/** Overhead-line mast + catenary. Spans the full window height. */
export function PolesArt() {
  return (
    <>
      <path d="M0 90 H800 M0 128 H800" stroke="#1e2229" strokeWidth="2.5" />
      <path d={DROPPERS} stroke="#1e2229" strokeWidth="1.2" />
      <rect x="236" y="112" width="164" height="7" rx="3" fill="#2b2f36" />
      <path d="M400 190 L250 118" stroke="#2b2f36" strokeWidth="5" />
      <rect x="300" y="104" width="10" height="22" rx="2" fill="#8c6f5a" />
      <rect x="392" y="56" width="16" height="944" fill="#2b2f36" />
      <rect x="392" y="56" width="4" height="944" fill="#4a505a" />
      <rect x="380" y="972" width="40" height="28" fill="#8d887d" />
    </>
  );
}

function Person({ x, shirt, s = 1, skin = "#6e4a32" }: { x: number; shirt: string; s?: number; skin?: string }) {
  return (
    <g transform={`translate(${x} 748) scale(${s})`}>
      <rect x="-14" y="-92" width="11" height="92" rx="4" fill="#23262e" />
      <rect x="3" y="-92" width="11" height="92" rx="4" fill="#23262e" />
      <rect x="-22" y="-178" width="44" height="94" rx="14" fill={shirt} />
      <circle cx="0" cy="-198" r="18" fill={skin} />
      <path d="M-18 -204 Q 0 -224 18 -204 Z" fill="#1d1b1a" />
    </g>
  );
}

/** A platform: canopy, columns, tea stall, clock, the yellow nameboard, people, our partner at the coach mark. */
export function PlatformArt({ station, coach }: { station: Station; coach: string }) {
  const t = toMin(station.arr ?? station.dep ?? "12:00");
  const ha = (((t / 60) % 12) * 30 * Math.PI) / 180;
  const ma = ((t % 60) * 6 * Math.PI) / 180;
  const hiLong = station.hi.length > 10;
  const enLong = station.en.length > 13;
  const scallops = Array.from({ length: 60 }, (_, i) => `M${i * 40} 124 a20 14 0 0 0 40 0`).join(" ");
  return (
    <svg viewBox="0 0 2400 800" preserveAspectRatio="xMidYMax slice">
      <rect x="0" y="140" width="2400" height="470" fill="#e4d6b6" />
      <rect x="0" y="292" width="2400" height="14" fill="#cdb98f" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${90 + i * 300} 590 V400 a60 60 0 0 1 120 0 V590Z`} fill="#394050" />
      ))}
      <rect x="0" y="0" width="2400" height="112" fill="#2c3240" />
      <rect x="0" y="104" width="2400" height="20" style={MUSTARD} />
      <path d={scallops} fill="#2c3240" />
      {Array.from({ length: 8 }, (_, i) => 150 + i * 300).map((x) => (
        <g key={x} fill="#6b3a2e">
          <rect x={x - 8} y={124} width={16} height={520} />
          <rect x={x - 15} y={124} width={30} height={12} />
          <rect x={x - 13} y={632} width={26} height={14} />
        </g>
      ))}
      <rect x="0" y="600" width="2400" height="200" fill="#c2b9a6" />
      <rect x="0" y="600" width="2400" height="6" fill="#a9a08c" />
      <rect x="0" y="742" width="2400" height="12" style={MUSTARD} />
      <rect x="0" y="770" width="2400" height="30" fill="#8a8273" />

      {/* tea stall + vendor */}
      <Person x={470} shirt="#e9e2d2" s={0.9} />
      <g>
        <rect x="300" y="560" width="240" height="140" fill="#eadfc4" stroke="#8a6a3a" strokeWidth="3" />
        <rect x="300" y="560" width="240" height="18" fill="#c9b78f" />
        <rect x="306" y="470" width="8" height="92" fill="#5b3d2e" />
        <rect x="526" y="470" width="8" height="92" fill="#5b3d2e" />
        <rect x="290" y="436" width="260" height="40" fill="#b65a34" />
        <text x="420" y="465" fontSize="25" fill="#f6eedd" textAnchor="middle" style={HI}>
          चाय · CHAI
        </text>
        <ellipse cx="352" cy="546" rx="20" ry="16" fill="#b8c0c8" />
        <path d="M370 542 l16 -10" stroke="#b8c0c8" strokeWidth="5" strokeLinecap="round" />
        {[400, 420, 440, 460].map((x) => (
          <path key={x} d={`M${x} 540 h14 l-2 18 h-10 Z`} fill="#b65a34" />
        ))}
      </g>

      {/* clock at arrival time */}
      <line x1="760" y1="124" x2="760" y2="160" stroke="#22262e" strokeWidth="4" />
      <circle cx="760" cy="196" r="36" fill="#f6eedd" stroke="#22262e" strokeWidth="6" />
      <line x1="760" y1="196" x2={r1(760 + 17 * Math.sin(ha))} y2={r1(196 - 17 * Math.cos(ha))} stroke="#111" strokeWidth="5" strokeLinecap="round" />
      <line x1="760" y1="196" x2={r1(760 + 26 * Math.sin(ma))} y2={r1(196 - 26 * Math.cos(ma))} stroke="#111" strokeWidth="3" strokeLinecap="round" />

      <Person x={640} shirt="#5c6b80" />

      {/* nameboard */}
      <rect x="1018" y="440" width="14" height="300" fill="#1c1c1c" />
      <rect x="1368" y="440" width="14" height="300" fill="#1c1c1c" />
      <rect x="975" y="290" width="450" height="170" rx="6" style={MUSTARD} stroke="#111" strokeWidth="5" />
      <text x="1200" y="366" textAnchor="middle" fontSize="68" fontWeight="700" fill="#111" style={HI} {...(hiLong ? { textLength: 400, lengthAdjust: "spacingAndGlyphs" } : {})}>
        {station.hi}
      </text>
      <text x="1200" y="436" textAnchor="middle" fontSize="50" fontWeight="800" fill="#111" letterSpacing="3" style={EN} {...(enLong ? { textLength: 410, lengthAdjust: "spacingAndGlyphs" } : {})}>
        {station.en.toUpperCase()}
      </text>
      <rect x="1125" y="476" width="150" height="30" fill="#f6eedd" stroke="#111" strokeWidth="2" />
      <text x="1200" y="497" textAnchor="middle" fontSize="17" fill="#111" style={MONO}>
        MSL {station.msl} M
      </text>

      {/* bench */}
      <rect x="1470" y="652" width="130" height="9" fill="#5b3d2e" />
      <rect x="1470" y="682" width="130" height="10" fill="#6d4a37" />
      <rect x="1480" y="690" width="7" height="44" fill="#2a2a2a" />
      <rect x="1583" y="690" width="7" height="44" fill="#2a2a2a" />

      {/* porter in red with a suitcase on his head */}
      <g>
        <rect x="1612" y="496" width="64" height="36" rx="4" fill="#3d2f28" />
        <Person x={1644} shirt="#b3302a" />
        <rect x="1622" y="590" width="14" height="10" style={MUSTARD} />
      </g>

      {/* coach-position board and our delivery partner waiting under it */}
      <line x1="1880" y1="124" x2="1880" y2="168" stroke="#22262e" strokeWidth="3" />
      <rect x="1840" y="168" width="80" height="42" rx="3" fill="#11161f" />
      <text x="1880" y="198" textAnchor="middle" fontSize="26" fontWeight="600" style={{ ...MONO, ...MUSTARD }}>
        {coach}
      </text>
      <Person x={1880} shirt="#d8ff00" />
      <g>
        <rect x="1852" y="604" width="56" height="36" rx="3" fill="#c89b62" />
        <rect x="1852" y="616" width="56" height="10" fill="#d8ff00" />
      </g>

      <Person x={2090} shirt="#8b3a62" s={0.94} />
      <Person x={2150} shirt="#3f5c4a" s={0.78} skin="#7d5539" />
    </svg>
  );
}

/** The yellow board of a station the train does not stop at. */
export function StationBoardArt({ station }: { station: Station }) {
  return (
    <svg viewBox="0 0 400 260">
      <rect x="86" y="120" width="12" height="140" fill="#1c1c1c" />
      <rect x="302" y="120" width="12" height="140" fill="#1c1c1c" />
      <rect x="40" y="20" width="320" height="118" rx="5" style={MUSTARD} stroke="#111" strokeWidth="4" />
      <text x="200" y="72" textAnchor="middle" fontSize="44" fontWeight="700" fill="#111" style={HI} {...(station.hi.length > 9 ? { textLength: 290, lengthAdjust: "spacingAndGlyphs" } : {})}>
        {station.hi}
      </text>
      <text x="200" y="120" textAnchor="middle" fontSize="34" fontWeight="800" fill="#111" letterSpacing="2" style={EN}>
        {station.en.toUpperCase()}
      </text>
      <rect x="135" y="150" width="130" height="26" fill="#f6eedd" stroke="#111" strokeWidth="2" />
      <text x="200" y="168" textAnchor="middle" fontSize="14" fill="#111" style={MONO}>
        MSL {station.msl} M
      </text>
    </svg>
  );
}
