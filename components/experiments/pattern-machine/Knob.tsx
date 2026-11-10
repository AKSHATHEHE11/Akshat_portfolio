"use client";
// A rotary knob: drag up/right to turn it up (touch-action none — it is something you grab), arrow
// keys / PageUp / Home / End as a slider. Turning repaints the cap and readout directly; React only
// renders it once. `steps` adds detents that click.
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { play } from "@/lib/sound";
import { clamp } from "@/lib/utils";

const SWEEP = 270;

export function Knob({
  label,
  value,
  steps,
  format,
  onChange,
}: {
  label: string;
  /** initial value 0..1 */
  value: number;
  steps?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLSpanElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const v = useRef(value);
  const drag = useRef<{ id: number; x: number; y: number; v0: number } | null>(null);

  const set = (next: number) => {
    let x = clamp(next);
    if (steps) x = Math.round(x * (steps - 1)) / (steps - 1);
    if (Math.abs(x - v.current) < 1e-4) return;
    if (steps) play("tick");
    v.current = x;
    if (cap.current) cap.current.style.transform = `rotate(${-SWEEP / 2 + x * SWEEP}deg)`;
    const text = format(x);
    const node = out.current?.firstChild;
    if (node) (node as Text).data = text;
    el.current?.setAttribute("aria-valuenow", String(Math.round(x * 100)));
    el.current?.setAttribute("aria-valuetext", text);
    onChange(x);
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, v0: v.current };
    play("click");
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    set(d.v0 + (e.clientX - d.x - (e.clientY - d.y)) / 170);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const unit = steps ? 1 / (steps - 1) : 0.05;
    const map: Record<string, number> = {
      ArrowUp: unit,
      ArrowRight: unit,
      ArrowDown: -unit,
      ArrowLeft: -unit,
      PageUp: unit * 4,
      PageDown: -unit * 4,
      Home: -1,
      End: 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    set(v.current + map[e.key]);
  };

  const ticks = steps ?? 11;
  return (
    <div className="xp-knob">
      <div
        ref={el}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={format(value)}
        data-cursor="drag"
        data-cursor-label="TURN"
        className="xp-knob-dial"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onKeyDown={key}
      >
        <svg aria-hidden viewBox="-50 -50 100 100" className="xp-knob-scale">
          {Array.from({ length: ticks }, (_, i) => {
            const a = ((-SWEEP / 2 + (i / (ticks - 1)) * SWEEP - 90) * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={Math.cos(a) * 41}
                y1={Math.sin(a) * 41}
                x2={Math.cos(a) * (steps ? 49 : 46)}
                y2={Math.sin(a) * (steps ? 49 : 46)}
              />
            );
          })}
        </svg>
        <span ref={cap} className="xp-knob-cap" style={{ transform: `rotate(${-SWEEP / 2 + value * SWEEP}deg)` }}>
          <span className="xp-knob-mark" />
        </span>
      </div>
      <span className="label xp-knob-label">{label}</span>
      <span ref={out} className="label xp-knob-value tabular-nums">
        {format(value)}
      </span>
    </div>
  );
}
