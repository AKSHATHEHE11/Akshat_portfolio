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

  useGSAP(
    () => {
      if (!on) return;
      const text = year.current?.firstChild;
      root.current?.querySelectorAll<HTMLElement>("[data-stop]").forEach((li) =>
        ScrollTrigger.create({
          trigger: li,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            li.toggleAttribute("data-on", self.isActive);
            if (self.isActive && text instanceof Text) text.data = li.dataset.stop ?? "";
          },
        }),
      );
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
