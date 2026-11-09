"use client";
import { useEffect, useRef, useState } from "react";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import { cn, seeded } from "@/lib/utils";

// Solari-style split-flap text. Cells flip through the drum in order until they land on the target.
// DOM is mutated directly (no React render per flap); SSR renders the final text.
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-+/&·";
const FLAP: Keyframe[] = [{ transform: "rotateX(80deg)" }, { transform: "rotateX(0deg)" }];

const norm = (s: string, size?: number) => {
  const up = s.toUpperCase();
  return size ? up.padEnd(size).slice(0, size) : up;
};

/** The last few drum characters before `to`, so the cell visibly rolls onto its letter. */
function path(from: string, to: string, max: number) {
  const a = DRUM.indexOf(from);
  const b = DRUM.indexOf(to);
  if (b < 0 || a < 0) return [DRUM[1 + Math.floor(seeded(to.charCodeAt(0)) * 25)], to];
  const steps = Math.min((b - a + DRUM.length) % DRUM.length, max);
  return Array.from({ length: steps }, (_, k) => DRUM[(b - steps + 1 + k + DRUM.length) % DRUM.length]);
}

function flipRow(row: HTMLElement, to: string, step: number, timers: number[], scramble = false) {
  Array.from(row.children).forEach((cell, i) => {
    const el = cell as HTMLElement;
    const target = to[i] ?? " ";
    let from = el.textContent || " ";
    if (scramble) from = DRUM[Math.floor(seeded(i * 7 + target.charCodeAt(0)) * DRUM.length)];
    if (from === target && !scramble) return;
    const seq = path(from, target, 4 + (i % 4));
    seq.forEach((ch, k) => {
      timers.push(
        window.setTimeout(() => {
          el.textContent = ch;
          el.animate(FLAP, { duration: step * 0.9, easing: "cubic-bezier(.3,.7,.4,1)" });
        }, i * 22 + k * step),
      );
    });
  });
}

export function SplitFlap({
  text,
  size,
  className,
  pool,
  intro = false,
  step = 58,
}: {
  text: string;
  /** fixed number of cells (pads with blanks). Defaults to the text length. */
  size?: number;
  className?: string;
  /** chaos mode flips the board to one of these at random, then back */
  pool?: string[];
  /** when this turns true the board refreshes from scrambled cells (arrival boards, intros) */
  intro?: boolean;
  step?: number;
}) {
  const row = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const target = norm(text, size);
  // React renders the first text only; later changes are flipped in by the effect (otherwise React
  // would swap the letters before the flip could run).
  const [cells] = useState(() => Array.from(target));

  // text changes → roll every cell to its new letter
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const timers: number[] = [];
    if (reduced) Array.from(el.children).forEach((c, i) => (c.textContent = target[i]));
    else flipRow(el, target, step, timers);
    return () => timers.forEach(clearTimeout);
  }, [target, reduced, step]);

  useEffect(() => {
    const el = row.current;
    if (!el || !intro || reduced) return;
    const timers: number[] = [];
    flipRow(el, target, step, timers, true);
    return () => timers.forEach(clearTimeout);
    // only when intro flips on — target changes are handled above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, reduced]);

  // chaos: the board misbehaves — flips to a random destination and back
  useEffect(() => {
    const el = row.current;
    if (!el || !chaos || reduced || !pool?.length) return;
    const timers: number[] = [];
    const id = window.setInterval(() => {
      if (Math.random() < 0.45) return;
      flipRow(el, norm(pool[Math.floor(Math.random() * pool.length)], target.length), 40, timers);
      timers.push(window.setTimeout(() => flipRow(el, target, 40, timers), 1300));
    }, 2400);
    return () => {
      window.clearInterval(id);
      timers.forEach(clearTimeout);
      Array.from(el.children).forEach((c, i) => (c.textContent = target[i]));
    };
  }, [chaos, reduced, pool, target]);

  return (
    <span className={cn("rw-flaps", className)}>
      <span className="sr-only">{text}</span>
      <span ref={row} className="rw-flaps-row" aria-hidden>
        {cells.map((c, i) => (
          <span key={i} className="rw-cell">
            {c}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Whole-word flap — how old Indian boards showed Hindi names: one printed flap per station. */
export function FlapWord({ text, pool, className }: { text: string; pool: string[]; className?: string }) {
  const cell = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const [initial] = useState(text);

  useEffect(() => {
    const el = cell.current;
    if (!el) return;
    if (reduced || el.textContent === text) {
      el.textContent = text;
      return;
    }
    const others = pool.filter((w) => w !== text);
    const seq = [...others.slice(0, 3), text];
    const timers = seq.map((w, k) =>
      window.setTimeout(() => {
        el.textContent = w;
        el.animate(FLAP, { duration: 80, easing: "cubic-bezier(.3,.7,.4,1)" });
      }, k * 95),
    );
    return () => timers.forEach(clearTimeout);
  }, [text, pool, reduced]);

  useEffect(() => {
    const el = cell.current;
    if (!el || !chaos || reduced || pool.length < 2) return;
    let back = 0;
    const id = window.setInterval(() => {
      if (Math.random() < 0.5) return;
      el.textContent = pool[Math.floor(Math.random() * pool.length)];
      el.animate(FLAP, { duration: 80 });
      back = window.setTimeout(() => (el.textContent = text), 900);
    }, 2600);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(back); // else a stale name lands after the board moved on
      el.textContent = text;
    };
  }, [chaos, reduced, pool, text]);

  return (
    <span className={cn("rw-flaps", className)}>
      <span className="sr-only" lang="hi">
        {text}
      </span>
      <span ref={cell} className="rw-cell rw-cell-word rw-hi" aria-hidden lang="hi">
        {initial}
      </span>
    </span>
  );
}
