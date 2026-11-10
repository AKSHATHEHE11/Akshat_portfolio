"use client";
// Decisions as a patch bay: one rack row per call, a cable hanging from OUT and two inputs, A and B.
// Plug the cable into one (click/tap the jack, or arrow keys between them) to hear what that option
// would have meant; the jack I actually patched lights up and tells you why. Chaos: cables won't stay in.
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import type { Decision } from "@/lib/types";
import { pad } from "@/lib/utils";

// rack geometry (SVG units; the HTML jacks sit at the same spots in %)
const W = 400;
const H = 170;
const OUT = { x: 46, y: 56 };
const JACKS = [
  { x: 214, y: 56 },
  { x: 328, y: 56 },
];
const DANGLE = { x: 104, y: 160 };
const CABLES = ["#ff4f9a", "#ff5a1f", "#e9e1cf", "#7d6bff"];
const LETTER = ["A", "B", "C", "D"];

/** A cable with weight: it sags more the further it has to reach. */
function cable(to: { x: number; y: number }) {
  const sag = 26 + Math.abs(to.x - OUT.x) * 0.32;
  return `M${OUT.x} ${OUT.y}C${OUT.x} ${OUT.y + sag} ${to.x} ${to.y + sag * 0.9} ${to.x} ${to.y}`;
}
const pct = (p: { x: number; y: number }) => ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` });

export function PatchBay({ decisions }: { decisions: Decision[] }) {
  return (
    <section aria-labelledby="nf-bay-h" className="frame relative py-24 md:py-36">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2 id="nf-bay-h" data-chaos-type className="nf-h2-serif">
          Patch bay
        </h2>
        <p className="max-w-[32ch] pb-2 text-[1.0625rem] leading-snug text-(--fg)/75">
          Every call had two inputs. Plug the cable into one and hear what it would have done.
        </p>
      </div>
      <ol className="mt-12 grid gap-5 md:mt-16">
        {decisions.map((d, i) => (
          <Row key={d.question} d={d} index={i} />
        ))}
      </ol>
    </section>
  );
}

function Row({ d, index }: { d: Decision; index: number }) {
  const id = `nf-bay-${index}`;
  const chaos = useChaos();
  const reduced = useReducedMotion();
  const [pick, setPick] = useState<number | null>(null);
  const [slipped, setSlipped] = useState(false);
  const path = useRef<SVGPathElement>(null);
  const plug = useRef<SVGGElement>(null);
  const end = useRef({ ...DANGLE });
  const tween = useRef<gsap.core.Animation | null>(null);
  const color = CABLES[index % CABLES.length];

  const draw = () => {
    const e = end.current;
    path.current?.setAttribute("d", cable(e));
    plug.current?.setAttribute("transform", `translate(${e.x.toFixed(1)} ${e.y.toFixed(1)})`);
  };

  /** Swing the loose end to a jack (or let it drop). */
  const move = (to: { x: number; y: number }, drop = false) => {
    tween.current?.kill();
    if (reduced) {
      Object.assign(end.current, to);
      return draw();
    }
    const tl = gsap.timeline({ onUpdate: draw });
    if (drop) {
      // it falls out and bounces on its own weight
      tl.to(end.current, { x: to.x, duration: 0.7, ease: "power2.out" }, 0).to(end.current, { y: to.y, duration: 0.7, ease: "bounce.out" }, 0);
    } else {
      // lift it over the rack, then seat it
      tl.to(end.current, { x: to.x, duration: 0.5, ease: "power3.inOut" }, 0)
        .to(end.current, { y: Math.min(end.current.y, to.y) - 34, duration: 0.26, ease: "power2.out" }, 0)
        .to(end.current, { y: to.y, duration: 0.24, ease: "power3.in" }, 0.26);
    }
    tween.current = tl;
  };

  const choose = (i: number) => {
    setPick(i);
    setSlipped(false);
    play(i === d.chosen ? "toggle-on" : "press");
    move(JACKS[i] ?? DANGLE);
  };

  // chaos: a cable that has been plugged in slips out again a moment later
  useEffect(() => {
    if (!chaos || pick === null) return;
    const t = window.setTimeout(() => {
      setPick(null);
      setSlipped(true);
      play("drop");
      move(DANGLE, true);
    }, 2200);
    return () => window.clearTimeout(t);
    // move() only touches refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaos, pick]);
  useEffect(() => () => void tween.current?.kill(), []);

  const chosen = d.options[d.chosen];
  return (
    <li className="nf-bay-row">
      <div className="nf-bay-q">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fg)/60">Ch {pad(index + 1)}</span>
        <h3 className="mt-2 text-[clamp(1.5rem,1.1rem+1.2vw,2.2rem)] font-[760] leading-[1.02] tracking-[-0.02em] [font-variation-settings:'wdth'_84]">
          {d.question}
        </h3>
      </div>

      <fieldset className="nf-bay" aria-describedby={`${id}-read`}>
        <legend className="sr-only">{d.question} Plug the cable into an option.</legend>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <path id={`${id}-c`} ref={path} d={cable(DANGLE)} />
          </defs>
          <text x={OUT.x} y={OUT.y - 30} className="nf-bay-silk" textAnchor="middle">
            OUT
          </text>
          {[OUT, ...JACKS].map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <circle r="17" className="nf-bay-nut" />
              <circle r="9" className="nf-bay-hole" />
            </g>
          ))}
          {JACKS.map((p, i) => (
            <circle
              key={`led${i}`}
              cx={p.x + 26}
              cy={p.y - 22}
              r="3.2"
              className="nf-bay-led"
              data-on={(pick !== null && i === d.chosen) || undefined}
            />
          ))}
          {/* shadow, cable, highlight — one path, drawn three times */}
          <use href={`#${id}-c`} className="nf-bay-shadow" transform="translate(3 6)" />
          <use href={`#${id}-c`} className="nf-bay-cable" style={{ stroke: color }} />
          <use href={`#${id}-c`} className="nf-bay-gloss" />
          <g transform={`translate(${OUT.x} ${OUT.y})`}>
            <circle r="13" className="nf-bay-plug" style={{ fill: color }} />
            <circle r="5" className="nf-bay-plug-cap" />
          </g>
          <g ref={plug} transform={`translate(${DANGLE.x} ${DANGLE.y})`}>
            <circle r="13" className="nf-bay-plug" style={{ fill: color }} />
            <circle r="5" className="nf-bay-plug-cap" />
          </g>
        </svg>

        {d.options.slice(0, JACKS.length).map((o, i) => (
          <label
            key={o.label}
            className="nf-jack"
            style={pct(JACKS[i])}
            data-cursor="hover"
            data-cursor-label="PLUG"
            onPointerEnter={() => play("tick")}
          >
            <input type="radio" name={id} checked={pick === i} onChange={() => choose(i)} className="sr-only" />
            <span className="sr-only">
              {LETTER[i]}: {o.label}
            </span>
            <span aria-hidden className="nf-jack-cap">
              <b>{LETTER[i]}</b>
              {o.label}
            </span>
          </label>
        ))}
      </fieldset>

      <div id={`${id}-read`} className="nf-bay-read" aria-live="polite">
        {pick === null ? (
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-(--fg)/60">
            {slipped ? "Cable slipped out. Chaos does that." : "No signal. Plug in A or B."}
            <span className="animate-blink" aria-hidden>
              _
            </span>
          </p>
        ) : (
          <>
            <p className="text-[1rem] leading-snug text-(--fg)/90">
              <b className="mr-1.5 font-mono text-[0.75rem] font-medium">{LETTER[pick]} ▸</b>
              {d.options[pick].note}
            </p>
            <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--accent)">
              {pick === d.chosen ? "Same patch as mine" : `I patched ${LETTER[d.chosen]}: ${chosen?.label}`}
            </p>
            <p className="mt-1.5 font-serif text-[1.35rem] italic leading-[1.12]">{d.why}</p>
          </>
        )}
      </div>
    </li>
  );
}
