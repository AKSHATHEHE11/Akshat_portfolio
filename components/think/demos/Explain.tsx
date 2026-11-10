"use client";
import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { clamp, cn } from "@/lib/utils";
import { micro, type DemoProps } from "./shared";

const BASE = { label: "Base rate on this route", value: 40 };
const WHY = [
  { label: "Monsoon on the route", value: 31 },
  { label: "Platform change at Itarsi", value: 22 },
  { label: "Kitchen 4 min from the station", value: -9 },
  { label: "Train on time so far", value: -12 },
];
const ANSWERS = ["Model output.", "Still model output.", "The model is confident."];
const signed = (v: number) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`);

/**
 * EXPLAIN THE MACHINE — a late-delivery risk score. Rule off: a black-box number that answers "why?"
 * with a shrug. Rule on: the same number built from its reasons; take one out and watch it move.
 */
export function ExplainDemo({ on }: DemoProps) {
  const num = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);
  const [out, setOut] = useState<number[]>([]);
  const [asked, setAsked] = useState(0);
  const reduced = useReducedMotion();
  const total = clamp(BASE.value + WHY.reduce((s, w, i) => s + (out.includes(i) ? 0 : w.value), 0), 0, 100);

  // The number rolls to its new value. It writes React's own text node (so React's next update still
  // lands) and only when the digits change — never a React render per frame.
  useGSAP(
    () => {
      const node = num.current?.firstChild;
      const from = shown.current ?? total;
      shown.current = total;
      if (reduced || from === total || !(node instanceof Text)) return;
      const o = { v: from };
      node.data = String(from);
      gsap.to(o, {
        v: total,
        duration: 0.6,
        ease: "power3.out",
        onUpdate: () => {
          const s = String(Math.round(o.v));
          if (node.data !== s) node.data = s;
        },
      });
    },
    { dependencies: [total, on, reduced], revertOnUpdate: true },
  );

  const toggle = (i: number) => {
    play(out.includes(i) ? "toggle-on" : "toggle-off");
    setOut((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));
  };

  if (!on) {
    return (
      <div role="group" aria-label="Demo: a risk score with no reasons" className="flex h-full flex-col justify-between px-[clamp(0.9rem,5cqw,1.75rem)] py-4">
        <p className={micro}>Late-delivery risk</p>
        <p className="font-display text-[clamp(4.5rem,24cqw,7.5rem)] font-[860] leading-[0.8] tracking-[-0.05em]">
          <span ref={num}>{total}</span>%
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-cursor="hover"
            onClick={() => {
              play("error");
              setAsked((n) => n + 1);
            }}
            className="hit rounded-full border border-ink/30 px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors hover:bg-ink hover:text-paper"
          >
            Why?
          </button>
          <p key={asked} aria-live="polite" className={cn("text-[0.8125rem] text-smoke", asked > 0 && "tk-pop")}>
            {asked > 0 ? ANSWERS[(asked - 1) % ANSWERS.length] : "No reasons given."}
          </p>
        </div>
      </div>
    );
  }

  const bar = (v: number) => `${(Math.abs(v) / BASE.value) * 100}%`;
  return (
    <div role="group" aria-label="Demo: the same risk score with its reasons" className="flex h-full flex-col px-[clamp(0.75rem,4cqw,1.4rem)] py-3">
      <div className="flex items-end justify-between gap-4 border-b border-ink/15 pb-2">
        <p className={micro}>Late-delivery risk</p>
        <p aria-live="polite" className="font-display text-[2.1rem] font-[860] leading-[0.8] tracking-[-0.04em]">
          <span ref={num}>{total}</span>%
        </p>
      </div>
      <ul className="mt-1 flex flex-1 flex-col justify-around">
        <li className="tk-rise grid grid-cols-[minmax(0,1fr)_3ch_4.5rem] items-center gap-3 py-0.5 pl-7 text-[0.8125rem] text-smoke">
          <span className="truncate">{BASE.label}</span>
          <span className="text-right font-mono tabular-nums">{signed(BASE.value)}</span>
          <span aria-hidden className="h-2 rounded-[1px] bg-ink/30" style={{ width: bar(BASE.value) }} />
        </li>
        {WHY.map((w, i) => {
          const live = !out.includes(i);
          return (
            <li key={w.label} className="tk-rise" style={{ "--i": i + 1 } as React.CSSProperties}>
              <button
                type="button"
                aria-pressed={live}
                data-cursor="hover"
                data-cursor-label={live ? "REMOVE" : "ADD"}
                onClick={() => toggle(i)}
                className={cn(
                  "grid w-full grid-cols-[1rem_minmax(0,1fr)_3ch_4.5rem] items-center gap-3 rounded-[4px] py-1 pl-1.5 text-left text-[0.8125rem] transition-[background-color,opacity] duration-200 hover:bg-ink/[0.05] coarse:min-h-11",
                  !live && "opacity-45",
                )}
              >
                <span aria-hidden className={cn("grid size-3.5 place-items-center rounded-[3px] border", live ? "border-ink bg-ink" : "border-ink/40")}>
                  {live && <span className="size-1.5 rounded-[1px] bg-paper" />}
                </span>
                <span className={cn("truncate", !live && "line-through")}>{w.label}</span>
                <span className={cn("text-right font-mono tabular-nums", w.value > 0 ? "text-[#b23a0a]" : "text-[#1f7a45]")}>{signed(w.value)}</span>
                <span
                  aria-hidden
                  className={cn("h-2 rounded-[1px] transition-[scale] duration-300", w.value > 0 ? "bg-signal" : "bg-[#1fc25b]")}
                  style={{ width: bar(w.value), scale: live ? "1 1" : "0 1", transformOrigin: "0 50%" }}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <p className={cn(micro, "mt-1 normal-case tracking-[0.04em] text-smoke")}>Tap a reason to take it out of the sum.</p>
    </div>
  );
}
