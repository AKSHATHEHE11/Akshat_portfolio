"use client";
// Decisions as a swatch book: every call came down to two fabrics, A and B, cut with pinking shears.
// Flip a swatch to read what that option meant; once you've picked, the one I chose gets its tag
// and the reason. Chaos: the swatches drift.
import { useState } from "react";
import { motion } from "motion/react";
import { BEZIER, DUR } from "@/lib/motion";
import { play } from "@/lib/sound";
import type { Decision } from "@/lib/types";
import { cn, pad } from "@/lib/utils";
import { specFor, useFabric } from "./fabric";
import { pinked } from "./kit";
import type { Colourway, FashionScene } from "./scene";

const EDGE = pinked(0.8, 9, 3.2);
const LETTER = ["A", "B", "C", "D"];

export function Decisions({ decisions, swatches }: { decisions: Decision[]; swatches: FashionScene["swatchbook"] }) {
  return (
    <section id="decisions" aria-labelledby="fy-decisions" className="relative px-(--margin) py-24 lg:py-36">
      <div className="mx-auto max-w-(--frame-max)">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 id="fy-decisions" data-chaos-type className="font-serif text-[clamp(3rem,1.6rem+5vw,7.5rem)] italic leading-[0.82] tracking-[-0.025em]">
            Swatch book
          </h2>
          <p className="max-w-[30ch] pb-2 font-serif text-[1.35rem] italic leading-tight">Every call came down to two fabrics. Flip one over.</p>
        </div>
        <ol className="mt-14 space-y-16 lg:mt-20 lg:space-y-24">
          {decisions.map((d, i) => (
            <Pair key={d.question} d={d} index={i} fabrics={swatches.length ? swatches[i % swatches.length] : undefined} />
          ))}
        </ol>
      </div>
    </section>
  );
}

const FALLBACK = { a: { name: "Light", hex: "#8aa2c4" }, b: { name: "Raw", hex: "#1b2540" } };

function Pair({ d, index, fabrics = FALLBACK }: { d: Decision; index: number; fabrics?: { a: Colourway; b: Colourway } }) {
  const [flipped, setFlipped] = useState<boolean[]>(() => d.options.map(() => false));
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = d.options[d.chosen];

  const flip = (k: number) => {
    play(flipped[k] ? "toggle-off" : "toggle-on");
    setFlipped((f) => f.map((v, j) => (j === k ? !v : v)));
    setPicked((p) => p ?? k);
  };

  return (
    <li className="grid gap-8 border-t border-(--fy-fg)/20 pt-6 lg:grid-cols-12 lg:gap-(--gutter)">
      <div className="lg:col-span-4">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--fy-muted)">Pair {pad(index + 1)}</span>
        <h3 className="mt-3 max-w-[18ch] font-serif text-[clamp(1.9rem,1.3rem+1.5vw,3rem)] italic leading-[0.98]">{d.question}</h3>
      </div>

      <div className="flex gap-4 sm:gap-6 lg:col-span-5">
        {d.options.map((o, k) => (
          <Swatch
            key={o.label}
            letter={LETTER[k] ?? String(k + 1)}
            label={o.label}
            note={o.note}
            fabric={k % 2 ? fabrics.b : fabrics.a}
            flipped={flipped[k]}
            chosen={picked !== null && d.chosen === k}
            dim={picked !== null && d.chosen !== k}
            onFlip={() => flip(k)}
          />
        ))}
      </div>

      <div className="lg:col-span-3" aria-live="polite">
        {picked === null ? (
          <p className="font-serif text-[1.35rem] italic leading-tight text-(--fy-muted)">Pick one. The back of each swatch says what it would have meant.</p>
        ) : (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.reveal, ease: BEZIER.out }}>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em]">{picked === d.chosen ? "Same call I made" : "I went the other way"}</p>
            <p className="mt-2 font-serif text-[clamp(1.7rem,1.3rem+1vw,2.3rem)] italic leading-[1]">
              {LETTER[d.chosen]} — {chosen?.label}.
            </p>
            <p className="mt-3 max-w-[34ch] text-[0.9375rem] leading-relaxed">{d.why}</p>
          </motion.div>
        )}
      </div>
    </li>
  );
}

function Swatch({
  letter,
  label,
  note,
  fabric,
  flipped,
  chosen,
  dim,
  onFlip,
}: {
  letter: string;
  label: string;
  note: string;
  fabric: Colourway;
  flipped: boolean;
  chosen: boolean;
  dim: boolean;
  onFlip: () => void;
}) {
  const url = useFabric(specFor(fabric, "twill-3x1"));
  return (
    <button
      type="button"
      onClick={onFlip}
      onPointerEnter={() => play("tick")}
      aria-pressed={flipped}
      aria-label={`Option ${letter}: ${label}. ${flipped ? note : "Flip to read it."}${chosen ? " The one I chose." : ""}`}
      data-cursor="hover"
      data-cursor-label="FLIP"
      data-chaos-drift
      className={cn("fy-flip", "group relative block w-1/2 max-w-[15rem] text-left transition-opacity duration-500", dim && "opacity-55 hover:opacity-90")}
    >
      <span className={cn("fy-flip-card", "block aspect-[4/5] w-full")} data-flipped={flipped}>
        <span
          className={cn("fy-face", "block overflow-hidden shadow-[0_18px_30px_-20px_rgb(0_0_0/0.6)]")}
          style={{ clipPath: EDGE, backgroundColor: fabric.hex, backgroundImage: url ? `url(${url})` : undefined, backgroundSize: "96px" }}
        >
          <span aria-hidden className="absolute inset-[7%] border border-dashed border-[#c4823b]/80" />
          <span className="absolute left-[11%] right-[22%] top-[11%] block bg-[#f4f1ea] p-3 text-[#14161c] shadow-[0_4px_10px_-4px_rgb(0_0_0/0.5)] transition-transform duration-500 ease-out-expo group-hover:-rotate-2">
            <span className="block font-serif text-[2.6rem] italic leading-[0.8]">{letter}</span>
            <span className="mt-2 block text-[0.875rem] font-semibold leading-tight">{label}</span>
            <span className="mt-1 block font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[#66635b]">{fabric.name}</span>
          </span>
        </span>
        <span className={cn("fy-face", "fy-back", "fy-note", "flex flex-col justify-between p-[12%] text-[#14161c]")} style={{ clipPath: EDGE }}>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
            {letter} — {label}
          </span>
          <span className="font-serif text-[clamp(1.2rem,0.9rem+0.9vw,1.6rem)] italic leading-[1.05]">{note}</span>
        </span>
      </span>
      {chosen ? (
        <motion.span
          initial={{ scale: 0, rotate: -24 }}
          animate={{ scale: 1, rotate: -7 }}
          transition={{ type: "spring", stiffness: 420, damping: 16 }}
          className={cn("fy-woven-text", "absolute -right-2 -top-3 z-[2] rounded-[2px] bg-(--fy-accent) px-2.5 py-1.5 text-[0.6875rem] text-(--fy-fg) shadow-[0_6px_12px_-6px_rgb(0_0_0/0.6)]")}
        >
          Chosen
        </motion.span>
      ) : null}
    </button>
  );
}
