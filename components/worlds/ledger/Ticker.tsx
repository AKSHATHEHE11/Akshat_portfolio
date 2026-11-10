"use client";
// Outcome as the closing prices: a paper ticker tape runs the width of the screen, and under it the
// four figures open at zero and tick up to where they closed. Chaos: the tape goes haywire — it races,
// throws itself into reverse and the quotes won't hold still.
import { useEffect, useRef, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import type { Metric } from "@/lib/types";
import { cn, seeded } from "@/lib/utils";
import type { LedgerScene } from "./scene";

type Dir = LedgerScene["ticker"][number]["dir"];
const ARROW: Record<Dir, string> = { up: "▲", down: "▼", flat: "■" };

/** "−48%" → sign, number, suffix; the count runs on the number only */
function parse(v: string) {
  const m = v.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  return m ? { pre: m[1], num: Number(m[2]), dec: m[2].split(".")[1]?.length ?? 0, post: m[3] } : null;
}

/** a session's price line: deterministic, ending where the direction says */
function trace(seed: number, dir: Dir) {
  const drift = dir === "up" ? -0.028 : dir === "down" ? 0.028 : 0;
  let y = dir === "up" ? 0.8 : dir === "down" ? 0.2 : 0.5;
  const pts: string[] = [];
  for (let i = 0; i < 32; i++) {
    y = Math.min(0.94, Math.max(0.06, y + drift + (seeded(seed * 131 + i) - 0.5) * 0.14));
    pts.push(`${((i / 31) * 400).toFixed(1)},${(y * 48).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

export function Ticker({ metrics, ticker }: { metrics: Metric[]; ticker: LedgerScene["ticker"] }) {
  const ref = useRef<HTMLElement>(null);
  const tape = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const quotes = metrics.map((m, i) => ({ ...m, symbol: ticker[i]?.symbol ?? m.label, dir: ticker[i]?.dir ?? "flat" }));

  // the board opens at zero and counts to the close; each quote flashes when it settles
  useGSAP(
    () => {
      const els = gsap.utils.toArray<HTMLElement>("[data-lg-quote]", ref.current);
      if (reduced) return;
      els.forEach((el, i) => {
        const p = parse(el.dataset.lgQuote ?? "");
        const text = el.firstChild;
        if (!p || !(text instanceof Text)) return;
        const fmt = (n: number) => `${p.pre}${n.toFixed(p.dec)}${p.post}`;
        const o = { v: 0 };
        text.data = fmt(0);
        gsap.to(o, {
          v: p.num,
          duration: 1.8,
          delay: i * 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            const s = fmt(p.dec ? o.v : Math.round(o.v));
            if (text.data !== s) text.data = s;
          },
          onComplete: () => el.closest("[data-lg-cell]")?.classList.add("lg-flash"),
        });
      });
      gsap.fromTo(
        "[data-lg-trace]",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 2, ease: "power2.out", stagger: 0.12, scrollTrigger: { trigger: ref.current, start: "top 70%", once: true } },
      );
    },
    { scope: ref, dependencies: [reduced] },
  );

  // haywire: the tape throws itself into reverse at irregular moments
  useEffect(() => {
    const el = tape.current;
    if (!el || !chaos || reduced || !visible) return;
    let t = 0;
    const flip = () => {
      el.classList.toggle("lg-reverse");
      t = window.setTimeout(flip, 500 + Math.random() * 1400);
    };
    t = window.setTimeout(flip, 700);
    return () => {
      window.clearTimeout(t);
      el.classList.remove("lg-reverse");
    };
  }, [chaos, reduced, visible]);

  const run = [...quotes, ...quotes];
  return (
    <section ref={ref} aria-labelledby="lg-close" className="relative pt-28 md:pt-40">
      <div className="frame">
        <h2
          id="lg-close"
          data-chaos-type
          className="font-display text-[clamp(3rem,1rem+8vw,10rem)] font-[800] leading-[0.82] tracking-[-0.045em] [font-variation-settings:'wdth'_70]"
        >
          At the close
        </h2>
      </div>

      {/* the tape: a decorative loop of the same four quotes (the board below is what gets read) */}
      <div aria-hidden className={cn("lg-tape relative mx-[-3vw] mt-10 -rotate-[1.2deg] overflow-hidden py-4 md:mt-14", chaos && "lg-jitter")}>
        <div
          ref={tape}
          className="lg-tape-run flex w-max animate-marquee"
          style={{ "--marquee-duration": chaos ? "7s" : "38s", animationPlayState: visible ? "running" : "paused" } as CSSProperties}
        >
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0">
              {run.map((q, i) => (
                <span key={i} className="flex shrink-0 items-baseline gap-2.5 whitespace-nowrap px-6 font-mono text-[0.9375rem] font-medium md:text-[1.0625rem]">
                  <span className="font-semibold tracking-[0.06em]">{q.symbol}</span>
                  <span className={q.dir === "flat" ? "opacity-60" : "lg-up"}>{ARROW[q.dir]}</span>
                  <span className="tabular-nums">{q.value}</span>
                  <span className="text-[0.8125rem] opacity-60">{q.label}</span>
                  <span className="pl-4 opacity-35">│</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <dl className="frame mt-12 grid md:mt-16 md:grid-cols-2 xl:grid-cols-4">
        {quotes.map((q, i) => (
          <div
            key={q.label}
            data-lg-cell
            className="relative border-t border-(--lg-fg)/14 py-8 md:py-10 md:pr-6 md:even:border-l md:even:pl-6 xl:not-first:border-l xl:odd:not-first:pl-6"
          >
            <dt className="flex items-baseline justify-between gap-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
              <span className="font-semibold">{q.symbol}</span>
              <span className={cn("text-[0.8125rem]", q.dir === "flat" ? "text-(--lg-fg)/55" : "lg-up")} aria-hidden>
                {ARROW[q.dir]}
              </span>
            </dt>
            <dd className="mt-5">
              <span
                aria-hidden
                data-lg-quote={q.value}
                className={cn(
                  "block whitespace-nowrap font-display text-[clamp(4.5rem,2.6rem+5vw,8.5rem)] font-[300] leading-[0.82] tracking-[-0.045em] tabular-nums [font-variation-settings:'wdth'_70]",
                  chaos && "lg-jitter",
                )}
              >
                {q.value}
              </span>
              <span className="sr-only">
                {q.value} {q.label}
              </span>
              <svg viewBox="0 0 400 48" preserveAspectRatio="none" className={cn("mt-6 h-12 w-full", q.dir === "flat" ? "text-(--lg-signal)" : "text-(--lg-up)")} aria-hidden>
                <path data-lg-trace d={trace(i + 3, q.dir)} pathLength={1} strokeDasharray="1" fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
              <span aria-hidden className="mt-4 block text-[1.0625rem] font-[600] leading-snug">
                {q.label}
              </span>
              {q.note && <span className="mt-1 block text-[0.9375rem] leading-snug text-(--lg-fg)/65">{q.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
