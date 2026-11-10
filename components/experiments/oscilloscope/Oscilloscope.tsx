"use client";
// EXP-04 · Oscilloscope Synth. Keys A–K (or the on-screen keys) play C4…C5 on a small WebAudio synth;
// the scope draws its output with phosphor persistence — as a trace (Y·T, triggered on the rising
// zero crossing) or the signal against itself a quarter-C later (X·Y), where one note is a circle and a
// chord is a knot. While switched on, A–K belong to the synth (they win over the site shortcuts).
// Site sound off → the scope still draws, silently, and a key offers to turn sound on.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Volume2 } from "lucide-react";
import { flipSound } from "@/components/system/nav/actions";
import { Button } from "@/components/ui/Button";
import { gsap } from "@/lib/gsap";
import { useSound } from "@/lib/hooks";
import { emit, system } from "@/lib/system";
import { dprCap, fitCanvas, type PieceProps } from "../shared";
import { NOTES, WAVES, closeSynth, createSynth, harmony, noteOff, noteOn, setHot, setSound, setWave, type Synth } from "./synth";

const KEY_INDEX = Object.fromEntries(NOTES.map((n, i) => [n.key, i])) as Record<string, number>;
const N = 2048;

const busyTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest('[aria-modal="true"]'));

export default function Oscilloscope({ active, chaos, reduced, coarse }: PieceProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const synth = useRef<Synth | null>(null);
  const sound = useSound();
  const [held, setHeld] = useState<number[]>([]);
  const [xy, setXy] = useState(true);
  const [wave, setWaveName] = useState(0);
  const st = useRef({ w: 0, h: 0, dpr: 1, peak: 0.15, xy: true, wave: "sine" as OscillatorType, hot: false, idle: 0, bx: new Float32Array(N), by: new Float32Array(N) });

  /* ── notes ── */
  const start = (i: number) => {
    const S = st.current;
    synth.current ??= createSynth(system.get().sound);
    const s = synth.current;
    if (!s || s.voices.has(i)) return;
    if (s.ctx.state === "suspended") void s.ctx.resume();
    setHot(s, S.hot);
    noteOn(s, i, S.wave, S.hot);
    setHeld((h) => [...h, i]);
  };
  const stop = (i: number) => {
    const s = synth.current;
    if (s) noteOff(s, i);
    // touch: pointerdown is not a user activation, pointerup is — the first tap unlocks audio here
    if (s?.ctx.state === "suspended") void s.ctx.resume();
    // (same array back = no re-render when that note wasn't held)
    setHeld((h) => (h.includes(i) ? h.filter((x) => x !== i) : h));
  };
  const stopAll = () => {
    const s = synth.current;
    if (s) [...s.voices.keys()].forEach((i) => noteOff(s, i));
    setHeld([]);
  };

  useEffect(() => {
    const S = st.current;
    S.xy = xy;
    S.wave = WAVES[wave];
    S.hot = chaos && !reduced;
    S.idle = 0;
    const s = synth.current;
    if (!s) return;
    setWave(s, S.wave);
    setHot(s, S.hot);
    setSound(s, sound);
  }, [xy, wave, chaos, reduced, sound]);

  useEffect(
    () => () => {
      if (synth.current) closeSynth(synth.current);
      synth.current = null;
    },
    [],
  );

  // While switched on, A–K play — captured before the site shortcuts see them (A = About, S = Sound, H = Home).
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || busyTarget(e.target)) return;
      const i = KEY_INDEX[e.key.toLowerCase()];
      if (i === undefined) return;
      e.preventDefault();
      if (!e.repeat) start(i);
    };
    const up = (e: KeyboardEvent) => {
      const i = KEY_INDEX[e.key.toLowerCase()];
      if (i !== undefined) stop(i);
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", stopAll);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", stopAll);
      stopAll();
    };
  }, [active]);

  /* ── the scope ── */
  const draw = (ticking = false) => {
    const S = st.current;
    const g = canvas.current?.getContext("2d");
    if (!g || !S.w) return;
    const s = synth.current;
    let pk = 0;
    if (s) {
      s.x.getFloatTimeDomainData(S.bx);
      s.y.getFloatTimeDomainData(S.by);
      for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(S.bx[i]));
    }
    // silent and the afterglow gone: nothing would change, so the tube rests until a note or a mode switch
    if (ticking && pk < 1e-4 && !s?.voices.size) {
      if (++S.idle > 45) return;
    } else S.idle = 0;
    const { w, h } = S;
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    // phosphor: fade what was there, add the new trace on top
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = `rgb(0 0 0 / ${S.hot ? 0.14 : 0.3})`;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    g.lineCap = g.lineJoin = "round";
    g.beginPath();
    const cx = w / 2;
    const cy = h / 2;
    if (!s) {
      // never played: a resting dot (X·Y) or a flat line (Y·T)
      g.moveTo(S.xy ? cx : 0, cy);
      g.lineTo(S.xy ? cx + 0.01 : w, cy);
    } else {
      // auto-gain: jump up at once (never overdraw the tube), relax down slowly
      S.peak = pk > S.peak ? pk : S.peak + (Math.max(0.12, pk) - S.peak) * 0.03;
      const k = 0.82 / S.peak;
      if (S.xy) {
        const R = Math.min(w, h) * 0.46;
        g.moveTo(cx + S.bx[0] * k * R, cy - S.by[0] * k * R);
        for (let i = 1; i < N; i++) g.lineTo(cx + S.bx[i] * k * R, cy - S.by[i] * k * R);
      } else {
        // trigger on the first rising zero crossing so the trace stands still
        let t0 = 0;
        for (let i = 1; i < N / 2; i++)
          if (S.bx[i - 1] < 0 && S.bx[i] >= 0) {
            t0 = i;
            break;
          }
        const span = N / 2;
        const A = h * 0.4;
        g.moveTo(0, cy - S.bx[t0] * k * A);
        for (let j = 1; j < span; j++) g.lineTo((j / (span - 1)) * w, cy - S.bx[t0 + j] * k * A);
      }
    }
    g.strokeStyle = "rgb(255 90 31 / 0.24)";
    g.lineWidth = 6;
    g.stroke();
    g.strokeStyle = "#ffb48f";
    g.lineWidth = 1.4;
    g.stroke();
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const S = st.current;
    const size = () => {
      S.dpr = dprCap(coarse);
      const { w, h } = fitCanvas(c, S.dpr);
      S.w = w;
      S.h = h;
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(c);
    return () => ro.disconnect();
  }, [coarse]);

  useEffect(() => {
    if (!active) return;
    const tick = () => draw(true);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active]);

  // a mode switch redraws even while the scope is still
  useEffect(() => {
    if (!active) draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xy]);

  /* ── on-screen keys: press, hold, slide across for a glissando ── */
  const keyDown = (i: number) => (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // touch captures the pointer to the first key; release it so sliding reaches the neighbours
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    start(i);
  };
  const keyEnter = (i: number) => (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.buttons & 1) start(i);
  };

  const notes = held.map((i) => NOTES[i].name).join(" · ");
  const named = harmony(held);

  return (
    <div className="xp-osc">
      <div className="xp-osc-scope">
        <canvas ref={canvas} role="img" aria-label="Oscilloscope trace of the synth output" />
        <p aria-hidden className="xp-osc-tl label">
          CH1 · {xy ? "X·Y" : "Y·T"} · {WAVES[wave]}
        </p>
        <p className="xp-osc-tr label" aria-live="polite">
          <span>{notes || "—"}</span>
          {named && <span className="xp-osc-chord serif-accent">{named}</span>}
        </p>
        {!sound && <p className="xp-osc-bl label">Silent · the trace still draws</p>}
      </div>

      <div className="xp-osc-deck">
        <div className="xp-osc-controls">
          <Button variant="key" size="sm" magnetic={false} icon={null} aria-pressed={xy} onClick={() => setXy((v) => !v)}>
            {xy ? "X·Y" : "Y·T"}
          </Button>
          <Button
            variant="key"
            size="sm"
            magnetic={false}
            icon={null}
            aria-label={`Waveform: ${WAVES[wave]}. Change`}
            onClick={() => setWaveName((v) => (v + 1) % WAVES.length)}
          >
            Wave · {WAVES[wave] === "sawtooth" ? "saw" : WAVES[wave]}
          </Button>
          {!sound && (
            <Button
              variant="signal"
              size="sm"
              magnetic={false}
              icon={<Volume2 aria-hidden size={14} strokeWidth={1.75} />}
              onClick={() => emit("toast", { text: `SOUND: ${flipSound() ? "ON" : "OFF"}` })}
            >
              Sound on
            </Button>
          )}
        </div>
        <div className="xp-osc-keys" role="group" aria-label="Keyboard, C4 to C5">
          {NOTES.map((n, i) => (
            <button
              key={n.key}
              type="button"
              className="xp-osc-key"
              data-down={held.includes(i) || undefined}
              aria-label={`${n.name}, key ${n.key.toUpperCase()}`}
              data-cursor="hover"
              onPointerDown={keyDown(i)}
              onPointerEnter={keyEnter(i)}
              onPointerUp={() => stop(i)}
              // only a pressed pointer slides off a key: a hover crossing it must not cut a note held on A–K
              onPointerLeave={(e) => {
                if (e.buttons & 1) stop(i);
              }}
              onPointerCancel={() => stop(i)}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => {
                // keyboard / screen reader activation (pointer presses are handled above)
                if (e.detail !== 0) return;
                start(i);
                window.setTimeout(() => stop(i), 320);
              }}
            >
              <span className="xp-osc-letter">{n.key.toUpperCase()}</span>
              <span className="xp-osc-note">{n.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
