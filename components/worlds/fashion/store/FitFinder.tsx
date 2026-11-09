"use client";
// Fit comparison: measure a pair you already love → the closest Fybr8 fit and size, drawn over yours
// as a tech flat with measurement callouts, plus what will feel different and why.
import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { play } from "@/lib/sound";
import { clamp, lerp } from "@/lib/utils";
import { inches } from "../kit";
import { useStore } from "./context";
import { matchFits, type Measure } from "./fit";

type Key = keyof Measure;
const FIELDS: { key: Key; label: string; min: number; max: number; step: number }[] = [
  { key: "waist", label: "Waist", min: 26, max: 44, step: 0.5 },
  { key: "inseam", label: "Inseam", min: 26, max: 36, step: 0.5 },
  { key: "thigh", label: "Thigh", min: 9, max: 16, step: 0.25 },
];

const U = 5.5; // drawing units per inch
const CX = 120;

/** Front flat of a pair of trousers from real measurements. */
function trouser({ waist, thigh, inseam }: Measure, leg: number) {
  const top = 14;
  const band = 12;
  const crotch = top + band + 64;
  const hemY = crotch + inseam * U;
  const wf = (waist / 2) * U;
  const lw = thigh * U * 0.78;
  const hip = Math.max(wf / 2 + 6, lw);
  const hem = lw * lerp(0.5, 1.15, leg);
  const c = CX - lw / 2 - lerp(2, 10, leg);
  const m = (x: number) => 2 * CX - x;
  const f = (n: number) => n.toFixed(1);
  return {
    d: `M${f(CX - wf / 2)} ${top}H${f(CX + wf / 2)}L${f(CX + wf / 2 + 1)} ${top + band}Q${f(CX + hip)} ${top + band + 14} ${f(CX + hip)} ${crotch - 10}L${f(m(c - hem / 2))} ${f(hemY)}H${f(m(c + hem / 2))}L${CX + 2} ${crotch}Q${CX} ${crotch - 6} ${CX - 2} ${crotch}L${f(c + hem / 2)} ${f(hemY)}H${f(c - hem / 2)}L${f(CX - hip)} ${crotch - 10}Q${f(CX - hip)} ${top + band + 14} ${f(CX - wf / 2 - 1)} ${top + band}Z`,
    crotch,
    hemY,
    wf,
    lw,
    hip,
  };
}

function say(kind: Key, d: number) {
  const a = Math.abs(d);
  if (a < 0.25) return kind === "inseam" ? "Same length as yours" : `${kind === "waist" ? "Waist" : "Thigh"} matches yours`;
  if (kind === "inseam") return d > 0 ? `${inches(a)} in longer — cuff it or hem it` : `${inches(a)} in shorter — sits above the ankle`;
  const name = kind === "waist" ? "Waist" : "Thigh";
  return d > 0 ? `${name} ${inches(a)} in roomier` : `${name} ${inches(a)} in ${kind === "waist" ? "snugger" : "slimmer"}`;
}

export function FitFinder() {
  const { scene, product, openQuick, colourOf } = useStore();
  const [m, setM] = useState<Measure>({ waist: 33, inseam: 32, thigh: 12.5 });
  const ranked = useMemo(() => matchFits(scene.fits, m), [scene.fits, m]);
  const best = ranked[0];
  const next = ranked[1];

  const set = (key: Key, v: number, field = FIELDS.find((f) => f.key === key)!) => {
    play("tick");
    setM((prev) => ({ ...prev, [key]: clamp(Math.round(v / field.step) * field.step, field.min, field.max) }));
  };

  if (!best) return null;
  const mine = trouser(m, 0.5);
  const ours = trouser({ waist: best.size.waist, thigh: best.size.thigh, inseam: best.fit.inseam }, best.fit.leg);
  const bestProduct = product(best.fit.productId);
  const inStock = (bestProduct?.sizes.find((s) => s.label === best.size.label)?.stock ?? 0) > 0;
  const guide = scene.fitGuide;

  return (
    <div className="grid gap-x-10 gap-y-10 p-5 lg:grid-cols-12 lg:p-8">
      {/* measurements */}
      <div className="lg:col-span-4">
        <p className="max-w-[30ch] font-serif text-[1.6rem] italic leading-[1.05]">Measure a pair you already love. Flat on a table, in inches.</p>
        <div className="mt-8 space-y-7">
          {FIELDS.map((f) => {
            const v = m[f.key];
            return (
              <div key={f.key}>
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={`fy-fit-${f.key}`} className="text-[0.9375rem] font-semibold">
                    {f.label}
                  </label>
                  <output htmlFor={`fy-fit-${f.key}`} className="font-serif text-[2.1rem] italic leading-none tabular-nums">
                    {inches(v)}
                    <span className="ml-1 font-sans text-[0.875rem] not-italic">in</span>
                  </output>
                </div>
                <p className="mt-1 text-[0.8125rem] leading-snug text-(--fy-muted)">{guide[f.key]}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set(f.key, v - f.step)}
                    aria-label={`${f.label}: smaller`}
                    data-cursor="hover"
                    className="grid size-9 shrink-0 place-items-center rounded-[6px] border border-(--fy-fg)/25 bg-(--fy-paper) shadow-key active:translate-y-px active:shadow-key-down coarse:size-11"
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <input
                    id={`fy-fit-${f.key}`}
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={v}
                    aria-valuetext={`${inches(v)} inches`}
                    onChange={(e) => set(f.key, parseFloat(e.target.value))}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="fy-range"
                    data-cursor="drag"
                  />
                  <button
                    type="button"
                    onClick={() => set(f.key, v + f.step)}
                    aria-label={`${f.label}: bigger`}
                    data-cursor="hover"
                    className="grid size-9 shrink-0 place-items-center rounded-[6px] border border-(--fy-fg)/25 bg-(--fy-paper) shadow-key active:translate-y-px active:shadow-key-down coarse:size-11"
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* the two flats, one over the other */}
      <figure className="relative lg:col-span-4">
        <svg viewBox="0 -8 240 308" className="mx-auto h-[min(64vh,30rem)] w-full max-w-sm" role="img" aria-label={`Your pair drawn over ${best.fit.name} in ${best.size.label}`}>
          <defs>
            <pattern id="fy-fit-twill" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(27)">
              <rect width="1.1" height="3.4" fill="#14161c" opacity="0.14" />
            </pattern>
          </defs>
          <path d={ours.d} fill="var(--fy-accent)" stroke="var(--fy-fg)" strokeWidth={1.2} style={{ transition: "d .5s cubic-bezier(.16,1,.3,1)" }} />
          <path d={ours.d} fill="url(#fy-fit-twill)" style={{ transition: "d .5s cubic-bezier(.16,1,.3,1)" }} />
          <path d={mine.d} fill="none" stroke="var(--fy-fg)" strokeWidth={1.4} strokeDasharray="4 3" style={{ transition: "d .5s cubic-bezier(.16,1,.3,1)" }} />
          {/* callouts */}
          <g fontFamily="var(--font-mono)" fontSize="7.5" fill="var(--fy-fg)">
            <line x1={CX - mine.wf / 2} x2={CX + mine.wf / 2} y1={7} y2={7} stroke="var(--fy-fg)" strokeWidth={0.8} />
            <text x={CX} y={3} textAnchor="middle">
              W {inches(m.waist)}″
            </text>
            <line x1={232} x2={232} y1={mine.crotch} y2={mine.hemY} stroke="var(--fy-fg)" strokeWidth={0.8} />
            <text x={229} y={(mine.crotch + mine.hemY) / 2} textAnchor="middle" transform={`rotate(-90 229 ${(mine.crotch + mine.hemY) / 2})`}>
              L {inches(m.inseam)}″
            </text>
            <line x1={CX - mine.lw - 2} x2={CX - 4} y1={mine.crotch + 8} y2={mine.crotch + 8} stroke="var(--fy-fg)" strokeWidth={0.8} strokeDasharray="2 2" />
            <text x={CX - mine.lw / 2 - 3} y={mine.crotch + 18} textAnchor="middle">
              T {inches(m.thigh)}″
            </text>
          </g>
        </svg>
        <figcaption className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.12em]">
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-0 w-6 border-t-[1.5px] border-dashed border-(--fy-fg)" /> Yours
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block size-3 border border-(--fy-fg) bg-(--fy-accent)" /> {best.fit.name} / {best.size.label}
          </span>
        </figcaption>
      </figure>

      {/* the answer — only the verdict is live, so a slider drag isn't read out as a whole column */}
      <div className="lg:col-span-4">
        <div aria-live="polite" aria-atomic="true">
          <p className="font-serif text-[clamp(2.6rem,1.8rem+2vw,3.6rem)] italic leading-[0.9]">{best.fit.name}</p>
          <p className="mt-2 text-[1.0625rem] font-medium">
            in {best.size.label} — {best.score}% match
          </p>
        </div>
        <div className="relative mt-3 h-3 overflow-hidden rounded-[2px] border border-(--fy-fg)/30" aria-hidden>
          <span className="absolute inset-y-0 left-0 bg-(--fy-fg) transition-[width] duration-500 ease-out-expo" style={{ width: `${best.score}%` }} />
        </div>
        <ul className="mt-5 space-y-1.5 text-[0.9375rem]">
          {(["waist", "thigh", "inseam"] as Key[]).map((k) => (
            <li key={k} className="flex gap-2">
              <span aria-hidden className="mt-[0.55em] inline-block size-1.5 shrink-0 rounded-full bg-(--fy-fg)" />
              {say(k, best.d[k])}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[34ch] text-[0.9375rem] leading-snug text-(--fy-muted)">{best.fit.note}</p>
        {!inStock ? <p className="mt-2 text-[0.875rem] font-medium">{best.size.label} is sold out right now — pick the next size in the quick view.</p> : null}
        <div className="mt-6 flex flex-col items-start gap-3">
          <Button
            variant="ink"
            onClick={() => openQuick(best.fit.productId, { size: inStock ? best.size.label : null, colour: colourOf(best.fit.productId) })}
          >
            Shop {best.fit.name} in {best.size.label}
          </Button>
          {next ? (
            <button
              type="button"
              onClick={() => openQuick(next.fit.productId, { size: next.size.label })}
              data-cursor="hover"
              className="text-left text-[0.875rem] underline decoration-1 underline-offset-4 hover:decoration-2 coarse:min-h-11"
            >
              Also close: {next.fit.name} in {next.size.label} — {next.score}%
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
