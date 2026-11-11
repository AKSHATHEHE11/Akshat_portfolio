"use client";
// Real, focusable controls for the console. In 3D they are transparent hit areas the scene moves onto
// the projected keys/knob/switch every frame (so focus rings and the global cursor land on the
// actual parts); without WebGL they sit over the SVG silhouette at fixed % positions.
import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { KEYS, KEY_LABEL, viewRect, type ControlId, type KeyId, type Mode, type Rig } from "./rig";

/** a control's box in % of the VIEW box */
export type Box = { left: number; top: number; width: number; height: number };

interface Props {
  rig: Rig;
  /** true: positions come from the 3D projection; false: fixed over the stand-in */
  projected: boolean;
  /** where the parts sit on the poster stand-in (else the SVG drawing's layout) */
  rects?: Partial<Record<ControlId, Box>>;
  mode: Mode;
  knob: number;
  chaos: boolean;
  onKey: (key: KeyId) => void;
  onTune: (value: number) => void;
  onChaos: () => void;
}

const HINT: Record<KeyId, string> = {
  design: "Design mode: a live pen-tool drawing on the screen",
  code: "Code mode: source code typing itself",
  experiment: "Experiment mode: an oscilloscope; the knob changes the frequency ratio",
  play: "Play mode: a tiny breakout game; the tuning knob moves the paddle",
};

export function Controls({ rig, projected, rects, mode, knob, chaos, onKey, onTune, onChaos }: Props) {
  const drag = useRef<{ a: number; cx: number; cy: number; y: number } | null>(null);
  const uid = useId();

  const bind = (id: ControlId) => ({
    ref: (el: HTMLElement | null) => {
      rig.els[id] = projected ? el : null;
      // demand frameloop (reduced motion): without a frame the new hit area stays 0×0 and unclickable
      if (projected && el) rig.invalidate();
    },
    style: projected
      ? { left: 0, top: 0 }
      : rects?.[id]
        ? { left: `${rects[id].left}%`, top: `${rects[id].top}%`, width: `${rects[id].width}%`, height: `${rects[id].height}%` }
        : viewRect(id),
    onPointerEnter: () => {
      rig.hover = id;
      play("tick");
      rig.invalidate();
    },
    onPointerLeave: () => {
      if (rig.hover === id) rig.hover = null;
      if (rig.down === id) rig.down = null;
      rig.invalidate();
    },
    onFocus: () => {
      rig.hover = id;
      rig.invalidate();
    },
    onBlur: () => {
      if (rig.hover === id) rig.hover = null;
      rig.invalidate();
    },
  });

  const hold = (id: KeyId | null) => {
    rig.down = id;
    rig.invalidate();
  };

  const knobDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    drag.current = { a: Math.atan2(e.clientY - cy, e.clientX - cx), cx, cy, y: e.clientY };
  };
  const knobMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx);
    let da = a - d.a;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    d.a = a;
    // angular drag around the knob; near the centre the angle is noise, so fall back to vertical drag
    const near = Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < 14;
    onTune(rig.knob + (near ? (d.y - e.clientY) / 220 : da / (Math.PI * 1.5)));
    d.y = e.clientY;
  };
  const knobKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 0.04, ArrowUp: 0.04, ArrowLeft: -0.04, ArrowDown: -0.04, PageUp: 0.2, PageDown: -0.2 }[e.key];
    if (step !== undefined) onTune(rig.knob + step);
    else if (e.key === "Home") onTune(0);
    else if (e.key === "End") onTune(1);
    else return;
    e.preventDefault();
  };

  const pct = Math.round(knob * 100);
  return (
    <div role="group" aria-label="Console" className="pointer-events-none absolute inset-0">
      {KEYS.map((id) => (
        <span key={id} id={`${uid}-${id}`} className="sr-only">
          {HINT[id]}
        </span>
      ))}
      {KEYS.map((id) => (
        <button
          key={id}
          type="button"
          {...bind(id)}
          className={cn("hero-hit pointer-events-auto absolute touch-manipulation rounded-[12px]", projected && "will-change-transform")}
          aria-label={KEY_LABEL[id]}
          aria-describedby={`${uid}-${id}`}
          aria-pressed={mode === id}
          data-cursor="hover"
          data-cursor-label={KEY_LABEL[id].toUpperCase()}
          onPointerDown={() => hold(id)}
          onPointerUp={() => hold(null)}
          onPointerCancel={() => hold(null)}
          onKeyDown={(e) => {
            if (e.repeat) e.preventDefault(); // a held Enter would toggle the mode on every repeat
            else if (e.key === " " || e.key === "Enter") hold(id);
          }}
          onKeyUp={() => hold(null)}
          onClick={() => onKey(id)}
        />
      ))}
      <div
        {...bind("knob")}
        role="slider"
        tabIndex={0}
        aria-label={mode === "play" ? "Tuning knob (moves the paddle)" : "Tuning knob"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={mode === "play" ? `Paddle at ${pct}%` : `Tuned to ${pct}%`}
        aria-orientation="horizontal"
        className={cn("hero-hit pointer-events-auto absolute touch-none rounded-full", projected && "will-change-transform")}
        data-cursor="drag"
        data-cursor-label="TURN"
        onPointerDown={knobDown}
        onPointerMove={knobMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={knobKey}
      />
      <button
        {...bind("switch")}
        type="button"
        role="switch"
        aria-checked={chaos}
        aria-label="Chaos mode"
        className={cn("hero-hit pointer-events-auto absolute touch-manipulation rounded-[10px]", projected && "will-change-transform")}
        data-cursor="hover"
        data-cursor-label={chaos ? "CALM" : "CHAOS"}
        onClick={onChaos}
      />
    </div>
  );
}
