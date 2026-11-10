"use client";
import { useState } from "react";
import { TYPE_SAMPLE } from "../copy";
import { Win } from "./Win";

/** What every window gets from Windows.tsx: bring-to-front and the keyboard nudge, keyed by window id. */
export interface Chrome {
  onNudge: (id: string, dx: number, dy: number) => void;
  onFront: (id: string) => void;
}

/**
 * Archivo on two axes. Values move in whole steps (wdth 1, wght 10): every distinct axis value is a
 * new font instance for the browser to build, so the sliders never pass through decimals.
 */
export function TypeTester({ chrome }: { chrome: Chrome }) {
  const [wdth, setWdth] = useState(100);
  const [wght, setWght] = useState(720);
  const [text, setText] = useState(TYPE_SAMPLE);
  return (
    <Win id="type" title="type.tester" meta={`wdth ${wdth} · wght ${wght}`} {...chrome}>
      <textarea
        className="pg-type-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Type tester: edit the sample text"
        spellCheck={false}
        rows={3}
        maxLength={140}
        data-lenis-prevent
        style={{ fontVariationSettings: `"wdth" ${wdth}, "wght" ${wght}` }}
      />
      <div className="pg-axes">
        <Axis name="wdth" min={62} max={125} step={1} value={wdth} onChange={setWdth} />
        <Axis name="wght" min={100} max={900} step={10} value={wght} onChange={setWght} />
      </div>
    </Win>
  );
}

function Axis({ name, min, max, step, value, onChange }: { name: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="pg-axis">
      <span className="label">{name}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.round(Number(e.target.value) / step) * step)}
        className="pg-range"
      />
      <output className="pg-axis-val">{value}</output>
    </label>
  );
}
