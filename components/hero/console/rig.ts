// Shared, mutable console state. The DOM controls, the GSAP entrance and the R3F scene all read and
// write this one object, so the 3D loop never has to re-render React (60 fps reads in useFrame).
export const KEYS = ["design", "code", "experiment", "play"] as const;
export type KeyId = (typeof KEYS)[number];
export type Mode = "idle" | KeyId;
export type ControlId = KeyId | "knob" | "switch";

export interface Rig {
  mode: Mode;
  /** performance.now() of the last mode change (screen "channel switch" + typing restarts) */
  modeAt: number;
  /** tuning knob 0..1 — phosphor hue, mode parameter, paddle in PLAY */
  knob: number;
  knobAt: number;
  /** pointer hover or keyboard focus — the 3D part lifts */
  hover: ControlId | null;
  /** key physically held down */
  down: KeyId | null;
  /** last press time per key → particle puff */
  pressed: Record<KeyId, number>;
  /** entrance: how far above its resting place the stand-in is right now, in px (0 = landed). The 3D
   *  falls with it (Console.tsx reads the CSS fall in hero.css), so it can take over mid-fall. */
  fall: () => number;
  /** CRT power 0..1 */
  power: number;
  chaos: boolean;
  reduced: boolean;
  /** where the device sits, px in stage space (measured from the DOM anchor box) */
  anchor: { x: number; y: number; w: number; h: number } | null;
  /** DOM hit areas, positioned every frame from the 3D projection */
  els: Partial<Record<ControlId, HTMLElement | null>>;
  /** set by the scene: request a frame (and keep drawing every frame for a moment) */
  invalidate: () => void;
  /** performance.now() until which the scene draws every frame instead of 30 fps (something moves) */
  hot: number;
}

export function createRig(): Rig {
  return {
    mode: "idle",
    modeAt: 0,
    knob: 0.5,
    knobAt: -1e4,
    hover: null,
    down: null,
    pressed: { design: 0, code: 0, experiment: 0, play: 0 },
    fall: () => 0,
    power: 0,
    chaos: false,
    reduced: false,
    anchor: null,
    els: {},
    invalidate: () => {},
    hot: 0,
  };
}

/* Front-view layout in model units (mirrors scripts/models/console.mjs). Used by the SVG fallback
   and to place the DOM hit areas before/without WebGL. Origin = device centre, y up. */
/** the console model; Console.tsx preloads it from the page head, Scene.tsx loads it */
export const MODEL = "/models/console.glb";

export const VIEW = { w: 2.35, h: 1.85 }; // the box the device is fitted into (with breathing room)
export const LAYOUT = {
  body: { w: 2.2, h: 1.6, r: 0.27 },
  bezel: { x: -0.26, y: 0.2, w: 1.22, h: 0.88, r: 0.15 },
  window: { x: -0.26, y: 0.2, w: 0.94, h: 0.62, r: 0.07 },
  knob: { x: 0.7, y: 0.38, r: 0.198 },
  switch: { x: 0.73, y: -0.02, w: 0.36, h: 0.15 },
  led: { x: 0.47, y: -0.02 },
  tray: { x: -0.26, y: -0.47, w: 1.22, h: 0.3 },
  key: { w: 0.264, h: 0.22, gap: 0.035 },
  socket: { x: 0.8, y: 0.8 },
} as const;

export const keyX = (i: number) =>
  LAYOUT.tray.x - LAYOUT.tray.w / 2 + 0.03 + LAYOUT.key.w / 2 + i * (LAYOUT.key.w + LAYOUT.key.gap);

/** A control's rect in % of the VIEW box (top-left origin) — for the fallback overlay. */
export function viewRect(id: ControlId) {
  const L = LAYOUT;
  const r =
    id === "knob"
      ? { x: L.knob.x, y: L.knob.y, w: L.knob.r * 2, h: L.knob.r * 2 }
      : id === "switch"
        ? { x: L.switch.x, y: L.switch.y, w: L.switch.w, h: L.switch.h }
        : { x: keyX(KEYS.indexOf(id)), y: L.tray.y, w: L.key.w, h: L.key.h };
  return {
    left: `${((r.x - r.w / 2 + VIEW.w / 2) / VIEW.w) * 100}%`,
    top: `${((VIEW.h / 2 - (r.y + r.h / 2)) / VIEW.h) * 100}%`,
    width: `${(r.w / VIEW.w) * 100}%`,
    height: `${(r.h / VIEW.h) * 100}%`,
  };
}

export const KEY_LABEL: Record<KeyId, string> = {
  design: "Design",
  code: "Code",
  experiment: "Experiment",
  play: "Play",
};
