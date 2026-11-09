"use client";
// Outcome as the room's KPI readouts: numbers count up when they come on screen, each with its trace.
// Chaos: the board starts arguing about the numbers (they scramble and resettle).
import { useEffect, useRef, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useChaos, useReducedMotion } from "@/lib/hooks";
import type { Metric } from "@/lib/types";
import { pad, seeded } from "@/lib/utils";

/** "−63%" → { pre: "−", num: 63, post: "%" } — keeps decimals and thousands separators. */
function parse(v: string) {
  const m = v.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const dec = m[2].split(".")[1]?.length ?? 0;
  const grouped = m[2].includes(",");
  const fmt = (n: number) =>
    m[1] + (grouped ? n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : n.toFixed(dec)) + m[3];
  return { num: Number(m[2].replace(/,/g, "")), dec, fmt };
}

/** deterministic rising trace for each readout */
function trace(seed: number) {
  let y = 0.78;
  const pts: string[] = [];
  for (let i = 0; i < 28; i++) {
    y = Math.min(0.94, Math.max(0.06, y - 0.026 + (seeded(seed * 97 + i) - 0.5) * 0.16));
    pts.push(`${((i / 27) * 400).toFixed(1)},${(y * 40).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

export function Readout({ metrics }: { metrics: Metric[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();

  useGSAP(
    () => {
      const counters = gsap.utils.toArray<HTMLElement>("[data-count]", ref.current);
      if (reduced) {
        counters.forEach((el) => {
          el.textContent = el.dataset.count ?? "";
          el.dataset.counted = "";
        });
        return;
      }
      counters.forEach((el) => {
        const p = parse(el.dataset.count ?? "");
        if (!p) return;
        const o = { v: 0 };
        el.textContent = p.fmt(0);
        gsap.to(o, {
          v: p.num,
          duration: 2.4,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onStart: () => {
            el.dataset.counted = "";
          },
          onUpdate: () => {
            el.textContent = p.fmt(p.dec ? o.v : Math.round(o.v));
          },
        });
      });
      gsap.fromTo(
        "[data-trace]",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 2.4, ease: "expo.out", stagger: 0.12, scrollTrigger: { trigger: ref.current, start: "top 75%", once: true } },
      );
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  // Not useGSAP: reverting a scramble restores the text it captured at start — often the pre-count "0".
  // Kill it instead and put back what the counter should read now.
  useEffect(() => {
    if (!chaos || reduced) return;
    const els = gsap.utils.toArray<HTMLElement>("[data-count]", ref.current);
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.8 });
    els.forEach((el, i) => tl.to(el, { duration: 0.7, scrambleText: { text: el.dataset.count ?? "", chars: "0123456789", speed: 1 } }, i * 0.18));
    return () => {
      tl.kill();
      els.forEach((el) => {
        const final = el.dataset.count ?? "";
        el.textContent = el.dataset.counted === undefined ? (parse(final)?.fmt(0) ?? final) : final;
      });
    };
  }, [chaos, reduced]);

  return (
    <section ref={ref} aria-labelledby="cc-readout" className="frame relative pt-24 md:pt-32">
      <h2 id="cc-readout" data-chaos-type className="font-serif text-[clamp(3rem,2rem+3.4vw,5.5rem)] italic leading-[0.86] tracking-[-0.02em]">
        Readout
      </h2>
      <dl
        className="mt-12 grid border-t border-(--cc-fg)/14 md:mt-16 md:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
        style={{ "--n": metrics.length } as CSSProperties}
      >
        {metrics.map((m, i) => (
          <div key={m.label} className="relative border-b border-(--cc-fg)/14 py-8 md:border-b-0 md:px-6 md:py-10 md:first:pl-0 md:not-first:border-l">
            <dt className="flex items-center justify-between gap-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-(--cc-fg)/60">
              <span>{m.label}</span>
              <span className="text-(--cc-fg)/55">KPI {pad(i + 1)}</span>
            </dt>
            <dd className="mt-5">
              <span
                aria-hidden
                data-count={m.value}
                className="block whitespace-nowrap font-display text-[clamp(4.25rem,2rem+6.5vw,9.5rem)] font-[300] leading-[0.8] tracking-[-0.045em] text-(--cc-accent) tabular-nums [font-variation-settings:'wdth'_68] [text-shadow:0_0_40px_rgb(216_255_0/0.3)]"
              >
                {m.value}
              </span>
              <span className="sr-only">{m.value}</span>
              <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="mt-6 h-10 w-full text-(--cc-accent)" aria-hidden>
                <path data-trace d={trace(i + 1)} pathLength={1} strokeDasharray="1" fill="none" stroke="currentColor" strokeWidth={1.5} />
              </svg>
              {m.note && <span className="mt-3 block text-[0.9375rem] leading-snug text-(--cc-fg)/65">{m.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
