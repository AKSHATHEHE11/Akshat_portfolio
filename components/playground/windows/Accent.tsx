"use client";
import { useState } from "react";
import { play } from "@/lib/sound";
import { ACCENT_RANGE, ACCENTS } from "../copy";
import type { Chrome } from "./TypeTester";
import { Win } from "./Win";

const HOUSE = ACCENTS[1].hue;
/** The house lime is oklch(0.939 0.224 120.3); its relatives keep the lightness and chroma. */
export const accentAt = (hue: number) => `oklch(0.939 0.224 ${hue})`;

/**
 * Retints this page's accent. The dial only reaches the lime family (sulphur → mint) so accent-ink
 * text keeps its contrast; the page goes back to the house colour on reset or when you leave.
 */
export function Accent({ chrome, onHue }: { chrome: Chrome; onHue: (hue: number | null) => void }) {
  const [hue, setHue] = useState(HOUSE);
  const set = (h: number) => {
    setHue(h);
    onHue(h === HOUSE ? null : h);
  };
  const name = ACCENTS.reduce((a, b) => (Math.abs(b.hue - hue) < Math.abs(a.hue - hue) ? b : a)).name;
  return (
    <Win id="accent" title="accent.picker" meta={name} {...chrome}>
      <div className="pg-accent">
        <div className="pg-swatch" style={{ background: accentAt(hue) }}>
          <span className="pg-swatch-aa">Aa</span>
          <code className="pg-swatch-code">{`oklch(.94 .22 ${Math.round(hue)})`}</code>
        </div>
        <input
          type="range"
          className="pg-range pg-hue"
          min={ACCENT_RANGE[0]}
          max={ACCENT_RANGE[1]}
          step={1}
          value={Math.round(hue)}
          aria-label="Accent hue"
          aria-valuetext={`${name}, hue ${Math.round(hue)}`}
          onChange={(e) => set(Number(e.target.value))}
          style={{ background: `linear-gradient(90deg, ${accentAt(ACCENT_RANGE[0])}, ${accentAt(HOUSE)}, ${accentAt(ACCENT_RANGE[1])})` }}
        />
        <div className="pg-stops" role="group" aria-label="Named accents">
          {ACCENTS.map((a) => (
            <button
              key={a.name}
              type="button"
              aria-pressed={Math.round(hue) === Math.round(a.hue)}
              onClick={() => {
                set(a.hue);
                play("click");
              }}
            >
              <i style={{ background: accentAt(a.hue) }} />
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </Win>
  );
}
