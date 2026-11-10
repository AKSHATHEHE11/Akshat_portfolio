"use client";
import { useRef } from "react";
import { useCoarse } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { clamp, cn } from "@/lib/utils";

interface Drag {
  y: number;
  from: number;
  t: number;
  travel: number;
  moved: boolean;
}

const TICKS = [0.25, 0.5, 0.75];

/**
 * A heavy throw lever, up = on. It is a real switch (role="switch"): click, tap, Space or Enter
 * throws it. With a mouse you can also grab the handle and throw it yourself — past halfway it
 * commits, short of that it falls back. Touch gets the tap only, so a swipe over it still scrolls.
 */
export function Lever({
  on,
  onChange,
  labelledBy,
  describedBy,
  className,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
  describedBy?: string;
  className?: string;
}) {
  const knob = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const drag = useRef<Drag | null>(null);
  const swallow = useRef(false);
  const coarse = useCoarse();

  const throwTo = (next: boolean) => {
    play(next ? "toggle-on" : "toggle-off");
    onChange(next);
  };

  // per-move writes go straight to the two parts that move — no React render while dragging
  const paint = (t: number | null, travel = 0) => {
    if (!knob.current || !fill.current) return;
    knob.current.style.translate = t === null ? "" : `0 ${(-t * travel).toFixed(1)}px`;
    fill.current.style.scale = t === null ? "" : `1 ${t.toFixed(3)}`;
  };

  const release = (el: HTMLButtonElement) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    swallow.current = true; // the click that follows this pointerup is the drag, not a tap
    delete el.dataset.drag;
    paint(null); // the CSS transition carries the handle home from wherever it was let go
    const next = d.t > 0.5;
    if (next !== on) throwTo(next);
    else play("press");
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      data-on={on ? "1" : "0"}
      data-cursor={coarse ? "hover" : "drag"}
      // static on purpose: the cursor reads its label on enter, so ON/OFF would go stale after a click
      data-cursor-label="THROW"
      className={cn("tk-lever", className)}
      onPointerEnter={() => play("tick")}
      onPointerDown={(e) => {
        swallow.current = false; // a drag whose click never came must not eat this press
        const k = knob.current;
        const gate = k?.parentElement;
        if (coarse || e.pointerType === "touch" || e.button !== 0 || !k || !gate) return;
        const t = on ? 1 : 0;
        drag.current = { y: e.clientY, from: t, t, travel: gate.clientHeight - k.offsetHeight, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dy = e.clientY - d.y;
        if (!d.moved) {
          if (Math.abs(dy) < 5) return;
          d.moved = true;
          e.currentTarget.dataset.drag = "1";
        }
        d.t = clamp(d.from - dy / d.travel);
        paint(d.t, d.travel);
      }}
      onPointerUp={(e) => release(e.currentTarget)}
      onPointerCancel={(e) => release(e.currentTarget)}
      onLostPointerCapture={(e) => release(e.currentTarget)}
      onClick={() => {
        if (swallow.current) {
          swallow.current = false;
          return;
        }
        throwTo(!on);
      }}
    >
      <span aria-hidden className="tk-mark tk-mark-on" style={{ top: "0.28rem" }}>
        ON
      </span>
      <span aria-hidden className="tk-mark tk-mark-off" style={{ bottom: "0.28rem" }}>
        OFF
      </span>
      <span aria-hidden className="tk-gate">
        <span className="tk-slot">
          <span ref={fill} className="tk-fill" />
        </span>
        {TICKS.map((t) => (
          <span key={t} className="tk-tick" style={{ top: `calc(${(1 - t) * 100}% - 1px)`, marginLeft: "0.75rem" }} />
        ))}
        <span ref={knob} className="tk-knob" />
      </span>
    </button>
  );
}
