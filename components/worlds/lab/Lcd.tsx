"use client";
// The instrument's display: what's loaded, the last thing you touched, and the field's own stats.
// Lines 2 and 3 are written straight into their text nodes (they change every drag / twice a second).
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { useFieldHost } from "./FieldHost";
import { spec, SWITCHES } from "./patch";
import type { ParamKey } from "./scene";

function write(el: HTMLElement | null, s: string) {
  const t = el?.firstChild;
  if (t instanceof Text && t.data !== s) t.data = s;
}

export function Lcd() {
  const { field, gl } = useFieldHost();
  const ui = useSyncExternalStore(field.subscribe, field.getUi, field.getUi);
  const reduced = useReducedMotion();
  const line = useRef<HTMLSpanElement>(null);
  const stats = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      field.onValue((k, v, source) => {
        if (source !== "user") return;
        const p = spec[k as ParamKey];
        const sw = SWITCHES.find((s) => s.key === k);
        write(line.current, p ? `${p.label} ▸ ${p.fmt(v as number)}` : `${sw?.label} ▸ ${v ? "on" : "off"}`);
      }),
    [field],
  );
  useEffect(() => {
    if (ui.msg) write(line.current, ui.msg.text);
  }, [ui.msg]);
  useEffect(() => field.stats((fps, w, h) => write(stats.current, `${fps} fps · ${w}×${h} cells`)), [field]);

  const { slot } = ui;
  const badge = slot.kind === "factory" ? `P${Number(slot.ref) + 1}` : slot.kind === "user" ? "MEM" : slot.kind === "taste" ? "RND" : "FW";

  return (
    <div className="nf-lcd">
      <p className="nf-lcd-row">
        <span className="nf-lcd-badge">{badge}</span>
        <span className="nf-lcd-name">{slot.name}</span>
        {ui.edited && <span className="nf-lcd-edit">edit</span>}
      </p>
      <p className="nf-lcd-row" aria-hidden>
        <span ref={line}>{reduced ? "Still frame · controls live" : "Turn something"}</span>
      </p>
      <p className="nf-lcd-row nf-lcd-dim" aria-hidden>
        <span ref={stats}>{gl === false ? "No WebGL · poster mode" : reduced ? "Time held · reduced motion" : "Warming up"}</span>
        <span className="nf-lcd-lfo" data-on={(ui.lfo && !reduced) || undefined}>
          LFO
        </span>
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {ui.msg?.text}
      </p>
    </div>
  );
}
