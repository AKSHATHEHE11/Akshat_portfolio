"use client";
import { useRef } from "react";
import { journey } from "@/data/experience";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useChaos, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { StopText, yearLabel } from "./Stop";
import { useGlitch } from "./useGlitch";

const LAST = journey.reduce((a, s, i) => (s.kind === "future" ? a : i), 0);

/**
 * The line on phones: a vertical rail. The scanner becomes a line held at the middle of the screen;
 * scrolling moves the stops past it and the one under it lights up. Chaos: the line glitches.
 */
export function Rail({ on, className }: { on: boolean; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const year = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const chaos = useChaos();
  const visible = useOnScreen(root, "0px");
  useGlitch(scan, year, on && chaos && !reduced && visible);

  // one trigger for the whole rail: row tops are cached on refresh, the stop under the line is the
  // last one whose top has crossed it (robust to fast flicks that skip a row entirely)
  useGSAP(
    () => {
      const el = root.current;
      const text = year.current?.firstChild;
      if (!on || !el || !(text instanceof Text)) return;
      const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-stop]"));
      let tops: number[] = [];
      let mid = 0;
      let at = -2;
      const pick = (scroll: number) => {
        const i = tops.reduce((a, t, k) => (t <= scroll + mid ? k : a), -1);
        if (i === at) return;
        rows[at]?.removeAttribute("data-on");
        rows[i]?.setAttribute("data-on", "");
        text.data = rows[Math.max(0, i)].dataset.stop ?? "";
        at = i;
      };
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onRefresh: (self) => {
          const y = self.scroll();
          tops = rows.map((r) => r.getBoundingClientRect().top + y);
          mid = window.innerHeight / 2;
          pick(y);
        },
        onUpdate: (self) => pick(self.scroll()),
      });
    },
    { scope: root, dependencies: [on], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={className}>
      <div ref={scan} aria-hidden className="ab-jr-mscan">
        <span className="ab-jr-mhead font-mono">
          <span ref={year}>{journey[0].year}</span>
        </span>
      </div>
      <ol className="ab-jr-list">
        {journey.map((s, i) => (
          <li key={s.year} data-stop={yearLabel(s)} data-kind={s.kind} data-seg={i === journey.length - 1 ? "end" : i >= LAST ? "dash" : "solid"} className="ab-jr-row">
            <span className="ab-jr-row-year font-mono tabular-nums">
              {s.kind === "future" ? (
                <>
                  <span aria-hidden>{yearLabel(s)}</span>
                  <span className="sr-only">{s.year}</span>
                </>
              ) : (
                s.year
              )}
            </span>
            <span aria-hidden className="ab-jr-dot" />
            <StopText stop={s} i={i} total={journey.length} />
          </li>
        ))}
      </ol>
    </div>
  );
}
