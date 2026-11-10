"use client";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChaos, useSound } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { system } from "@/lib/system";
import { NOTES } from "../copy";
import type { Chrome } from "./TypeTester";
import { note, WAVES } from "./voice";
import { Win } from "./Win";

/**
 * Eight pads, two octaves of C minor pentatonic, a waveform key. Pads answer pointer, Enter/Space,
 * and A–K while focus is anywhere inside the window (those letters are swallowed here, so the
 * site's own single-letter shortcuts stay quiet). With sound off it says so and offers the key.
 */
export function Synth({ chrome }: { chrome: Chrome }) {
  const sound = useSound();
  const chaos = useChaos();
  const [wave, setWave] = useState(0);
  const pads = useRef<(HTMLButtonElement | null)[]>([]);
  const timers = useRef<number[]>([]);

  function hit(i: number) {
    note(NOTES[i].hz, WAVES[wave].id, chaos);
    const el = pads.current[i];
    if (!el) return;
    el.dataset.lit = "";
    window.clearTimeout(timers.current[i]);
    timers.current[i] = window.setTimeout(() => delete el.dataset.lit, 160);
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = NOTES.findIndex((n) => n.key === e.key.toLowerCase());
    const digit = Number(e.key) - 1;
    const idx = i >= 0 ? i : digit >= 0 && digit < NOTES.length ? digit : -1;
    if (idx < 0) return;
    e.preventDefault();
    hit(idx);
  };
  const onEnter = (i: number, e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.buttons === 1) hit(i);
  };

  const W = WAVES[wave];
  return (
    <Win id="synth" title="pad.synth" meta="A – K" {...chrome}>
      <div className="pg-synth" onKeyDown={onKey}>
        <div className="pg-pads">
          {NOTES.map((n, i) => (
            <button
              key={i}
              ref={(el) => {
                pads.current[i] = el;
              }}
              type="button"
              className="pg-pad"
              aria-label={`${n.name}${i < 5 ? 4 : 5}, key ${n.key.toUpperCase()}`}
              onPointerDown={(e) => {
                if (e.button === 0) hit(i);
              }}
              onPointerEnter={(e) => onEnter(i, e)}
              onClick={(e) => e.detail === 0 && hit(i)}
            >
              <span className="pg-pad-note">{n.name}</span>
              <span className="pg-pad-key">{n.key}</span>
            </button>
          ))}
        </div>
        <div className="pg-synth-foot">
          <button
            type="button"
            className="pg-wave"
            aria-label={`Waveform: ${W.label}. Press to change.`}
            onClick={() => {
              setWave((w) => (w + 1) % WAVES.length);
              play("click");
            }}
          >
            <svg viewBox="0 0 28 18" aria-hidden>
              <path d={W.path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <span className="label">{W.label}</span>
          </button>
          {sound ? (
            <span className="pg-synth-state label" aria-live="polite">
              Sound on
            </span>
          ) : (
            <Button
              variant="key"
              size="sm"
              magnetic={false}
              icon={<Volume2 size={14} strokeWidth={1.75} />}
              onClick={() => {
                system.toggleSound(true);
                play("toggle-on");
              }}
            >
              Sound is off
            </Button>
          )}
        </div>
      </div>
    </Win>
  );
}
