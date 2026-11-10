// The app's home screen as a line drawing (300 × 560). Revision clouds and detail callouts point at
// its areas. An area that isn't `inked` yet is only a dashed construction box.
import { memo } from "react";
import type { Area } from "./scene";

export const AREA: Record<Area, [number, number, number, number]> = {
  login: [8, 30, 284, 52],
  next: [10, 86, 280, 66],
  plan: [20, 152, 260, 136],
  margin: [8, 348, 284, 52],
  list: [8, 402, 284, 112],
  tabs: [184, 518, 52, 38],
};

/** Centre of an area, for callout bubbles. */
export const centre = (a: Area) => {
  const [x, y, w, h] = AREA[a];
  return [x + w / 2, y + h / 2] as const;
};

function Part({ area, inked, children }: { area: Area; inked: boolean; children: React.ReactNode }) {
  const [x, y, w, h] = AREA[area];
  return (
    <g className="bp-wf-part" data-inked={inked || undefined}>
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="6" className="bp-wf-ghost" />
      <g className="bp-wf-ink">{children}</g>
    </g>
  );
}

export const Wireframe = memo(function Wireframe({ inked = () => true }: { inked?: (a: Area) => boolean }) {
  return (
    <g className="bp-wf">
      <rect x="0" y="0" width="300" height="560" rx="34" className="bp-wf-body" />
      <rect x="120" y="10" width="60" height="14" rx="7" className="bp-wf-fill" />

      <Part area="login" inked={inked("login")}>
        <rect x="22" y="44" width="122" height="10" rx="2" className="bp-wf-fill" />
        <rect x="22" y="61" width="88" height="6" rx="2" className="bp-wf-soft" />
        <circle cx="262" cy="54" r="15" className="bp-wf-line" />
        <text x="262" y="58" textAnchor="middle" className="bp-wf-text">
          AK
        </text>
      </Part>

      <rect x="14" y="88" width="272" height="226" rx="14" className="bp-wf-line" />
      <Part area="next" inked={inked("next")}>
        <rect x="28" y="102" width="76" height="9" rx="2" className="bp-wf-acc" />
        <rect x="236" y="101" width="36" height="11" rx="5.5" className="bp-wf-line" />
        <rect x="28" y="119" width="160" height="12" rx="2" className="bp-wf-fill" />
        <rect x="28" y="137" width="118" height="7" rx="2" className="bp-wf-soft" />
      </Part>
      <Part area="plan" inked={inked("plan")}>
        <rect x="26" y="158" width="248" height="124" rx="9" className="bp-wf-line" />
        <path d="M44 170h64v26h-64zM124 170h40v34h-40zM184 172h28v20h-28zM226 170h32v60h-32zM44 222h38v32h-38zM102 228h34v22h-34zM152 226h50v30h-50z" className="bp-wf-soft-line" />
        <path d="M78 238H92V214H144V204" className="bp-wf-route" />
        <circle cx="78" cy="238" r="4" className="bp-wf-accfill" />
        <circle cx="144" cy="204" r="4.5" className="bp-wf-line" />
      </Part>
      <rect x="28" y="294" width="168" height="7" rx="2" className="bp-wf-soft" />

      <Part area="margin" inked={inked("margin")}>
        <rect x="14" y="354" width="272" height="40" rx="11" className="bp-wf-line" />
        <path d="M34 382l8-14 8 14z" className="bp-wf-line" />
        <rect x="60" y="370" width="150" height="8" rx="2" className="bp-wf-fill" />
        <text x="252" y="380" textAnchor="middle" className="bp-wf-text bp-wf-acc-text">
          2
        </text>
      </Part>

      <Part area="list" inked={inked("list")}>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="14" y={408 + i * 36} width="272" height="30" rx="8" className="bp-wf-line" />
            <rect x="26" y={420 + i * 36} width="34" height="7" rx="2" className="bp-wf-fill" />
            <rect x="72" y={420 + i * 36} width={110 - i * 14} height="7" rx="2" className="bp-wf-soft" />
          </g>
        ))}
      </Part>

      <path d="M0 516H300" className="bp-wf-line" />
      {[0, 1, 2, 4].map((i) => (
        <rect key={i} x={20 + i * 60 - 9} y="528" width="18" height="14" rx="4" className="bp-wf-soft-line" />
      ))}
      <Part area="tabs" inked={inked("tabs")}>
        <rect x="199" y="526" width="22" height="18" rx="3" className="bp-wf-line" />
        <circle cx="206" cy="533" r="3" className="bp-wf-fill" />
        <path d="M212 531h6M212 536h5" className="bp-wf-line" />
      </Part>
    </g>
  );
});
