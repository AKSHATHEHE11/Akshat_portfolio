"use client";
import { useEffect, useRef, useState } from "react";
import { play } from "@/lib/sound";
import { ACCENT_RANGE, ACCENTS } from "../copy";
import type { Chrome } from "./TypeTester";
import { Win } from "./Win";

const HOUSE = ACCENTS[1].hue;
/** The house lime is oklch(0.939 0.224 120.3); its relatives keep the lightness and chroma. */
export const accentAt = (hue: number) => `oklch(0.939 0.224 ${hue})`;

/** Retint the page: --accent on <html>, or back to the stylesheet's house lime. */
function tint(hue: number) {
  const st = document.documentElement.style;
  if (Math.round(hue) === Math.round(HOUSE)) st.removeProperty("--accent");
  else st.setProperty("--accent", accentAt(hue));
}

/**
 * Retints this page's accent (nav included: it is set on <html>). The dial only reaches the lime
 * family (sulphur → mint) so accent-ink text keeps its contrast. While the thumb is dragged only this
 * window previews the colour; the page takes it when the slider commits (release, or each arrow key) —
 * a variable on <html> restyles the whole document, far too much to do on every input event. Removed
 * when the window unmounts: leaving the page, or a bench reset (which remounts the windows).
 */
export function Accent({ chrome }: { chrome: Chrome }) {
  const [hue, setHue] = useState(HOUSE);
  const range = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = range.current;
    // React's onChange is the native "input" event; "change" is the commit
    const commit = () => tint(Number(el?.value));
    el?.addEventListener("change", commit);
    return () => {
      el?.removeEventListener("change", commit);
      document.documentElement.style.removeProperty("--accent");
    };
  }, []);

  const name = ACCENTS.reduce((a, b) => (Math.abs(b.hue - hue) < Math.abs(a.hue - hue) ? b : a)).name;
  return (
    <Win id="accent" title="accent.picker" meta={name} {...chrome}>
      <div className="pg-accent">
        <div className="pg-swatch" style={{ background: accentAt(hue) }}>
          <span className="pg-swatch-aa">Aa</span>
          <code className="pg-swatch-code">{`oklch(.94 .22 ${Math.round(hue)})`}</code>
        </div>
        <input
          ref={range}
          type="range"
          className="pg-range pg-hue"
          min={ACCENT_RANGE[0]}
          max={ACCENT_RANGE[1]}
          step={1}
          value={Math.round(hue)}
          aria-label="Accent hue"
          aria-valuetext={`${name}, hue ${Math.round(hue)}`}
          onChange={(e) => setHue(Number(e.target.value))}
          style={{ background: `linear-gradient(90deg, ${accentAt(ACCENT_RANGE[0])}, ${accentAt(HOUSE)}, ${accentAt(ACCENT_RANGE[1])})` }}
        />
        <div className="pg-stops" role="group" aria-label="Named accents">
          {ACCENTS.map((a) => (
            <button
              key={a.name}
              type="button"
              aria-pressed={Math.round(hue) === Math.round(a.hue)}
              onClick={() => {
                setHue(a.hue);
                tint(a.hue);
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
