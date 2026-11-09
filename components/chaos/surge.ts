// The ~450ms "power surge" when chaos engages: the page inverts for a few frames, horizontal slices
// tear sideways and snap back, a lime wash bleeds off, and the whole screen (nav included) RGB-splits
// and shakes 2–4px through an SVG filter on <html>. A filter on the root element does not become a
// containing block for fixed elements (unlike a transform), so pinned sections and chrome stay put.
//
// Photosensitivity (WCAG 2.3.1): the inversion and the two tears are the only luminance flips — three
// flashes, the most allowed in one second. Torn bands appear once per tear and only slide while they
// are up; they never re-roll or blink frame to frame.
import { gsap } from "@/lib/gsap";
import { play } from "@/lib/sound";

const NS = "http://www.w3.org/2000/svg";
const SLICES = 8;
/** surge progress where the inversion ends, tear 1 → tear 2 hands over, and the tearing stops */
const TEARS = [0.1, 0.45, 0.8] as const;

function sheet(css: string) {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:fixed;left:0;top:0;width:100%;height:100%;z-index:45;pointer-events:none;opacity:0;${css}`;
  return el;
}

export function createSurge() {
  const root = document.documentElement;
  const snap = gsap.parseEase("snap");
  const flash = sheet("background:#fff;mix-blend-mode:difference");
  const tint = sheet("background:#d8ff00");
  // every 4th slice is a thin orange scanline; the rest are inverting bands
  const slices = Array.from({ length: SLICES }, (_, i) =>
    sheet(i % 4 === 3 ? "height:2px;background:#ff5a1f" : "height:24px;background:#fff;mix-blend-mode:difference"),
  );
  /** per slice for the current tear: shown, row (px), sideways offset (vw) */
  const lay = slices.map(() => ({ on: false, y: 0, x: 0 }));
  let tear = -1;

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none";
  // shake (whole image) → split into R and GB → offset them apart → recombine
  svg.innerHTML = `<filter id="cx-surge" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feOffset in="SourceGraphic" dx="0" dy="0" result="s"/>
<feColorMatrix in="s" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
<feOffset in="r" dx="0" dy="0" result="ro"/>
<feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb"/>
<feOffset in="gb" dx="0" dy="0" result="gbo"/>
<feBlend in="ro" in2="gbo" mode="screen"/>
</filter>`;
  const [shake, red, cyan] = Array.from(svg.querySelectorAll("feOffset"));

  /** Lay out one tear: which bands show, where, and how far they are torn sideways. */
  function rip(strength: number) {
    const vh = window.innerHeight;
    slices.forEach((s, i) => {
      const l = lay[i];
      l.on = Math.random() > 0.25;
      s.style.opacity = l.on ? "1" : "0";
      if (!l.on) return;
      if (i % 4 !== 3) s.style.height = `${Math.round(6 + Math.random() * Math.random() * vh * 0.14)}px`;
      l.y = Math.round(Math.random() * vh);
      l.x = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 24) * strength;
    });
  }

  function end() {
    root.removeAttribute("data-cx-surge");
    flash.style.opacity = "0";
    tint.style.opacity = "0";
    for (const s of slices) s.style.opacity = "0";
    tear = -1;
    for (const o of [shake, red, cyan]) {
      o.setAttribute("dx", "0");
      o.setAttribute("dy", "0");
    }
  }

  return {
    nodes: [flash, tint, ...slices, svg] as Element[],

    start() {
      play("glitch");
      root.setAttribute("data-cx-surge", "");
      tear = -1;
    },

    /** p: 0..1 through the surge */
    frame(p: number) {
      const k = 1 - p;
      flash.style.opacity = p < TEARS[0] ? "1" : "0";
      tint.style.opacity = p < TEARS[0] ? "0" : (0.32 * k * k).toFixed(3);

      const t = p < TEARS[0] || p >= TEARS[2] ? -1 : p < TEARS[1] ? 0 : 1;
      if (t !== tear) {
        tear = t;
        if (t < 0) for (const s of slices) s.style.opacity = "0";
        else rip(t ? 0.6 : 1); // the second tear is weaker: the surge is dying down
      }
      if (t >= 0) {
        // torn sideways, then snapped back (with the house overshoot) while the band is up
        const from = t ? TEARS[1] : TEARS[0];
        const q = (p - from) / ((t ? TEARS[2] : TEARS[1]) - from);
        const back = 1 - snap(Math.min(1, q * 1.6));
        slices.forEach((s, i) => {
          const l = lay[i];
          if (l.on) s.style.transform = `translate3d(${(l.x * back).toFixed(2)}vw,${l.y}px,0)`;
        });
      }

      shake.setAttribute("dx", String(Math.round((Math.random() * 2 - 1) * 3 * k)));
      shake.setAttribute("dy", String(Math.round((Math.random() * 2 - 1) * 2 * k)));
      const o = (1 + 6 * k).toFixed(1);
      red.setAttribute("dx", `-${o}`);
      cyan.setAttribute("dx", o);
    },

    end,
  };
}
