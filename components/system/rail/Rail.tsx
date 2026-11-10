"use client";
import "./rail.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { clamp, cn, pad } from "@/lib/utils";

interface Mark {
  label: string;
  /** 0..1 along the track: section top / scrollable height — the ring meets the tick as the section arrives */
  at: number;
  /** px a label is pushed down so neighbouring labels never overlap */
  nudge: number;
}

const PROBE = 0.4; // a section is "current" once its top passes 40% of the viewport
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const inOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

/** Push each label down until it sits at least `gap` px below the previous one. */
function spread(ats: number[], height: number, gap = 15) {
  let prev = -Infinity;
  return ats.map((at) => {
    const y = Math.max(at * height, prev + gap);
    prev = y;
    return y - at * height;
  });
}

const same = (a: Mark[], b: Mark[]) =>
  a.length === b.length &&
  a.every((m, i) => m.label === b[i].label && Math.abs(m.at - b[i].at) < 0.002 && Math.abs(m.nudge - b[i].nudge) < 0.5);

/** Mechanical counter: each digit is a 0–9 strip that rolls into place. */
function Counter({ value }: { value: number }) {
  return (
    <span aria-hidden className="flex text-fg">
      {pad(value)
        .split("")
        .map((d, i) => (
          <span key={i} className="relative block h-[1em] w-[1ch] overflow-hidden">
            <span
              className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-700 ease-machine chaos:ease-snap"
              style={{ transform: `translateY(${-Number(d) * 10}%)` }}
            >
              {DIGITS.map((n) => (
                <span key={n} className="block h-[1em]">
                  {n}
                </span>
              ))}
            </span>
          </span>
        ))}
    </span>
  );
}

/**
 * Right-edge progress instrument: "01 / 08" counter, a track with one sleeper per [data-rail] section
 * in <main>, and a ring that rides page progress (Lenis). Hover/focus reads out every section label;
 * a sleeper is a button that scrolls to its section (sections may set scroll-margin-top to land lower).
 */
export function Rail() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const carrier = useRef<HTMLSpanElement>(null);
  const tops = useRef<number[]>([]);
  const boxes = useRef<HTMLElement[]>([]);
  const current = useRef(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [active, setActive] = useState(0);
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  const booted = useSystem((s) => s.booted);
  const world = useSystem((s) => s.world);
  const reduced = useReducedMotion();
  // never inside a world; never on short pages or pages without rail sections
  const visible = show && !world;

  // Scroll → ring, fill, current section. Transforms only; React renders when the section changes.
  const sync = useCallback((l: Lenis) => {
    const p = l.limit > 0 ? clamp(l.scroll / l.limit) : 0;
    if (carrier.current) carrier.current.style.transform = `translateY(${(p * 100).toFixed(3)}%)`;
    if (fill.current) fill.current.style.transform = `scaleY(${p.toFixed(4)})`;
    const line = l.scroll + window.innerHeight * PROBE;
    let i = 0;
    tops.current.forEach((top, k) => {
      if (top <= line) i = k;
    });
    if (i !== current.current) {
      current.current = i;
      setActive(i);
    }
  }, []);
  const lenis = useLenis(sync);

  const measure = useCallback(() => {
    const main = document.getElementById("main");
    if (!main) return;
    const y = window.scrollY;
    const limit = document.documentElement.scrollHeight - window.innerHeight;
    const found = Array.from(main.querySelectorAll<HTMLElement>("[data-rail]"))
      .map((el) => {
        // A pinned section is measured by its spacer — while pinned, its own rect is glued to the viewport.
        const parent = el.parentElement;
        const box = parent && parent.classList.contains("pin-spacer") ? parent : el;
        return { box, top: box.getBoundingClientRect().top + y, label: el.dataset.rail || el.id || "Section" };
      })
      .sort((a, b) => a.top - b.top);
    tops.current = found.map((f) => f.top);
    boxes.current = found.map((f) => f.box);
    const ats = found.map((f) => (limit > 0 ? clamp(f.top / limit) : 0));
    const nudges = spread(ats, track.current?.clientHeight ?? 240);
    const next = found.map((f, i) => ({ label: f.label, at: ats[i], nudge: nudges[i] }));
    setMarks((prev) => (same(prev, next) ? prev : next));
    // hidden on pages shorter than two viewports or without rail sections
    setShow(found.length > 0 && limit >= window.innerHeight);
    if (lenis) sync(lenis);
  }, [lenis, sync]);

  // Re-measure after mount, route changes, resizes, ScrollTrigger refreshes (pin spacers) and rail sections
  // being added or removed.
  useEffect(() => {
    const main = document.getElementById("main");
    let timer = 0;
    // schedule once (not a resetting debounce): a typing terminal in <main> must not starve the measure
    const later = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        measure();
      }, 200);
    };
    // Only DOM changes that add or remove a rail section matter: measuring forces a layout, and text
    // effects (typing, split-flaps, scrambles) and game sprites mutate <main> many times a second.
    // Height changes from lazy content are the ResizeObserver's job.
    const touchesRail = (nodes: NodeList) =>
      Array.from(nodes).some((n) => n instanceof Element && (n.matches("[data-rail]") || n.querySelector("[data-rail]") !== null));
    const mo = new MutationObserver((records) => {
      if (records.some((r) => touchesRail(r.addedNodes) || touchesRail(r.removedNodes))) later();
    });
    const ro = new ResizeObserver(later);
    if (main) {
      mo.observe(main, { childList: true, subtree: true });
      ro.observe(main);
    }
    window.addEventListener("resize", later);
    ScrollTrigger.addEventListener("refresh", later);
    later();
    return () => {
      window.clearTimeout(timer);
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", later);
      ScrollTrigger.removeEventListener("refresh", later);
    };
  }, [measure, pathname]);

  // Entrance: plays when the boot hands over (and again after RESTART), or when a page gains a rail.
  useGSAP(
    () => {
      if (!visible) return;
      const parts = "[data-rail-index], [data-rail-line], [data-rail-ring], [data-rail-tick]";
      if (!booted) {
        gsap.set(parts, { autoAlpha: 0 });
        return;
      }
      if (reduced) return;
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from("[data-rail-index]", { autoAlpha: 0, y: -8, duration: 0.7 })
        .from("[data-rail-line]", { scaleY: 0, transformOrigin: "50% 0%", duration: 1.1, ease: "machine" }, 0.05)
        .from("[data-rail-tick]", { autoAlpha: 0, x: 8, duration: 0.5, stagger: 0.05 }, 0.3)
        .from("[data-rail-ring]", { scale: 0, duration: 0.7, ease: "snap" }, 0.6);
    },
    { scope: root, dependencies: [booted, visible, reduced], revertOnUpdate: true },
  );

  const go = (i: number) => {
    const box = boxes.current[i];
    if (!box) return;
    play("click");
    if (lenis) lenis.scrollTo(box, { duration: 1.3, easing: inOutQuart, immediate: reduced });
    else box.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const now = marks[active];

  return (
    <nav
      ref={root}
      aria-label="Page sections"
      className={cn(
        "group/rail fixed right-[calc(var(--margin)*0.5)] top-1/2 z-[50] hidden w-7 -translate-y-1/2 translate-x-1/2 flex-col items-center transition-[opacity,visibility] duration-500 md:flex",
        // hide with visibility, never by unmounting: the rail is a named view-transition element
        !visible && "invisible opacity-0",
      )}
      style={{ viewTransitionName: "site-rail" }}
    >
      <p data-rail-index className="flex flex-col items-center gap-[5px] font-mono text-[11px] leading-none tabular-nums">
        <span className="sr-only">{now ? `Section ${active + 1} of ${marks.length}: ${now.label}` : ""}</span>
        <Counter value={active + 1} />
        <span aria-hidden className="text-fg-muted">
          /
        </span>
        <span aria-hidden className="text-fg-muted">
          {pad(marks.length)}
        </span>
      </p>

      <div ref={track} className="relative mt-4 h-[clamp(160px,30vh,300px)] w-full">
        <span data-rail-line className="rail-line absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-strong/25" />
        <span ref={fill} className="absolute inset-y-0 left-1/2 w-px origin-top -translate-x-1/2 bg-fg chaos:bg-signal" />
        <ol className="absolute inset-0">
          {marks.map((m, i) => {
            const on = i === active;
            return (
              <li
                key={`${i}-${m.label}`}
                data-rail-tick
                className="rail-tick absolute inset-x-0 flex -translate-y-1/2 justify-center"
                style={{ top: `${(m.at * 100).toFixed(3)}%` }}
              >
                <button
                  type="button"
                  aria-label={`Go to ${m.label}`}
                  aria-current={on ? "location" : undefined}
                  data-cursor="hover"
                  onClick={() => go(i)}
                  onPointerEnter={() => play("tick")}
                  className="group/tick relative flex h-4 w-7 items-center justify-center rounded-[3px]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "block h-px transition-[width,background-color] duration-300 ease-out-expo",
                      on ? "w-3.5 bg-signal" : "w-2 bg-fg/45 group-hover/tick:w-3.5 group-hover/tick:bg-fg",
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "label pointer-events-none absolute right-[calc(100%+4px)] top-1/2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-[3px] bg-bg/90 px-1.5 py-[3px] opacity-0",
                      "transition-[opacity,translate,color] duration-300 ease-out-expo",
                      "group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100",
                      on ? "text-fg" : "text-fg-muted group-hover/tick:text-fg",
                    )}
                    style={{ marginTop: m.nudge, transitionDelay: `${i * 24}ms` }}
                  >
                    {m.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {/* full-height carrier: translateY(p·100%) moves the ring exactly p of the track */}
        <span ref={carrier} aria-hidden className="pointer-events-none absolute inset-0">
          <span
            data-rail-ring
            className="absolute left-1/2 top-0 block size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-fg bg-bg transition-[rotate,border-radius,background-color,border-color] duration-500 chaos:rotate-45 chaos:rounded-[1px] chaos:border-signal chaos:bg-signal"
          />
        </span>
      </div>
    </nav>
  );
}
