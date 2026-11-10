// The desk and everything on it, drawn in desk space (iso.tsx). Desk top: x 0–600, y 0–300, z 0.
// Each object is measured once at module load; its screen box becomes its viewBox and its position
// on the stage, so the same drawing works on the desk and in the phone's stacked exhibit grid.
import { profile } from "@/data/profile";
import { seeded } from "@/lib/utils";
import { INK, MAT, P, box, cyl, disc, measure, onFront, onSide, onTop, pts, rbox, reach, union } from "./iso";

const LINE = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const SOFT = "url(#ab-soft)";
const PAPER = "#fbfaf6";
const ORANGE = "#ff5a1f";
const LIME = "#d8ff00";
const FLOOR = -108;
const LEG = -FLOOR - 18;

/* ── desk ─────────────────────────────────────────────────────────────── */

export const DESK = measure(() => (
  <g {...LINE}>
    <polygon points={pts([16, 16, FLOOR], [616, 16, FLOOR], [616, 316, FLOOR], [16, 316, FLOOR])} fill={INK} opacity={0.07} stroke="none" />
    {box(566, 14, FLOOR, 18, 18, LEG, MAT.desk)}
    {box(14, 268, FLOOR, 18, 18, LEG, MAT.desk)}
    {box(566, 268, FLOOR, 18, 18, LEG, MAT.desk)}
    {box(0, 0, -18, 600, 300, 18, MAT.desk)}
    {/* a worn line where the sitter's wrists rest */}
    <polyline points={pts([40, 286, 0], [560, 286, 0])} stroke={INK} strokeOpacity={0.12} />
  </g>
));

/** Floor dots, fading out from under the desk. Not measured: they may run past the stage. */
export const FLOOR_DOTS = (() => {
  const dots: string[] = [];
  for (let x = -160; x <= 760; x += 40)
    for (let y = -120; y <= 460; y += 40) {
      const d = Math.hypot((x - 300) / 460, (y - 150) / 300);
      if (d > 1) continue;
      const [X, Y] = P(x, y, FLOOR);
      dots.push(`M${X - 1.5} ${Y}a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0`);
    }
  return dots.join("");
})();

/* ── 01 monitor · development ─────────────────────────────────────────── */

const monitor = () => ({
  shadow: disc(155, 60, 0, 70, { fill: SOFT }),
  body: (
    <g {...LINE}>
      {box(110, 26, 0, 92, 64, 6, MAT.cream)}
      {box(148, 34, 6, 16, 12, 92, MAT.steel)}
      {box(48, 46, 66, 212, 16, 132, MAT.cream)}
      {onFront(48, 62, 198, <>
        <rect x={11} y={11} width={190} height={108} rx={8} fill="#1d1c1a" />
        <rect className="ab-screen" x={15} y={15} width={182} height={100} rx={6} fill="#0f0f0e" stroke="none" />
        <g className="ab-crt" stroke="none" fill={ORANGE} fontFamily="var(--font-vt323), monospace" fontSize={14}>
          <text x={26} y={36} opacity={0.6}>{`> ${profile.short.toLowerCase()} --roles`}</text>
          {profile.roles.map((r, i) => (
            <text key={r} x={26} y={54 + i * 16}>
              {r}
            </text>
          ))}
          <rect className="ab-caret" x={26} y={56 + profile.roles.length * 16 - 11} width={7} height={12} />
        </g>
        {/* a sticky note on the corner of the screen */}
        <g transform="rotate(7 188 104)">
          <rect x={174} y={90} width={28} height={28} fill={LIME} />
          <path d="M179 99h16M179 105h11" strokeWidth={1.1} />
        </g>
        <circle cx={200} cy={126} r={2.2} fill={ORANGE} stroke="none" />
      </>)}
      {onSide(260, 62, 198, <path d="M6 14v96" stroke={INK} strokeOpacity={0.18} />)}
    </g>
  ),
});

/* ── 02 cloud lamp · cloud ────────────────────────────────────────────── */

const CLOUD = "M-44 12A16 16 0 0 1-34-10A22 22 0 0 1-2-24A20 20 0 0 1 30-14A16 16 0 0 1 44 12Q46 22 36 22H-36Q-46 22-44 12Z";

const lamp = () => {
  const [hx, hy] = P(330, 36, 116);
  reach(hx - 50, hy - 30);
  reach(hx + 50, hy + 26);
  const [cx, cy] = P(330, 36, 7);
  return {
    shadow: disc(334, 40, 0, 30, { fill: SOFT }),
    body: (
      <g {...LINE}>
        <path d={`M${P(330, 18, 0.5).join(" ")}Q${P(334, 6, 0.5).join(" ")} ${P(356, 2, 0.5).join(" ")}`} fill="none" strokeWidth={2} />
        {cyl(330, 36, 0, 7, 19, MAT.cream)}
        <circle cx={cx + 9} cy={cy + 2} r={2} fill={ORANGE} stroke="none" />
        <line x1={cx} y1={cy} x2={hx} y2={hy + 20} strokeWidth={2.6} />
        <circle className="ab-glow" cx={hx} cy={hy} r={84} fill="url(#ab-lampglow)" stroke="none" />
        <g transform={`translate(${hx} ${hy})`}>
          <path d={CLOUD} fill={PAPER} />
          <path className="ab-bulb" d={CLOUD} fill="url(#ab-cloudlight)" stroke="none" />
          <path d="M-30 12Q-28 4-20 4" fill="none" strokeOpacity={0.35} />
        </g>
      </g>
    ),
  };
};

/* ── 03 beakers · experimentation ─────────────────────────────────────── */

/** A cone flask (r0 → r1 at the shoulder, then a neck) or a straight beaker when r0 === r1. */
function vessel(x: number, y: number, r0: number, r1: number, shoulder: number, top: number, fill: number, liquid: string, light: string) {
  const [cx, by] = P(x, y, 0);
  const a = r0 * 1.2247;
  const n = r1 * 1.2247;
  const b = r0 * 0.7071;
  const rAt = (z: number) => (z >= shoulder ? r1 : r0 - ((r0 - r1) * z) / shoulder);
  const lx = rAt(fill) * 1.2247;
  const ly = rAt(fill) * 0.7071;
  reach(cx - a, by + b);
  reach(cx + a, by - top - n);
  const glass = `M${cx - a} ${by}L${cx - n} ${by - shoulder}L${cx - n} ${by - top}L${cx + n} ${by - top}L${cx + n} ${by - shoulder}L${cx + a} ${by}A${a} ${b} 0 0 1 ${cx - a} ${by}Z`;
  const bubbles = [0, 1, 2].map((i) => ({
    x: cx + (seeded(x + i * 7) - 0.5) * lx,
    y: by - 4 - seeded(y + i * 3) * (fill - 6),
    r: 1.4 + seeded(i + x) * 1.6,
  }));
  return (
    <g>
      <path d={`M${cx - a} ${by}L${cx - lx} ${by - fill}L${cx + lx} ${by - fill}L${cx + a} ${by}A${a} ${b} 0 0 1 ${cx - a} ${by}Z`} fill={liquid} />
      <ellipse cx={cx} cy={by - fill} rx={lx} ry={ly} fill={light} />
      <g className="ab-bubbles" fill={PAPER} strokeWidth={0.9}>
        {bubbles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} style={{ animationDelay: `${-i * 0.45}s` }} />
        ))}
      </g>
      <path d={glass} fill="rgb(255 255 255 / 0.32)" />
      <ellipse cx={cx} cy={by - top} rx={n + 1.5} ry={(n + 1.5) * 0.577} fill="rgb(255 255 255 / 0.5)" />
      <path d={`M${cx - a + 7} ${by - 4}L${cx - n + 2} ${by - shoulder + 2}`} stroke="#fff" strokeOpacity={0.85} strokeWidth={2.4} />
      {[0.3, 0.5, 0.7].map((t) => (
        <path key={t} d={`M${cx + n - 2} ${by - top * t}h-5`} strokeWidth={1} />
      ))}
    </g>
  );
}

const beakers = () => ({
  shadow: (
    <>
      {disc(540, 52, 0, 30, { fill: SOFT })}
      {disc(530, 112, 0, 22, { fill: SOFT })}
    </>
  ),
  body: (
    <g {...LINE}>
      {vessel(540, 50, 24, 7, 40, 64, 22, LIME, "#ecff66")}
      {vessel(530, 110, 17, 17, 46, 46, 18, ORANGE, "#ff8a5c")}
    </g>
  ),
});

/* ── 04 chip robot · AI ───────────────────────────────────────────────── */

const MODEL = profile.spec.find((s) => s.key === "Model")?.value ?? profile.initials;

const robot = () => {
  const [a0, a1, ball] = [P(456, 163, 68), P(456, 163, 90), P(456, 163, 94)];
  return {
    shadow: disc(456, 172, 0, 36, { fill: SOFT }),
    body: (
      <g {...LINE}>
        {box(441, 178, 0, 8, 8, 16, MAT.ink)}
        {box(461, 178, 0, 8, 8, 16, MAT.ink)}
        {box(431, 150, 16, 48, 40, 30, MAT.ink)}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={`f${i}`}>{box(435 + i * 9, 190, 10, 3.4, 4, 12, MAT.steel)}</g>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <g key={`s${i}`}>{box(479, 154 + i * 9, 10, 4, 3.4, 12, MAT.steel)}</g>
        ))}
        {disc(436, 155, 46, 2.4, { fill: "#77736b", stroke: "none" })}
        {onTop(436, 187, 46, 0, (
          <text fontSize={7} fontFamily="var(--font-plex), monospace" letterSpacing={1} fill="#8f8b82" stroke="none">
            {MODEL}
          </text>
        ))}
        {box(441, 152, 46, 30, 22, 22, MAT.cream)}
        {onFront(441, 174, 68, (
          <g className="ab-eyes" fill={ORANGE} strokeWidth={1}>
            <circle cx={9} cy={9} r={3.4} />
            <circle cx={21} cy={9} r={3.4} />
          </g>
        ))}
        {onSide(471, 174, 68, <circle cx={11} cy={11} r={3} fill={MAT.steel.l} />)}
        <line x1={a0[0]} y1={a0[1]} x2={a1[0]} y2={a1[1]} strokeWidth={2} />
        <circle className="ab-antenna" cx={ball[0]} cy={ball[1]} r={4.4} fill={LIME} />
      </g>
    ),
  };
};

/* ── 05 sketchbook + pens · design ────────────────────────────────────── */

function pen(x0: number, y0: number, x1: number, y1: number, body: string, tip: string) {
  const [a, b] = [P(x0, y0, 4), P(x1, y1, 4)];
  const t = 0.12;
  const k = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return (
    <g strokeLinecap="round">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={8} />
      <line x1={k[0]} y1={k[1]} x2={b[0]} y2={b[1]} stroke={body} strokeWidth={5} />
      <line x1={a[0]} y1={a[1]} x2={k[0]} y2={k[1]} stroke={tip} strokeWidth={4} />
    </g>
  );
}

const sketchbook = () => ({
  shadow: (
    <polygon points={pts([40, 174, 0], [222, 174, 0], [222, 288, 0], [40, 288, 0])} fill={INK} opacity={0.1} />
  ),
  body: (
    <g {...LINE}>
      {box(34, 168, 0, 178, 112, 3, MAT.ink)}
      {box(39, 172, 3, 84, 104, 4, MAT.cream)}
      {box(125, 172, 3, 83, 104, 4, MAT.cream)}
      {onTop(39, 172, 7, 0, (
        <g stroke="none">
          <rect x={12} y={10} width={9} height={9} fill={INK} />
          <rect x={25} y={10} width={9} height={9} fill={ORANGE} />
          <rect x={38} y={10} width={9} height={9} fill={LIME} stroke={INK} strokeWidth={0.6} />
          <text x={10} y={58} fontSize={40} fontFamily="var(--font-instrument), serif" fontStyle="italic" fill={INK}>
            Aa
          </text>
          <path d="M12 70h56M12 78h56M12 86h40" stroke={INK} strokeOpacity={0.3} strokeWidth={0.8} />
        </g>
      ))}
      {onTop(125, 172, 7, 0, (
        <g fill="none">
          <path d="M12 84L23 22M71 72L58 18" stroke={INK} strokeOpacity={0.55} strokeWidth={0.8} />
          <path className="ab-curve" d="M12 84C23 22 58 18 71 72" stroke={ORANGE} strokeWidth={2.6} />
          <circle cx={23} cy={22} r={2.6} fill={PAPER} strokeWidth={0.9} />
          <circle cx={58} cy={18} r={2.6} fill={PAPER} strokeWidth={0.9} />
          <rect x={10} y={82} width={4.5} height={4.5} fill={INK} stroke="none" />
          <rect x={69} y={70} width={4.5} height={4.5} fill={INK} stroke="none" />
        </g>
      ))}
      {pen(228, 182, 228, 272, ORANGE, INK)}
      {pen(246, 188, 256, 270, PAPER, INK)}
    </g>
  ),
});

/* ── 06 passport + boarding pass · experience ─────────────────────────── */

const passport = () => ({
  shadow: disc(318, 244, 0, 56, { fill: SOFT }),
  body: (
    <g {...LINE}>
      {rbox(326, 236, 0, 58, 118, 0.8, 10, MAT.cream)}
      {onTop(...turnCorner(326, 236, 58, 118, 10), 0.8, 10, (
        <g stroke="none">
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={7 + i * 2.9} y={10} width={seeded(i + 40) > 0.5 ? 1.8 : 0.9} height={18} fill={INK} />
          ))}
          <path d="M6 38h30M6 45h20" stroke={INK} strokeOpacity={0.4} strokeWidth={1.4} />
          <path d="M0 86h58" stroke={INK} strokeDasharray="2 2.5" strokeWidth={0.8} />
          <rect x={0} y={90} width={58} height={28} fill={ORANGE} />
        </g>
      ))}
      {rbox(300, 248, 0.8, 66, 88, 7, -8, MAT.ink)}
      {onTop(...turnCorner(300, 248, 66, 88, -8), 7.8, -8, (
        <g fill="none" stroke="#e8e2d7" strokeWidth={1.2}>
          <circle cx={33} cy={32} r={12} />
          <circle cx={33} cy={32} r={6.5} />
          <path d="M21 32h24M33 20v24" strokeWidth={0.8} />
          <text x={33} y={62} textAnchor="middle" fontSize={6.6} letterSpacing={1.6} fontFamily="var(--font-plex), monospace" fill="#e8e2d7" stroke="none">
            PASSPORT
          </text>
        </g>
      ))}
    </g>
  ),
});

/** far-left corner of a turned box, as onTop() wants it: [x, y, z-less] */
function turnCorner(cx: number, cy: number, w: number, d: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return [cx + (-w / 2) * c - (-d / 2) * s, cy + (-w / 2) * s + (-d / 2) * c];
}

/* ── 07 headphones, ticket, macro pad · interests ─────────────────────── */

const interests = () => {
  const band = onTop(490, 238, 7, 0, <path d="M-34 0A34 34 0 0 1 34 0" fill="none" stroke={INK} strokeWidth={6} />);
  return {
    shadow: (
      <>
        {disc(492, 236, 0, 40, { fill: SOFT })}
        {disc(568, 272, 0, 30, { fill: SOFT })}
      </>
    ),
    body: (
      <g {...LINE}>
        {rbox(402, 272, 0, 76, 36, 0.6, -14, MAT.cream)}
        {onTop(...turnCorner(402, 272, 76, 36, -14), 0.6, -14, (
          <g stroke="none">
            <rect x={0} y={0} width={14} height={36} fill={ORANGE} />
            <path d="M14 0v36" stroke={INK} strokeDasharray="2 2" strokeWidth={0.7} />
            <path d="M22 9h30M22 16h44M22 23h22M22 29h36" stroke={INK} strokeOpacity={0.55} strokeWidth={1.5} />
          </g>
        ))}
        {band}
        {cyl(456, 238, 0, 13, 13, MAT.ink, ORANGE)}
        {cyl(524, 238, 0, 13, 13, MAT.ink, ORANGE)}
        {disc(456, 238, 13, 7, { fill: INK })}
        {disc(524, 238, 13, 7, { fill: INK })}
        {box(543, 254, 0, 50, 40, 9, MAT.cream)}
        {[0, 1, 2].map((i) => (
          <g key={i} className="ab-key">
            {box(547 + i * 15.5, 262, 9, 12, 12, 7, i === 2 ? MAT.orange : MAT.cream)}
          </g>
        ))}
      </g>
    ),
  };
};

/* ── registry ─────────────────────────────────────────────────────────── */

export const ART = {
  monitor: measure(monitor),
  lamp: measure(lamp),
  beakers: measure(beakers),
  robot: measure(robot),
  sketchbook: measure(sketchbook),
  passport: measure(passport),
  interests: measure(interests),
};
export type ArtId = keyof typeof ART;

/** The whole drawing's box, with headroom above the monitor for callouts. */
export const SCENE = (() => {
  const b = union(DESK.box, ...Object.values(ART).map((a) => a.box));
  return { x: b.x - 24, y: b.y - 56, w: b.w + 48, h: b.h + 64 };
})();
