"use client";
import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { useLenis } from "lenis/react";
import { TLink } from "@/components/ui/TLink";
import type { Experiment } from "@/data/experiments";
import { gsap } from "@/lib/gsap";
import { useChaos } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { clamp, cn } from "@/lib/utils";
import { SKETCHES, tear, type Draw } from "./sketches";
import "./lab.css";

const LED: Record<Experiment["status"], string> = {
  stable: "bg-go text-go",
  unstable: "bg-accent text-accent",
  volatile: "bg-signal text-signal [animation-duration:0.7s]",
};
const SPEED = 38; // px/s

type Drag = { id: number; x: number; off: number; last: number; t: number; v: number; moved: boolean };

/**
 * The experiments as a strip of film drifting sideways. One rAF moves the strip and redraws the
 * sketches that are actually on screen (every other frame); it only runs while the strip is visible.
 * Hover or focus parks the strip; drag pulls it (and flings it). `still` = reduced motion: a grid,
 * each sketch drawn once.
 */
export function Tape({ items, still }: { items: Experiment[]; still: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const st = useRef({ offset: 0, speed: 1, fling: 0, boost: 0, hover: -1, focus: -1, chaos: false, drag: null as Drag | null, suppress: false });
  const chaos = useChaos();
  useLenis((l) => {
    st.current.boost = l.velocity;
  });

  useEffect(() => {
    st.current.chaos = chaos;
  }, [chaos]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const n = items.length;
    const draws: (Draw | null)[] = canvases.current.map((c, i) => {
      const ctx = c?.getContext("2d");
      return ctx ? SKETCHES[items[i].slug](ctx, items[i].title) : null;
    });
    const rect = (i: number) => () => canvases.current[i]!.getBoundingClientRect();
    let W = 0;
    let vw = 0;
    const size = () => {
      W = slots.current[0]?.offsetWidth ?? 300;
      vw = el.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvases.current.forEach((c) => {
        if (!c) return;
        c.width = Math.round(c.clientWidth * dpr);
        c.height = Math.round(c.clientHeight * dpr);
      });
    };
    size();

    if (still) {
      // a settled frame per sketch (trails need a few frames to look like themselves)
      const draw = () =>
        draws.forEach((d) => {
          for (let f = 0; f < 40; f++) d?.(1200 + f * 16, { hot: false, rect: rect(0) });
        });
      draw();
      const ro = new ResizeObserver(() => {
        size();
        draw();
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    const ro = new ResizeObserver(size);
    ro.observe(el);
    let raf = 0;
    let last = 0;
    let frame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const s0 = st.current;
      const parked = s0.hover >= 0 || s0.focus >= 0 || !!s0.drag;
      s0.speed += ((parked ? 0 : s0.chaos ? -2.8 : 1) - s0.speed) * 0.06;
      s0.boost *= 0.9;
      if (!s0.drag) s0.offset += ((s0.speed * SPEED + s0.fling) * dt) / 1000 + s0.boost * 0.35;
      s0.fling *= 0.95;
      const total = n * W;
      const draw = frame++ % 2 === 0;
      for (let i = 0; i < n; i++) {
        let x = (((i * W - s0.offset) % total) + total) % total;
        if (x > total - W) x -= total;
        const slot = slots.current[i];
        if (!slot) continue;
        const wave = s0.chaos ? Math.sin(x * 0.006 + now * 0.004) : 0;
        slot.style.transform = `translate3d(${x.toFixed(1)}px,${(wave * 12).toFixed(1)}px,0) rotate(${(wave * 2.2).toFixed(2)}deg)`;
        if (draw && x + W > 0 && x < vw) {
          const ctx = canvases.current[i]?.getContext("2d");
          draws[i]?.(now, { hot: s0.hover === i, rect: rect(i) });
          if (ctx && s0.chaos && Math.random() < 0.18) tear(ctx);
        }
      }
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (e.isIntersecting) raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [items, still]);

  /* ── pull the tape ── */
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (still || (e.pointerType === "mouse" && e.button !== 0)) return;
    const n = performance.now();
    st.current.drag = { id: e.pointerId, x: e.clientX, off: st.current.offset, last: e.clientX, t: n, v: 0, moved: false };
    st.current.fling = 0;
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = st.current.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    const n = performance.now();
    st.current.offset = d.off - dx;
    d.v = ((d.last - e.clientX) / Math.max(1, n - d.t)) * 1000;
    d.last = e.clientX;
    d.t = n;
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = st.current.drag;
    if (!d || d.id !== e.pointerId) return;
    st.current.drag = null;
    if (!d.moved) return;
    if (e.type === "pointerup") st.current.fling = clamp(d.v, -2400, 2400);
    st.current.suppress = true; // the click that ends a drag is not a click
    window.setTimeout(() => (st.current.suppress = false), 0);
  };

  /** keyboard focus: park and slide the tile fully into view */
  const focusTile = (i: number) => {
    const s0 = st.current;
    s0.focus = i;
    const el = wrap.current;
    const W = slots.current[0]?.offsetWidth ?? 300;
    if (still || !el) return;
    const total = items.length * W;
    const pad = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft || "0");
    let target = i * W - Math.max(16, pad);
    target += Math.round((s0.offset - target) / total) * total;
    gsap.to(s0, { offset: target, duration: 0.7, ease: "power3.out", overwrite: true });
  };

  return (
    <div
      ref={wrap}
      className={still ? "frame grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "lb-tape"}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClickCapture={(e) => {
        if (!st.current.suppress) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {items.map((x, i) => (
        <div
          key={x.slug}
          ref={(node) => {
            slots.current[i] = node;
          }}
          className={still ? undefined : "lb-slot"}
          style={still ? undefined : ({ "--i": i } as CSSProperties)}
        >
          <TLink
            href={`/experiments#${x.slug}`}
            draggable={false}
            className="lb-tile"
            data-cursor="open"
            data-cursor-label="RUN"
            aria-label={`${x.id}, ${x.title}, ${x.status}. ${x.verb}.`}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") return;
              st.current.hover = i;
              play("tick");
            }}
            onPointerLeave={() => {
              if (st.current.hover === i) st.current.hover = -1;
            }}
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && focusTile(i)}
            onBlur={() => {
              if (st.current.focus === i) st.current.focus = -1;
            }}
          >
            <span aria-hidden className="lb-holes">
              <span className="lb-edge">
                {x.id} ▸ {x.year}
              </span>
            </span>
            <span className="lb-frame">
              <canvas
                ref={(node) => {
                  canvases.current[i] = node;
                }}
                aria-hidden
                className="lb-canvas"
              />
            </span>
            <span className="lb-meta">
              <span className="label">{x.id}</span>
              <span className="label flex items-center gap-1.5">
                <span aria-hidden className={cn("inline-block size-1.5 rounded-full animate-pulse-dot", LED[x.status])} />
                {x.status}
              </span>
            </span>
            <span className="lb-name">{x.title}</span>
            <span className="lb-verb">
              <span aria-hidden>↳ </span>
              {x.verb}
            </span>
            <span aria-hidden className="lb-holes lb-holes-bottom" />
          </TLink>
        </div>
      ))}
    </div>
  );
}
