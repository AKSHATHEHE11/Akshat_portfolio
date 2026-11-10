"use client";
// Presets (factory keys 1–8), memory (what REC kept, erasable) and the three action keys:
// TASTE (randomise within taste), LFO, REC (PNG of the frame + the patch under a generated name).
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks";
import { play } from "@/lib/sound";
import { emit } from "@/lib/system";
import type { Field } from "./field";
import { useFieldHost } from "./FieldHost";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** REC: keep the patch under a generated name, and save the frame on screen as a PNG. */
export function record(field: Field) {
  const saved = field.keep();
  play("success");
  const png = field.live.canDraw;
  if (png) {
    const file = `null-field-${saved.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    field.live.snapshot = (blob) => blob && download(blob, file);
    field.live.invalidate();
  }
  field.say(`REC · kept ${saved.name}${png ? " · PNG saved" : " · PNG needs WebGL"}`);
  emit("toast", { text: `REC · ${saved.name}` });
}

/** Press an on-screen key for a moment (the keyboard shortcut was used). */
export function flash(key: string) {
  const el = document.querySelector<HTMLElement>(`[data-nf-key="${key}"]`);
  if (!el) return;
  el.dataset.down = "";
  window.setTimeout(() => delete el.dataset.down, 140);
}

export function Presets() {
  const { field } = useFieldHost();
  const ui = useSyncExternalStore(field.subscribe, field.getUi, field.getUi);
  const reduced = useReducedMotion();
  return (
    <div role="group" aria-label="Factory presets" className="nf-keys">
      {field.factory.map((p, i) => {
        const on = ui.slot.kind === "factory" && ui.slot.ref === i;
        return (
          <button
            key={p.name}
            type="button"
            data-nf-key={String(i + 1)}
            className="nf-key nf-pkey"
            aria-pressed={on}
            aria-label={`Preset ${i + 1}: ${p.name}. ${p.note}`}
            aria-keyshortcuts={String(i + 1)}
            data-cursor="hover"
            onPointerEnter={() => play("tick")}
            onClick={() => {
              play("press");
              field.preset(i, !reduced);
            }}
          >
            <span className="nf-key-top">
              <span className="nf-led" data-on={on || undefined} data-blink={(on && ui.edited) || undefined} />
              <b>{i + 1}</b>
            </span>
            <span className="nf-key-name">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Memory() {
  const { field } = useFieldHost();
  const ui = useSyncExternalStore(field.subscribe, field.getUi, field.getUi);
  const reduced = useReducedMotion();
  const list = [...ui.memory].reverse();
  return (
    <div role="group" aria-label="Memory: patches you kept" className="nf-mem">
      <span aria-hidden className="nf-silk nf-mem-title">
        Memory <i>{String(ui.memory.length).padStart(2, "0")}</i>
      </span>
      {list.length === 0 ? (
        <p className="nf-mem-empty">REC keeps the patch here, under a name it makes up.</p>
      ) : (
        <ul className="nf-mem-list" data-lenis-prevent>
          {list.map((m) => {
            const on = ui.slot.kind === "user" && ui.slot.ref === m.id;
            return (
              <li key={m.id} className="nf-mem-item">
                <button
                  type="button"
                  className="nf-mem-load"
                  aria-pressed={on}
                  data-cursor="hover"
                  onPointerEnter={() => play("tick")}
                  onClick={() => {
                    play("click");
                    field.recall(m.id, !reduced);
                  }}
                >
                  <span className="nf-led" data-on={on || undefined} data-blink={(on && ui.edited) || undefined} />
                  {m.name}
                </button>
                <button
                  type="button"
                  className="nf-mem-del"
                  aria-label={`Erase ${m.name}`}
                  data-cursor="hover"
                  onClick={() => {
                    play("toggle-off");
                    field.erase(m.id);
                  }}
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Actions() {
  const { field } = useFieldHost();
  const ui = useSyncExternalStore(field.subscribe, field.getUi, field.getUi);
  const reduced = useReducedMotion();
  return (
    <div className="nf-actions" role="group" aria-label="Actions">
      <button
        type="button"
        data-nf-key="n"
        className="nf-key nf-act"
        data-tone="bone"
        aria-keyshortcuts="N"
        aria-label="Randomise within taste"
        data-cursor="hover"
        onPointerEnter={() => play("tick")}
        onClick={() => {
          play("press");
          field.taste(!reduced);
        }}
      >
        <span className="nf-act-name">Taste</span>
        <span className="nf-act-sub">random · N</span>
      </button>
      <button
        type="button"
        role="switch"
        data-nf-key="f"
        className="nf-key nf-act"
        aria-checked={ui.lfo}
        aria-keyshortcuts="F"
        aria-disabled={reduced || undefined}
        aria-label={reduced ? "LFO (rests while reduced motion is on)" : "LFO: modulates warp, scale, hue and spread"}
        data-cursor="hover"
        onPointerEnter={() => play("tick")}
        onClick={() => {
          if (reduced) return field.say("LFO rests · reduced motion is on");
          play(ui.lfo ? "toggle-off" : "toggle-on");
          field.toggleLfo();
        }}
      >
        <span className="nf-act-name">
          <span className="nf-led nf-led-lfo" data-on={(ui.lfo && !reduced) || undefined} />
          LFO
        </span>
        <span className="nf-act-sub">{ui.lfo && !reduced ? "on · F" : "off · F"}</span>
      </button>
      <button
        type="button"
        data-nf-key="r"
        className="nf-key nf-act"
        data-tone="rec"
        aria-keyshortcuts="R"
        aria-label="Record: save the frame as a PNG and keep the patch"
        data-cursor="hover"
        onPointerEnter={() => play("tick")}
        onClick={() => record(field)}
      >
        <span className="nf-act-name">
          <span aria-hidden className="nf-rec-dot" />
          REC
        </span>
        <span className="nf-act-sub">png + keep · R</span>
      </button>
    </div>
  );
}
