"use client";
// Chaos only (loaded the first time chaos turns on): the printer jams open. Receipts spew out of its
// slot — or up from the bottom edge when the desk is off-screen — and decision stamps rain onto the
// page. A fixed, pointer-transparent layer under the nav; a small pool of nodes recycled with GSAP.
import { useEffect, useRef, type RefObject } from "react";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { gsap } from "@/lib/gsap";
import { useCoarse } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { on } from "@/lib/system";
import type { Band, Borrower } from "./scene";
import { Stamp } from "./Stamp";

gsap.registerPlugin(Physics2DPlugin);

const TONES: Band[] = ["approved", "declined", "review", "declined", "approved", "review"];
const amount = (v: number) => Math.abs(v).toLocaleString("en-IN");

/** a chaos:burst the world heard before this layer existed; t = performance.now() */
export type Burst = { x: number; y: number; t: number };

interface Props {
  slot: RefObject<HTMLDivElement | null>;
  /** set by the world on every chaos:burst — read once on mount, so the switch-on burst isn't missed */
  burst: RefObject<Burst | null>;
  borrowers: Borrower[];
  date: string;
}

export default function Spew({ slot, burst, borrowers, date }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const coarse = useCoarse();
  const receipts = coarse ? 3 : 6;
  const stamps = coarse ? 3 : 6;

  useEffect(() => {
    const root = layer.current;
    if (!root) return;
    const paper = gsap.utils.toArray<HTMLElement>("[data-lg-spew]", root);
    const ink = gsap.utils.toArray<HTMLElement>("[data-lg-rain]", root);
    const R = gsap.utils.random;
    let r = 0;
    let s = 0;

    const spew = (x: number, y: number, up: boolean) => {
      const el = paper[r++ % paper.length];
      gsap.killTweensOf(el);
      gsap.set(el, { x, y, xPercent: -50, yPercent: up ? 0 : -100, rotation: R(-12, 12), autoAlpha: 1, scaleY: 0.15, transformOrigin: "50% 100%" });
      gsap.to(el, { scaleY: 1, duration: 0.25, ease: "power2.out" });
      gsap.to(el, {
        duration: 2.4,
        ease: "none",
        rotation: `+=${R(-260, 260)}`,
        physics2D: { velocity: R(coarse ? 650 : 800, coarse ? 950 : 1250), angle: up ? R(-110, -70) : R(-135, -45), gravity: 1100 },
      });
      gsap.to(el, { autoAlpha: 0, duration: 0.35, delay: 2 });
    };

    const fromSlot = () => {
      const b = slot.current?.getBoundingClientRect(); // once per spew, never per frame
      if (b && b.bottom > 0 && b.top < window.innerHeight) spew(b.left + b.width / 2, b.top, false);
      else spew(R(0.15, 0.85) * window.innerWidth, window.innerHeight + 10, true);
      play("type");
    };

    const rain = () => {
      const el = ink[s++ % ink.length];
      const x = R(0.12, 0.88) * window.innerWidth;
      const y = R(0.18, 0.78) * window.innerHeight;
      gsap.killTweensOf(el);
      gsap
        .timeline()
        .set(el, { x, y: y - 260, xPercent: -50, yPercent: -50, scale: 2.2, rotation: R(-28, 28), autoAlpha: 0 })
        .to(el, { y, scale: 1, autoAlpha: 0.92, duration: 0.32, ease: "power4.in", onComplete: () => play("drop") })
        .to(el, { autoAlpha: 0, duration: 0.7, delay: 1.1 });
    };

    const blast = (x: number, y: number) => {
      for (let k = 0; k < paper.length; k++) gsap.delayedCall(k * 0.06, () => spew(x, y, true));
    };
    // the burst that switched chaos on happened while this chunk was loading
    const pending = burst.current;
    if (pending && performance.now() - pending.t < 2000) blast(pending.x, pending.y);

    const a = window.setInterval(fromSlot, coarse ? 1500 : 850);
    const b = window.setInterval(rain, coarse ? 2200 : 1300);
    const off = on<{ x: number; y: number } | undefined>("chaos:burst", (p) => blast(p?.x ?? window.innerWidth / 2, p?.y ?? window.innerHeight / 2));
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
      off();
      gsap.killTweensOf([...paper, ...ink]);
    };
  }, [slot, burst, coarse]);

  const lines = borrowers.flatMap((b) => b.txns);
  return (
    <div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
      {Array.from({ length: receipts }, (_, i) => (
        <div
          key={`r${i}`}
          data-lg-spew
          className="lg-paper lg-torn invisible absolute left-0 top-0 w-[10.5rem] px-2.5 pb-2 pt-3 font-mono text-[0.5625rem] leading-[1.5] will-change-transform"
        >
          {[0, 1, 2, 3].map((k) => {
            const t = lines[(i * 5 + k * 3) % lines.length];
            return (
              <p key={k} className="flex justify-between gap-2">
                <span className="truncate">{t.narration}</span>
                <span className={t.amount < 0 ? "lg-red" : ""}>{amount(t.amount)}</span>
              </p>
            );
          })}
          <p className="mt-1 text-center tracking-[0.3em] opacity-50">· TEAR ·</p>
        </div>
      ))}
      {Array.from({ length: stamps }, (_, i) => (
        <span key={`s${i}`} data-lg-rain className="invisible absolute left-0 top-0 text-[clamp(1.4rem,1rem+1.6vw,2.6rem)] will-change-transform">
          <Stamp tone={TONES[i % TONES.length]} sub={date} />
        </span>
      ))}
    </div>
  );
}
