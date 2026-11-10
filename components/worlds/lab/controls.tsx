"use client";
// Knobs, faders and bat switches. Each one subscribes to its own value and paints itself (CSS var,
// aria-value*, a text node) — turning a knob or gliding a preset never re-renders React.
// Pointer: drag up/right to raise (Shift = fine), double-click/double-tap resets to the loaded value.
// Keyboard: arrows, PageUp/PageDown, Home/End, Delete resets.
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { play } from "@/lib/sound";
import type { Field, Source } from "./field";
import { norm, type ParamSpec, SWITCHES } from "./patch";

/** Write a string into an element's own text node, only when it changed. */
function text(el: HTMLElement | null, s: string) {
  const t = el?.firstChild;
  if (t instanceof Text && t.data !== s) t.data = s;
}

function useParamInput(field: Field, sp: ParamSpec, track?: RefObject<HTMLElement | null>) {
  const drag = useRef<{ id: number; y: number; x: number; acc: number; span: number } | null>(null);
  const tap = useRef({ t: 0, x: 0, y: 0 });
  const range = sp.max - sp.min;

  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const now = performance.now();
      const t = tap.current;
      if (now - t.t < 340 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 16) {
        tap.current.t = 0;
        drag.current = null;
        field.reset(sp.key);
        play("toggle-off");
        return;
      }
      tap.current = { t: now, x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      let span = 230; // px of drag for the whole range (knobs)
      if (track?.current) {
        // faders: a press away from the cap jumps there first (one rect read per press)
        const r = track.current.getBoundingClientRect();
        span = r.height;
        const at = sp.min + (1 - (e.clientY - r.top) / r.height) * range;
        if (Math.abs(at - field.patch[sp.key]) / range > 0.1) field.set(sp.key, at);
      }
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, acc: field.patch[sp.key], span };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const px = d.y - e.clientY + (track ? 0 : (e.clientX - d.x) * 0.5);
      d.x = e.clientX;
      d.y = e.clientY;
      d.acc += (px / d.span) * range * (e.shiftKey ? 0.2 : 1);
      if (!sp.wrap) d.acc = Math.min(sp.max, Math.max(sp.min, d.acc));
      field.set(sp.key, d.acc);
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      if (drag.current?.id === e.pointerId) drag.current = null;
    },
    onPointerCancel(e: PointerEvent<HTMLElement>) {
      if (drag.current?.id === e.pointerId) drag.current = null;
    },
    onKeyDown(e: KeyboardEvent<HTMLElement>) {
      const s = sp.step * (e.shiftKey ? 0.25 : 1);
      const delta = ({ ArrowUp: s, ArrowRight: s, ArrowDown: -s, ArrowLeft: -s, PageUp: s * 10, PageDown: -s * 10 } as Record<string, number>)[e.key];
      const cur = field.patch[sp.key];
      if (delta !== undefined) field.set(sp.key, sp.key === "pixel" ? cur + Math.sign(delta) * Math.max(1, Math.abs(delta)) : cur + delta);
      else if (e.key === "Home") field.set(sp.key, sp.min);
      else if (e.key === "End") field.set(sp.key, sp.max);
      else if (e.key === "Delete" || e.key === "Backspace") field.reset(sp.key);
      else return;
      e.preventDefault();
    },
  };
}

/** Subscribe one control: paint now, on every change, and its modulation marker every frame. */
function useBind(
  field: Field,
  sp: ParamSpec,
  root: RefObject<HTMLElement | null>,
  out: RefObject<HTMLElement | null>,
  ghost: RefObject<HTMLElement | null>,
  place: (g: HTMLElement, n: number) => void,
) {
  useEffect(() => {
    const el = root.current;
    const g = ghost.current;
    if (!el || !g) return;
    let base = 0;
    let notch = -1;
    let at = NaN;
    const paint = (v: number, source?: Source) => {
      base = norm(sp.key, v);
      el.style.setProperty("--v", base.toFixed(4));
      el.setAttribute("aria-valuenow", String(Math.round(v * 1000) / 1000));
      el.setAttribute("aria-valuetext", sp.fmt(v));
      text(out.current, sp.fmt(v));
      const n = Math.round(base * 24);
      if (source === "user" && n !== notch) play("tick");
      notch = n;
    };
    paint(field.patch[sp.key]);
    const offValue = field.onValue((k, v, s) => {
      if (k === sp.key) paint(v as number, s);
    });
    const offGhost = field.ghost(sp.key, (eff) => {
      const n = Math.round(norm(sp.key, eff) * 400) / 400;
      const show = Math.abs(n - base) > 0.008;
      if (show && n !== at) {
        place(g, n);
        at = n;
      }
      if (show !== g.hasAttribute("data-on")) g.toggleAttribute("data-on", show);
    });
    return () => {
      offValue();
      offGhost();
    };
    // place is a stable module-level function per control type
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, sp]);
}

const placeKnob = (g: HTMLElement, n: number) => {
  g.style.transform = `rotate(${(-135 + n * 270).toFixed(1)}deg)`;
};
const placeFader = (g: HTMLElement, n: number) => {
  g.style.setProperty("--g", n.toFixed(3));
};

interface CtlProps {
  field: Field;
  spec: ParamSpec;
  /** the value the server rendered with (the first factory preset) */
  initial: number;
}

export function Knob({ field, spec: sp, initial }: CtlProps) {
  const root = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const input = useParamInput(field, sp);
  useBind(field, sp, root, out, ghost, placeKnob);

  return (
    <div className="nf-ctl" data-key={sp.key}>
      <div
        ref={root}
        role="slider"
        tabIndex={0}
        aria-label={sp.label}
        aria-valuemin={sp.min}
        aria-valuemax={sp.max}
        aria-valuenow={initial}
        aria-valuetext={sp.fmt(initial)}
        aria-keyshortcuts="Delete"
        data-cursor="drag"
        data-cursor-label="TURN"
        className="nf-knob"
        style={{ "--v": norm(sp.key, initial) } as CSSProperties}
        {...input}
      >
        <span aria-hidden className="nf-knob-ring" />
        <span aria-hidden className="nf-knob-body" />
        <span aria-hidden className="nf-knob-cap" />
        <span ref={ghost} aria-hidden className="nf-knob-ghost" />
      </div>
      <span aria-hidden className="nf-ctl-label">
        {sp.label}
      </span>
      <span ref={out} aria-hidden className="nf-ctl-val">
        {sp.fmt(initial)}
      </span>
    </div>
  );
}

export function Fader({ field, spec: sp, initial }: CtlProps) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLSpanElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const input = useParamInput(field, sp, track);
  useBind(field, sp, root, out, ghost, placeFader);

  return (
    <div className="nf-ctl" data-key={sp.key}>
      <div
        ref={root}
        role="slider"
        tabIndex={0}
        aria-label={sp.label}
        aria-orientation="vertical"
        aria-valuemin={sp.min}
        aria-valuemax={sp.max}
        aria-valuenow={initial}
        aria-valuetext={sp.fmt(initial)}
        aria-keyshortcuts="Delete"
        data-cursor="drag"
        data-cursor-label="SLIDE"
        className="nf-fader"
        style={{ "--v": norm(sp.key, initial) } as CSSProperties}
        {...input}
      >
        <span ref={track} aria-hidden className="nf-fader-track">
          <span className="nf-fader-fill" />
        </span>
        <span aria-hidden className="nf-fader-cap" />
        <span ref={ghost} aria-hidden className="nf-fader-ghost" />
      </div>
      <span aria-hidden className="nf-ctl-label">
        {sp.label}
      </span>
      <span ref={out} aria-hidden className="nf-ctl-val">
        {sp.fmt(initial)}
      </span>
    </div>
  );
}

export function Toggle({ field, sw, initial }: { field: Field; sw: (typeof SWITCHES)[number]; initial: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const out = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const paint = (v: boolean) => {
      el.setAttribute("aria-checked", String(v));
      text(out.current, v ? sw.on : sw.off);
    };
    paint(field.patch[sw.key]);
    return field.onValue((k, v) => {
      if (k === sw.key) paint(v as boolean);
    });
  }, [field, sw]);

  return (
    <div className="nf-ctl" data-key={sw.key}>
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={initial}
        aria-label={sw.label}
        data-cursor="hover"
        className="nf-switch"
        onPointerEnter={() => play("tick")}
        onClick={() => {
          const v = !field.patch[sw.key];
          field.flip(sw.key, v);
          play(v ? "toggle-on" : "toggle-off");
        }}
      >
        <span aria-hidden className="nf-led" />
        <span aria-hidden className="nf-switch-plate">
          <span className="nf-switch-bat" />
        </span>
      </button>
      <span aria-hidden className="nf-ctl-label">
        {sw.label}
      </span>
      <span ref={out} aria-hidden className="nf-ctl-val">
        {initial ? sw.on : sw.off}
      </span>
    </div>
  );
}
