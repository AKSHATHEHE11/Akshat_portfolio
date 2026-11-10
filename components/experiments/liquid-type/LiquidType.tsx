"use client";
// EXP-01 · Liquid Type. Archivo's weight and width axes (and a skew standing in for slant — Archivo
// has no slnt axis) ride under-damped springs: weight follows the cursor's position, width and lean
// follow its velocity, and every letter wobbles back when you stop. Typing drops new letters in.
//
// Performance (BRIEF §5b rule 1): axis values are quantised (wght ÷25, wdth ÷3) and written only when
// they change, so the browser builds a few hundred font instances once instead of one per frame.
// Letter centres are measured on text change / resize, never in the loop.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/pointer";
import { clamp } from "@/lib/utils";
import { useLocalPointer, type PieceProps } from "../shared";

const MAX = 14;
const REST = '"wght" 300, "wdth" 100';

interface Spring {
  x: number;
  v: number;
}
interface Letter {
  g: Spring; // wght
  w: Spring; // wdth
  k: Spring; // skew (deg)
  y: Spring; // bob (px)
  cx: number; // rest centre, stage px
  fv: string;
  tf: string;
}

const letter = (splash: boolean): Letter => ({
  g: { x: splash ? 900 : 300, v: 0 },
  w: { x: splash ? 125 : 100, v: 0 },
  k: { x: 0, v: splash ? -90 : 0 },
  y: { x: splash ? -40 : 0, v: 0 },
  cx: 0,
  fv: "",
  tf: "",
});

export default function LiquidType({ active, chaos, reduced, coarse, title }: PieceProps) {
  const stage = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const guides = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const readout = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(() => title.split(" ")[0]);
  const local = useLocalPointer(stage);
  const sim = useRef({ letters: [] as Letter[], size: 100, chars: [] as string[] });
  const chars = Array.from(text);

  // Fit the word to the stage and measure each letter's rest centre (text change, resize, fonts).
  useLayoutEffect(() => {
    const st = stage.current;
    const w = word.current;
    if (!st || !w) return;
    const fit = () => {
      const els = spans.current.slice(0, Array.from(text).length);
      for (const e of els) {
        if (!e) continue;
        e.style.fontVariationSettings = REST;
        e.style.transform = "";
      }
      w.style.fontSize = "100px";
      const natural = Math.max(1, w.scrollWidth);
      const size = Math.max(28, Math.min(st.clientHeight * 0.5, ((st.clientWidth * 0.72) / natural) * 100));
      w.style.fontSize = `${size}px`;
      const prev = sim.current.letters;
      sim.current.size = size;
      sim.current.chars = Array.from(text);
      sim.current.letters = els.map((e, i) => {
        const L = prev[i] ?? letter(!reduced && prev.length > 0);
        L.cx = e ? w.offsetLeft + e.offsetLeft + e.offsetWidth / 2 : 0;
        L.fv = "";
        L.tf = "";
        return L;
      });
      // type-specimen guides: baseline, x-height and cap height of Archivo at this size
      const g = guides.current;
      if (g) g.style.transform = `translateY(${Math.round(w.offsetTop + size * 0.834)}px)`;
      if (g) g.style.setProperty("--s", `${size}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(st);
    void document.fonts.ready.then(fit);
    return () => ro.disconnect();
  }, [text, reduced]);

  // The loop: springs → quantised axes, only while switched on.
  useEffect(() => {
    if (!active) return;
    const S = sim.current;
    const K = chaos ? 280 : 170;
    const D = chaos ? 5 : 10.5;
    let shown = "";
    const tick = (time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      const t = time * 1000;
      const p = local();
      const speed = p.inside ? clamp(pointer.speed / 36, 0, 1) : 0;
      const vx = p.inside ? clamp(pointer.vx, -70, 70) : 0;
      const vy = p.inside ? clamp(pointer.vy, -70, 70) : 0;
      const sigma = S.size * 0.95;
      const damp = Math.exp(-D * dt);
      const step = (s: Spring, target: number) => {
        if (reduced) {
          s.x = target;
          s.v = 0;
          return;
        }
        s.v = (s.v + (target - s.x) * K * dt) * damp;
        s.x += s.v * dt;
      };
      // chaos: letters get shoved at random
      if (chaos && !reduced && S.letters.length && Math.random() < dt * 3) {
        const L = S.letters[Math.floor(Math.random() * S.letters.length)];
        L.k.v += (Math.random() - 0.5) * 900;
        L.w.v += (Math.random() - 0.5) * 900;
        L.y.v -= 300;
      }
      let best = -1;
      let bestNear = -1;
      S.letters.forEach((L, i) => {
        const el = spans.current[i];
        if (!el) return;
        const dx = (L.cx - p.x) / sigma;
        const near = p.inside ? Math.exp(-dx * dx) : 0;
        const idle = reduced ? 0 : 0.5 + 0.5 * Math.sin(t * 0.0012 - i * 0.62);
        step(L.g, clamp(260 + idle * 150 * (1 - near) + near * (360 + 280 * speed) + (chaos ? 140 : 0), 100, 900));
        step(L.w, reduced ? 100 : clamp(100 + speed * (near * 25 - (1 - near) * 32), 62, 125));
        step(L.k, reduced ? 0 : clamp(vx * 0.5, -20, 20) * (0.35 + 0.65 * near));
        step(L.y, reduced ? 0 : clamp(vy * 0.7, -30, 30) * near);
        const g = Math.round(clamp(L.g.x, 100, 900) / 25) * 25;
        const w = clamp(Math.round(L.w.x / 3) * 3, 62, 125);
        const fv = `"wght" ${g}, "wdth" ${w}`;
        if (fv !== L.fv) {
          L.fv = fv;
          el.style.fontVariationSettings = fv;
        }
        const tf = `translate3d(0,${L.y.x.toFixed(1)}px,0) skewX(${L.k.x.toFixed(1)}deg)`;
        if (tf !== L.tf) {
          L.tf = tf;
          el.style.transform = tf;
        }
        if (near > bestNear) {
          bestNear = near;
          best = i;
        }
      });
      // readout: the letter under the cursor (or the first), text node only when it changes (rule 5)
      const L = S.letters[best];
      const node = readout.current?.firstChild;
      if (L && node) {
        const s = `${S.chars[best] ?? ""}  wght ${Math.round(L.g.x)} · wdth ${Math.round(clamp(L.w.x, 62, 125))} · slant ${Math.round(L.k.x)}°`;
        if (s !== shown) {
          shown = s;
          (node as Text).data = s;
        }
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active, chaos, reduced, local]);

  const edit = (v: string) => setText(Array.from(v.replace(/\s+/g, " ")).slice(0, MAX).join(""));

  return (
    <div
      ref={stage}
      className="xp-liquid"
      data-cursor={coarse ? undefined : "text"}
      onClick={(e) => {
        // phones: a tap on the letters is play, not a request for the on-screen keyboard (the tape still opens it)
        if (!coarse && e.target !== input.current) input.current?.focus({ preventScroll: true });
      }}
    >
      <div ref={guides} aria-hidden className="xp-liquid-guides">
        <span style={{ top: 0 }}>Baseline</span>
        <span style={{ top: "calc(var(--s) * -0.52)" }}>x-height</span>
        <span style={{ top: "calc(var(--s) * -0.7)" }}>Cap height</span>
      </div>

      <div ref={word} aria-hidden className="xp-liquid-word">
        {chars.map((c, i) => (
          <span
            key={i}
            ref={(el) => {
              spans.current[i] = el;
            }}
            className="xp-liquid-ch"
          >
            {c === " " ? " " : c}
          </span>
        ))}
        <span className="xp-liquid-caret" />
      </div>

      <p aria-hidden className="xp-liquid-readout label">
        <span ref={readout}>{" "}</span>
      </p>

      <label className="xp-liquid-tape">
        <span className="label">Type ›</span>
        <input
          ref={input}
          value={text}
          onChange={(e) => edit(e.target.value)}
          maxLength={MAX}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          enterKeyHint="done"
          aria-label="Specimen text. Type to change the word."
          placeholder="type a word"
        />
      </label>
    </div>
  );
}
