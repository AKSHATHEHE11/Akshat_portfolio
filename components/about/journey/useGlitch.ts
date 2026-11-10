"use client";
import { useEffect, type RefObject } from "react";

/**
 * Chaos for the scanner: every so often the scan line tears (CSS keyed to data-glitch) and its
 * readout spits random digits for a beat, then settles back unless the scanner wrote a new value.
 */
export function useGlitch(line: RefObject<HTMLElement | null>, label: RefObject<HTMLElement | null>, on: boolean) {
  useEffect(() => {
    const el = line.current;
    if (!on || !el) return;
    let settle = 0;
    const id = window.setInterval(() => {
      if (Math.random() < 0.3) return;
      const text = label.current?.firstChild;
      const keep = text instanceof Text ? text.data : "";
      const noise = keep.replace(/\d/g, () => String((Math.random() * 10) | 0));
      if (text instanceof Text) text.data = noise;
      el.dataset.glitch = "";
      settle = window.setTimeout(() => {
        delete el.dataset.glitch;
        if (text instanceof Text && text.data === noise) text.data = keep;
      }, 260);
    }, 1100);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(settle);
      delete el.dataset.glitch;
    };
  }, [line, label, on]);
}
