"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { journey } from "@/data/experience";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useChaos, useCoarse, useOnScreen, useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { useSystem } from "@/lib/system";
import { cn } from "@/lib/utils";
import { StopText, yearLabel } from "./Stop";
import { useGlitch } from "./useGlitch";

const Y0 = journey[0].year;
const Y1 = journey[journey.length - 1].year;
const PAD = 0.05;
/** year → fraction of the track width. Years are the coordinates. */
const fx = (year: number) => PAD + ((year - Y0) / (Y1 - Y0)) * (1 - 2 * PAD);
const pct = (f: number) => `${(f * 100).toFixed(3)}%`;
const LAST = journey.reduce((a, s, i) => (s.kind === "future" ? a : i), 0);
const YEARS = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => Y0 + i);
const TICKS = Array.from({ length: (Y1 - Y0) * 4 + 1 }, (_, i) => Y0 + i / 4);

/**
 * The horizontal line (tablet and up): 2021 → 2027 as a ruler, the cursor as a scan line. It follows
 * the pointer and reveals the nearest stop; on touch, drag it (or tap a spot); ←/→ step through the
 * stops. Sweeps the line once when it first scrolls in. Chaos: the scanner glitches.
 */
export function Scanner({ on, className }: { on: boolean; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const coord = useRef<HTMLSpanElement>(null);
  const api = useRef<{ step: (to: (i: number) => number) => void } | null>(null);
  const [idx, setIdx] = useState(LAST);
  const reduced = useReducedMotion();
  const coarse = useCoarse();
  const chaos = useChaos();
  const booted = useSystem((s) => s.booted);
  const visible = useOnScreen(track, "0px");
  useGlitch(scan, coord, on && chaos && !reduced && visible);

  useEffect(() => {
    const el = track.current;
    const line = scan.current;
    const text = coord.current?.firstChild;
    if (!on || !el || !line || !(text instanceof Text)) return;
    let w = 1;
    let left = 0;
    let cur = 0;
    let target = 0;
    let k = 0.16;
    let at = -1;
    let running = false;
    let drag = false;
    let sweep: gsap.core.Tween | null = null;

    const xOf = (i: number) => w * fx(journey[i].year);
    const nearest = (x: number) => {
      let best = 0;
      journey.forEach((_, i) => {
        if (Math.abs(xOf(i) - x) < Math.abs(xOf(best) - x)) best = i;
      });
      return best;
    };
    const write = () => {
      line.style.transform = `translate3d(${cur.toFixed(1)}px,0,0)`;
      const year = Y0 + ((cur / w - PAD) / (1 - 2 * PAD)) * (Y1 - Y0);
      const s = year.toFixed(2);
      if (text.data !== s) text.data = s;
      const i = nearest(cur);
      if (i !== at) {
        if (at !== -1) play("tick");
        at = i;
        setIdx(i);
      }
    };
    const tick = () => {
      cur += (target - cur) * k;
      if (Math.abs(target - cur) < 0.3) cur = target;
      write();
      if (cur === target) {
        running = false;
        gsap.ticker.remove(tick);
      }
    };
    const aim = (x: number, ease = 0.16) => {
      sweep?.kill(); // any input takes over from the intro sweep
      sweep = null;
      target = Math.min(xOf(journey.length - 1), Math.max(xOf(0), x));
      k = reduced ? 1 : ease;
      if (running) return;
      running = true;
      gsap.ticker.add(tick);
    };
    const snap = () => aim(xOf(nearest(target)), 0.14);
    // keys step from where the scanner is heading, so quick repeats keep stepping
    api.current = { step: (to) => aim(xOf(Math.max(0, Math.min(journey.length - 1, to(nearest(target))))), 0.14) };

    const measure = () => {
      const r = el.getBoundingClientRect();
      const f = w > 1 ? cur / w : fx(journey[LAST].year);
      w = Math.max(1, r.width);
      left = r.left;
      cur = target = f * w;
      write();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "mouse" || drag) aim(e.clientX - left);
    };
    // touch: drag to scan, tap to jump; a vertical swipe (pointercancel) scrolls and leaves it alone
    const down = (e: globalThis.PointerEvent) => {
      drag = true;
      if (e.pointerType !== "mouse") return el.setPointerCapture(e.pointerId);
      play("click");
      aim(e.clientX - left);
    };
    const up = (e: globalThis.PointerEvent) => {
      if (drag && e.type === "pointerup" && e.pointerType !== "mouse") aim(e.clientX - left);
      drag = false;
      snap();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);

    // the first time it comes into view: sweep from the first stop to the latest at an even pace
    // (tweened in track fractions, so a resize mid-sweep stays on course)
    const st = reduced
      ? null
      : ScrollTrigger.create({
          trigger: el,
          start: "top 80%",
          once: true,
          onEnter: () => {
            const p = { f: fx(Y0) };
            sweep = gsap.to(p, {
              f: fx(journey[LAST].year),
              duration: 2.4,
              ease: "sine.inOut",
              onUpdate: () => {
                cur = target = p.f * w;
                write();
              },
            });
          },
        });

    return () => {
      ro.disconnect();
      st?.kill();
      sweep?.kill();
      gsap.ticker.remove(tick);
      api.current = null;
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", up);
    };
  }, [on, reduced, booted]);

  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, (i: number) => number> = {
      ArrowLeft: (i) => i - 1,
      ArrowDown: (i) => i - 1,
      ArrowRight: (i) => i + 1,
      ArrowUp: (i) => i + 1,
      Home: () => 0,
      End: () => journey.length - 1,
    };
    const to = keys[e.key];
    if (!to) return;
    e.preventDefault();
    api.current?.step(to);
  };

  const stop = journey[idx];
  const future = stop.kind === "future";

  return (
    <div className={className}>
      <p aria-hidden className="label mb-10 flex justify-between text-fg-muted">
        <span>
          {Y0} → {Y1}
        </span>
        <span>{coarse ? "Drag the scanner" : "Move along the line · ← →"}</span>
      </p>

      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={`The line, ${Y0} to ${Y1}`}
        aria-valuemin={Y0}
        aria-valuemax={Y1}
        aria-valuenow={stop.year}
        aria-valuetext={`${stop.year}: ${stop.title}`}
        data-arrows="local"
        data-swipe="local"
        data-cursor={coarse ? undefined : "hide"}
        className="ab-jr-track"
        onKeyDown={onKey}
      >
        <span aria-hidden className="ab-jr-line" style={{ left: pct(fx(Y0)), width: pct(fx(journey[LAST].year) - fx(Y0)) }} />
        <span aria-hidden className="ab-jr-line ab-jr-line-dash" style={{ left: pct(fx(journey[LAST].year)), width: pct(fx(Y1) - fx(journey[LAST].year)) }} />
        {TICKS.map((t) => (
          <span key={t} aria-hidden className={cn("ab-jr-tick", Number.isInteger(t) && "ab-jr-tick-yr")} style={{ left: pct(fx(t)) }} />
        ))}
        {YEARS.map((y) => (
          <span key={y} aria-hidden className="ab-jr-yr" style={{ left: pct(fx(y)) }}>
            {y}
          </span>
        ))}
        {journey.map((s, i) => (
          <span key={s.year} aria-hidden className="ab-jr-stop" data-kind={s.kind} data-on={i === idx || undefined} style={{ left: pct(fx(s.year)) }}>
            <span className="ab-jr-kind label">{s.kind === "future" ? "?" : s.kind}</span>
          </span>
        ))}
        <div ref={scan} aria-hidden className="ab-jr-scan">
          <span className="ab-jr-head font-mono">
            <span ref={coord}>{journey[LAST].year.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* side by side from the tablet up: on a short landscape phone the stop still sits beside its year */}
      <div className="mt-14 grid grid-cols-12 gap-x-(--gutter)">
        <p aria-hidden key={`y${stop.year}`} className={cn("ab-swap ab-jr-big col-span-5", future && "ab-jr-big-future")}>
          {yearLabel(stop)}
        </p>
        <StopText key={stop.year} stop={stop} i={idx} total={journey.length} className="ab-swap col-span-7 mt-3" />
      </div>
    </div>
  );
}
