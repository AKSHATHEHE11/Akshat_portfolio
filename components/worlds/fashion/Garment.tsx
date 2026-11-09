"use client";
// Garment "flats" — the technical drawings fashion teams use, drawn by hand as SVG.
// Recolourable: a colour change dips the garment in the new dye from the hem up.
import { useId, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { lerp } from "@/lib/utils";
import { COPPER, detailOf, luminance, mix } from "./kit";
import type { GarmentKind } from "./scene";

interface Props {
  kind: GarmentKind;
  colour: string;
  /** trousers: 0 tapered … 1 wide */
  leg?: number;
  pocket?: boolean;
  className?: string;
  /** pass a label to expose the drawing as an image; decorative otherwise */
  label?: string;
  /** recolour instantly (thumbnails, clones) */
  still?: boolean;
}

const DENIM: GarmentKind[] = ["denim-jacket", "trousers", "cargo"];
const DYE = "M-20 0Q10-8 40 0T100 0T160 0T220 0T280 0V330H-20Z";

export function Garment({ kind, colour, leg = 0.5, pocket, className, label, still }: Props) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = `g${raw}`;
  const reduced = useReducedMotion();
  const [base, setBase] = useState(colour);
  const dye = useRef<SVGPathElement>(null);
  const instant = still || reduced;

  useGSAP(
    () => {
      if (instant || base === colour || !dye.current) return;
      gsap.fromTo(
        dye.current,
        { attr: { transform: "translate(0 300)" } },
        {
          attr: { transform: "translate(0 -18)" },
          duration: 0.95,
          ease: "power2.inOut",
          overwrite: true,
          onComplete: () => setBase(colour),
        },
      );
    },
    { dependencies: [colour, instant] },
  );

  const shown = instant ? colour : base;
  const denim = DENIM.includes(kind);

  return (
    <svg
      viewBox="0 0 240 280"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        {denim ? (
          <pattern id={`${id}t`} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform={`rotate(${kind === "trousers" && leg < 0.3 ? -27 : 27})`}>
            <rect width="1.1" height="3.4" fill="#fff" opacity="0.15" />
            <rect x="1.7" width="0.6" height="3.4" fill="#000" opacity="0.12" />
          </pattern>
        ) : kind === "jacket" ? (
          <pattern id={`${id}t`} width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="1" fill="#fff" opacity="0.08" />
            <rect width="1" height="3" fill="#000" opacity="0.06" />
          </pattern>
        ) : (
          <pattern id={`${id}t`} width="2.6" height="3" patternUnits="userSpaceOnUse">
            <rect width="0.9" height="3" fill="#000" opacity="0.07" />
          </pattern>
        )}
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.22" stopColor="#000" stopOpacity="0" />
          <stop offset="0.78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path ref={dye} d={DYE} transform="translate(0 -18)" />
        </clipPath>
      </defs>
      <Flat kind={kind} colour={shown} leg={leg} pocket={pocket} id={id} />
      {!instant && base !== colour ? (
        <g clipPath={`url(#${id}c)`}>
          <Flat kind={kind} colour={colour} leg={leg} pocket={pocket} id={id} />
        </g>
      ) : null}
    </svg>
  );
}

/* ── the drawings ─────────────────────────────────────────────────────────── */

function Flat({ kind, colour, leg, pocket, id }: { kind: GarmentKind; colour: string; leg: number; pocket?: boolean; id: string }) {
  const detail = detailOf(colour);
  const dark = luminance(colour) < 0.2;
  const denim = DENIM.includes(kind);
  const stitch = denim ? COPPER : detail;
  const metal = denim ? COPPER : dark ? "#a68a6d" : "#3b2d22";
  const tex = `url(#${id}t)`;

  /** a filled panel: cloth + weave texture (+ optional shadow) with a seam outline */
  const P = (d: string, shade = 0) => (
    <g key={`p${d}`}>
      <path d={d} fill={colour} stroke={detail} strokeWidth={1.1} strokeLinejoin="round" style={{ transition: "fill .4s" }} />
      <path d={d} fill={tex} />
      {shade ? <path d={d} fill="#000" opacity={shade} /> : null}
    </g>
  );
  /** topstitching */
  const S = (d: string) => (
    <path key={`s${d}`} d={d} fill="none" stroke={stitch} strokeWidth={0.95} strokeDasharray="3 2.2" strokeLinecap="round" opacity={0.95} />
  );
  /** seam / edge line */
  const L = (d: string) => <path key={`l${d}`} d={d} fill="none" stroke={detail} strokeWidth={1.1} strokeLinecap="round" />;
  /** button / rivet */
  const B = (x: number, y: number, r = 3.4) => (
    <g key={`b${x}-${y}`}>
      <circle cx={x} cy={y} r={r} fill={metal} />
      <circle cx={x} cy={y} r={r * 0.55} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={0.7} />
    </g>
  );
  const shading = (d: string) => (
    <g key={`sh${d}`}>
      <path d={d} fill={`url(#${id}v)`} />
      <path d={d} fill={`url(#${id}h)`} />
    </g>
  );

  let body: ReactNode;

  if (kind === "tee") {
    const D = "M96 30C104 42 136 42 144 30L182 40L222 84L200 108L182 92Q186 172 184 252Q120 257 56 252Q54 172 58 92L40 108L18 84L58 40Z";
    body = (
      <>
        {P(D)}
        {shading(D)}
        <path d="M96 30C104 42 136 42 144 30C136 23 104 23 96 30Z" fill={mix(colour, "#000000", 0.28)} />
        <path d="M96 30C104 42 136 42 144 30" fill="none" stroke={detail} strokeWidth={5} opacity={0.55} />
        {L("M58 40Q63 66 58 92")}
        {L("M182 40Q177 66 182 92")}
        {S("M23.4 78.1L45.4 102.1")}
        {S("M216.6 78.1L194.6 102.1")}
        {S("M59 244Q120 249 181 244")}
        <path d="M92 118Q101 170 95 236" stroke="#000" strokeOpacity={0.09} strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d="M150 112Q142 160 149 226" stroke="#fff" strokeOpacity={0.1} strokeWidth={6} fill="none" strokeLinecap="round" />
        {pocket ? (
          <>
            {P("M140 84H168V116H140Z")}
            {S("M140 89H168")}
          </>
        ) : null}
      </>
    );
  } else if (kind === "trousers" || kind === "cargo") {
    const R = (x: number) => 240 - x;
    const thighO = 61 - leg * 3;
    const kneeO = lerp(70, 50, leg);
    const hemO = lerp(78, 38, leg);
    const kneeI = lerp(111, 113, leg);
    const hemI = lerp(105, 114, leg);
    const D = `M72 14H168L171 32C176 52 ${R(thighO)} 76 ${R(thighO)} 110L${R(kneeO)} 184L${R(hemO)} 268H${R(hemI)}L${R(kneeI)} 184L124 108Q120 102 116 108L${kneeI} 184L${hemI} 268H${hemO}L${kneeO} 184L${thighO} 110C${thighO} 76 64 52 69 32Z`;
    // where the outer seam sits at y=140 (for cargo pockets)
    const xo = thighO + (kneeO - thighO) * ((140 - 110) / 74);
    body = (
      <>
        {P(D)}
        {shading(D)}
        {P("M72 14H168L171 32H69Z", 0.06)}
        {S("M71.5 18.5H168.5")}
        {S("M70 28H170")}
        {[82, 104, 131, 153].map((x) => P(`M${x} 11H${x + 5}V35H${x}Z`))}
        {B(120, 23, 3.6)}
        {L("M120 32V100")}
        {S("M127 32V84Q127 94 118 100")}
        {L("M88 32Q86 60 64.5 66")}
        {L("M152 32Q154 60 175.5 66")}
        {S("M158 34L159 48H169L170 35")}
        {[
          [88, 33.5],
          [64.8, 65.5],
          [152, 33.5],
          [175.2, 65.5],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.8} fill={COPPER} />
        ))}
        {S(`M${hemO + 1} 262H${hemI - 1}`)}
        {S(`M${R(hemO) - 1} 262H${R(hemI) + 1}`)}
        <path d="M103 116Q110 121 116 118M101 125Q108 130 115 127M137 116Q130 121 124 118M139 125Q132 130 125 127" stroke="#fff" strokeOpacity={0.22} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <ellipse cx={(thighO + 116) / 2} cy={150} rx={13} ry={36} fill="#fff" opacity={0.07} />
        <ellipse cx={R((thighO + 116) / 2)} cy={150} rx={13} ry={36} fill="#fff" opacity={0.07} />
        {kind === "cargo" ? (
          <>
            {P(`M${xo + 2} 136H${xo + 30}V178H${xo + 4}Z`)}
            {P(`M${xo + 1} 130H${xo + 31}V144H${xo + 2}Z`, 0.05)}
            {B(xo + 16, 139, 2.4)}
            {P(`M${R(xo + 2)} 136H${R(xo + 30)}V178H${R(xo + 4)}Z`)}
            {P(`M${R(xo + 1)} 130H${R(xo + 31)}V144H${R(xo + 2)}Z`, 0.05)}
            {B(R(xo + 16), 139, 2.4)}
            {S(`M${kneeO + 1} 196H${kneeI - 1}`)}
            {S(`M${R(kneeO) - 1} 196H${R(kneeI) + 1}`)}
          </>
        ) : null}
      </>
    );
  } else if (kind === "denim-jacket") {
    const T = "M100 28L62 42L70 104V236H170V104L178 42L140 28Q120 36 100 28Z";
    body = (
      <>
        {P("M62 42L26 196L50 204L70 104Z", 0.07)}
        {P("M178 42L214 196L190 204L170 104Z", 0.07)}
        {P(T)}
        {shading(T)}
        <path d="M100 28Q120 36 140 28Q120 21 100 28Z" fill={mix(colour, "#000000", 0.3)} />
        {L("M28.7 184.3L52.7 192.3")}
        {L("M211.3 184.3L187.3 192.3")}
        {B(40, 197, 2.6)}
        {B(200, 197, 2.6)}
        <path d="M44 90Q49 130 40 170" stroke="#fff" strokeOpacity={0.1} strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M196 90Q191 130 200 170" stroke="#000" strokeOpacity={0.08} strokeWidth={5} fill="none" strokeLinecap="round" />
        {L("M65 60L114 72")}
        {S("M65 64L114 76")}
        {L("M175 60L126 72")}
        {S("M175 64L126 76")}
        {S("M88 106V212M100 106V212M152 106V212M140 106V212")}
        {L("M76 150L84 198")}
        {L("M164 150L156 198")}
        {P("M80 84H108V96L94 104L80 96Z")}
        {P("M160 84H132V96L146 104L160 96Z")}
        {S("M82 88H106M134 88H158")}
        {B(94, 96, 2.8)}
        {B(146, 96, 2.8)}
        {L("M120 50V236")}
        {S("M125.5 52V212")}
        {P("M70 214H170V236H70Z", 0.05)}
        {S("M71 219H169M71 231H169")}
        {P("M70 216H82V230H70Z")}
        {P("M170 216H158V230H170Z")}
        {B(77, 223, 2.4)}
        {B(163, 223, 2.4)}
        {P("M100 28L84 35L91 70L117 50Z")}
        {P("M140 28L156 35L149 70L123 50Z")}
        {S("M99 33L89 38L94 62L111 49M141 33L151 38L146 62L129 49")}
        {[66, 104, 142, 180, 225].map((y) => B(120, y))}
      </>
    );
  } else {
    // field overshirt
    const T = "M100 28L60 42L66 104L64 246H176L174 104L180 42L140 28Q120 38 100 28Z";
    body = (
      <>
        {P("M60 42L24 190L48 200L66 104Z", 0.07)}
        {P("M180 42L216 190L192 200L174 104Z", 0.07)}
        {P(T)}
        {shading(T)}
        <path d="M100 28Q120 38 140 28Q120 21 100 28Z" fill={mix(colour, "#000000", 0.3)} />
        {L("M26.8 178.3L50.8 188.3")}
        {L("M213.2 178.3L189.2 188.3")}
        <path d="M42 90Q47 128 38 166" stroke="#fff" strokeOpacity={0.1} strokeWidth={5} fill="none" strokeLinecap="round" />
        {L("M120 50V246")}
        {S("M126 52V244")}
        {S("M65 240H175")}
        {P("M76 92H106V128H76Z")}
        {S("M78.5 103V125.5H103.5V103")}
        {P("M74 86H108V100H74Z", 0.05)}
        {P("M134 92H164V128H134Z")}
        {S("M136.5 103V125.5H161.5V103")}
        {P("M132 86H166V100H132Z", 0.05)}
        {P("M72 168H108V214H72Z")}
        {S("M72 174H108")}
        {P("M132 168H168V214H132Z")}
        {S("M132 174H168")}
        {P("M100 28L84 36Q84 58 95 66L118 50Z")}
        {P("M140 28L156 36Q156 58 145 66L122 50Z")}
        {B(91, 94, 2.8)}
        {B(149, 94, 2.8)}
        {[62, 98, 134, 170, 206].map((y) => B(120, y))}
      </>
    );
  }

  return <g>{body}</g>;
}
