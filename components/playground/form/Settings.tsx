"use client";
import { useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { gsap } from "@/lib/gsap";
import { useChaos, useCoarse, useReducedMotion } from "@/lib/hooks";
import { pointer } from "@/lib/pointer";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import { lab, setText } from "../lab";
import { FORM, GIVE_UP, RUNAWAY } from "../copy";

/** Where the save button likes to hide: fractions of the free space in its track. */
const SPOTS: [number, number][] = [
  [0.04, 0.1],
  [0.92, 0.12],
  [0.3, 0.88],
  [0.78, 0.86],
  [0.55, 0.06],
  [0.08, 0.84],
];
const BTN = { w: 176, h: 48 };
const DRIFTS = 3;

/**
 * Unreasonable UI: a settings form with opinions. The slider drifts to its favourite value a moment
 * after you let go (three times, then it relents); the checkbox unchecks itself once; the save
 * button runs from an approaching cursor, a tap or Enter, then gives up ("fine, you win") and
 * actually saves. Funny, never hostile: every control ends up doing what you asked.
 * Chaos: a different favourite, a second self-uncheck, a more stubborn button.
 */
export default function Settings() {
  const id = useId();
  const chaos = useChaos();
  const coarse = useCoarse();
  const reduced = useReducedMotion();

  // slider: uncontrolled, written directly while it drifts (no React render per frame)
  const range = useRef<HTMLInputElement>(null);
  const out = useRef<HTMLOutputElement>(null);
  const idle = useRef(0);
  const drift = useRef<gsap.core.Tween | null>(null);
  const [drifts, setDrifts] = useState(0);
  const [note, setNote] = useState("");
  const fav = chaos ? FORM.slider.chaosFav : FORM.slider.fav;

  // checkbox
  const [checked, setChecked] = useState(false);
  const [undone, setUndone] = useState(0);
  const [checkNote, setCheckNote] = useState("");
  const uncheck = useRef(0);
  const undoes = chaos ? 2 : 1;

  // runaway button
  const track = useRef<HTMLDivElement>(null);
  /** the track's box with `top` in document px (the page may scroll under a resting cursor); measured on
   *  pointerenter, then compared against lab.scroll per move — no layout reads while the cursor moves */
  const geo = useRef<{ left: number; top: number; w: number; h: number } | null>(null);
  const [spot, setSpot] = useState(-1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [tries, setTries] = useState(0);
  const [quip, setQuip] = useState("");
  const [saved, setSaved] = useState(false);
  const swallowClick = useRef(false);
  const limit = chaos ? 8 : coarse ? 3 : 5;
  const quit = tries >= limit;

  useEffect(() => {
    // a resized track invalidates the hiding places: back to the middle
    const home = () => {
      setSpot(-1);
      setPos({ x: 0, y: 0 });
    };
    window.addEventListener("resize", home);
    return () => {
      window.removeEventListener("resize", home);
      window.clearTimeout(idle.current);
      window.clearTimeout(uncheck.current);
      drift.current?.kill();
    };
  }, []);

  /* ── slider ── */
  function show(v: number) {
    setText(out.current, `${v}%`);
  }
  function onSlide() {
    const el = range.current;
    if (!el) return;
    drift.current?.kill();
    show(Number(el.value));
    window.clearTimeout(idle.current);
    if (drifts >= DRIFTS) {
      setNote(FORM.slider.relent.replace("{v}", el.value));
      return;
    }
    idle.current = window.setTimeout(function wait() {
      // still holding the thumb: ask again later
      if (pointer.down) {
        idle.current = window.setTimeout(wait, 400);
        return;
      }
      const from = Number(el.value);
      if (from === fav) return;
      setNote(FORM.slider.drift.replace("{f}", String(fav)));
      play("tick");
      const o = { v: from };
      drift.current = gsap.to(o, {
        v: fav,
        duration: reduced ? 0 : 1.6,
        ease: "power2.inOut",
        onUpdate: () => {
          const v = Math.round(o.v);
          if (el.value !== String(v)) {
            el.value = String(v);
            show(v);
          }
        },
        onComplete: () => setDrifts((d) => d + 1),
      });
    }, 900);
  }

  /* ── checkbox ── */
  function onCheck(on: boolean) {
    setChecked(on);
    window.clearTimeout(uncheck.current);
    if (!on) {
      setCheckNote("");
      return;
    }
    if (undone >= undoes) {
      setCheckNote(FORM.check.kept);
      return;
    }
    uncheck.current = window.setTimeout(() => {
      setChecked(false);
      setUndone((u) => u + 1);
      setCheckNote(FORM.check.undo);
      play("toggle-off");
    }, 700);
  }

  /* ── save button ── */
  function measure() {
    const r = track.current?.getBoundingClientRect();
    if (r) geo.current = { left: r.left, top: r.top + lab.scroll, w: r.width, h: r.height };
    return geo.current;
  }
  /** top-left of a spot, relative to the track's centre position for the button */
  function offset(i: number, g: { w: number; h: number }) {
    if (i < 0) return { x: 0, y: 0 };
    const fx = (g.w - BTN.w) * SPOTS[i][0];
    const fy = (g.h - BTN.h) * SPOTS[i][1];
    return { x: Math.round(fx - (g.w - BTN.w) / 2), y: Math.round(fy - (g.h - BTN.h) / 2) };
  }
  function dodge(from?: { x: number; y: number }) {
    const g = measure();
    if (!g) return;
    let next = (spot + 1) % SPOTS.length;
    if (from) {
      // the hiding place farthest from the cursor
      let best = -1;
      SPOTS.forEach((_, i) => {
        if (i === spot) return;
        const o = offset(i, g);
        const d = Math.hypot(g.left + g.w / 2 + o.x - from.x, g.top - lab.scroll + g.h / 2 + o.y - from.y);
        if (d > best) {
          best = d;
          next = i;
        }
      });
    }
    const n = tries + 1;
    setSpot(next);
    setPos(offset(next, g));
    setTries(n);
    if (n >= limit) {
      setQuip(GIVE_UP);
      play("toggle-off");
    } else {
      setQuip(RUNAWAY[(n - 1) % RUNAWAY.length]);
      play("tick");
    }
  }
  const onTrackMove = (e: PointerEvent<HTMLDivElement>) => {
    if (quit || saved || e.pointerType !== "mouse") return;
    const g = geo.current;
    if (!g) return;
    const bx = g.left + g.w / 2 + pos.x;
    const by = g.top - lab.scroll + g.h / 2 + pos.y;
    const dx = Math.max(Math.abs(e.clientX - bx) - BTN.w / 2, 0);
    const dy = Math.max(Math.abs(e.clientY - by) - BTN.h / 2, 0);
    if (Math.hypot(dx, dy) < 26) dodge({ x: e.clientX, y: e.clientY });
  };
  const onBtnDown = (e: PointerEvent<HTMLButtonElement>) => {
    // (a dodged tap's click may land on the track instead, so the flag is re-decided every press)
    swallowClick.current = !(quit || saved || e.pointerType === "mouse");
    // a finger can't sneak up on it: the tap itself makes it jump
    if (swallowClick.current) dodge();
  };
  const onBtnClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    if (!quit && !saved && e.detail === 0) {
      dodge();
      return;
    }
    if (saved) return;
    setSaved(true);
    setQuip("");
    emit("toast", { text: FORM.saved });
    play("success");
  };

  const honoured = (drifts >= DRIFTS ? 1 : 0) + (checked && undone >= undoes ? 1 : 0) + (saved ? 1 : 0);

  return (
    <form className="pg-form" data-pg-in aria-labelledby={`${id}-h`} onSubmit={(e) => e.preventDefault()}>
      <header className="pg-form-head">
        <h2 id={`${id}-h`} className="label">
          {FORM.file}
        </h2>
        <span className="label">3 fields · {honoured} honoured</span>
      </header>

      <div className="pg-field">
        <label htmlFor={`${id}-c`} className="pg-field-label">
          {FORM.slider.label}
        </label>
        <div className="pg-field-row">
          <input
            ref={range}
            id={`${id}-c`}
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={40}
            className="pg-range"
            aria-describedby={`${id}-cn`}
            onInput={onSlide}
          />
          <output ref={out} htmlFor={`${id}-c`} className="pg-field-out">
            40%
          </output>
        </div>
        <p id={`${id}-cn`} className="pg-field-note" aria-live="polite">
          {note}
        </p>
      </div>

      <div className="pg-field pg-check">
        <input id={`${id}-k`} type="checkbox" className="pg-checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} aria-describedby={`${id}-kn`} />
        <label htmlFor={`${id}-k`} className="pg-field-label">
          {FORM.check.label}
        </label>
        <p id={`${id}-kn`} className="pg-field-note" aria-live="polite">
          {checkNote}
        </p>
      </div>

      <div ref={track} className="pg-run-track" onPointerEnter={measure} onPointerMove={onTrackMove}>
        <div className="pg-run" style={{ translate: `${pos.x}px ${pos.y}px` }}>
          <span className="pg-run-quip" aria-live="polite" data-on={quip ? "" : undefined}>
            {quip}
          </span>
          <Button
            variant={saved ? "accent" : "ink"}
            magnetic={false}
            className="pg-run-btn"
            icon={<Save size={16} strokeWidth={1.75} />}
            onPointerDown={onBtnDown}
            onPointerCancel={() => (swallowClick.current = false)}
            onClick={onBtnClick}
          >
            {saved ? "Saved" : FORM.save}
          </Button>
        </div>
      </div>
      {saved ? (
        <span aria-hidden className="pg-form-stamp">
          Saved*
        </span>
      ) : null}
    </form>
  );
}
