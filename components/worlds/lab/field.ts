// The instrument's live state. Two speeds, on purpose:
//  · values (the patch) change many times a second while a knob turns or a preset glides, so controls
//    subscribe per key and write their own DOM (React never renders per frame);
//  · ui (which preset, LFO, memory, messages) changes on a click, read with useSyncExternalStore.
// The canvas calls tick() every frame: base patch + LFO + chaos drift + story = what it draws.
import { gsap } from "@/lib/gsap";
import { clampParam, clonePatch, MEMORY_KEY, MEMORY_MAX, nameFor, parseMemory, PARAMS, spec, taste, type Saved } from "./patch";
import type { LabScene, ParamKey, Patch, SwitchKey } from "./scene";

export type Source = "user" | "tween" | "load";
type ValueListener = (key: ParamKey | SwitchKey, value: number | boolean, source: Source) => void;

export interface Slot {
  kind: "factory" | "user" | "taste" | "build";
  /** factory index, user id, build index */
  ref: number | string;
  name: string;
}

export interface Ui {
  slot: Slot;
  edited: boolean;
  lfo: boolean;
  memory: Saved[];
  /** a patch-notes build is loaded over the visitor's patch, which is stashed */
  build: number | null;
  /** last thing worth saying on the LCD (and to screen readers) */
  msg: { id: number; text: string } | null;
}

/** LFO: [period s, depth as a fraction of the range] per modulated control. */
export const LFO: Partial<Record<ParamKey, [number, number]>> = {
  warp: [9, 0.16],
  scale: [13, 0.08],
  hue: [23, 0.1],
  spread: [17, 0.12],
};
const DRIFT: ParamKey[] = ["warp", "scale", "hue", "spread", "feed", "crush", "flow"];

export function createField(scene: LabScene) {
  const factory = scene.presets;
  const patch: Patch = clonePatch(factory[0].patch);
  const eff: Patch = clonePatch(patch);
  const listeners = new Set<ValueListener>();
  const uiListeners = new Set<() => void>();
  let ui: Ui = {
    slot: { kind: "factory", ref: 0, name: factory[0].name },
    edited: false,
    lfo: false,
    memory: [],
    build: null,
    msg: null,
  };
  /** the patch as last loaded: double-click returns a control here */
  let loaded: Patch = clonePatch(patch);
  /** the visitor's own state while a patch-notes build plays over it */
  let stash: { patch: Patch; slot: Slot; edited: boolean } | null = null;
  let tween: gsap.core.Tween | null = null;
  let msgId = 0;

  // modulation layers (offsets in each control's own units)
  const story = { target: {} as Partial<Record<ParamKey, number>>, cur: {} as Partial<Record<ParamKey, number>> };
  const drift: Partial<Record<ParamKey, number>> = {};
  const clock = { lfo: 0, lfoOn: 0 };
  /** per-frame DOM writers registered by the controls (ghost markers) and the LCD (stats) */
  const ghosts = new Map<ParamKey, (eff: number) => void>();
  let stats: ((fps: number, w: number, h: number) => void) | null = null;

  const live = {
    /** a REC is waiting for the next drawn frame */
    snapshot: null as ((blob: Blob | null) => void) | null,
    /** shutter flash 0..1, decays in the canvas */
    flash: 0,
    /** chaos burst / tear impulse 0..1 */
    kick: 0,
    /** pointer stirring the field: viewport px + 0..1 */
    stir: { x: 0, y: 0, on: false, at: 0 },
    /** the canvas asks for a repaint when something changes (demand frameloop under reduced motion) */
    invalidate: () => {},
    /** set by the canvas while it can draw (WebGL up and mounted) */
    canDraw: false,
  };

  const emitValue = (key: ParamKey | SwitchKey, v: number | boolean, source: Source) => {
    listeners.forEach((l) => l(key, v, source));
    live.invalidate();
  };
  const setUi = (next: Partial<Ui>) => {
    ui = { ...ui, ...next };
    uiListeners.forEach((l) => l());
    live.invalidate();
  };
  const say = (text: string) => setUi({ msg: { id: ++msgId, text } });

  function set(key: ParamKey, value: number, source: Source = "user") {
    const v = clampParam(key, value);
    if (source === "user") tween?.kill();
    if (patch[key] === v) return;
    patch[key] = v;
    emitValue(key, v, source);
    if (source === "user" && !ui.edited) setUi({ edited: true });
  }

  function flip(key: SwitchKey, value = !patch[key]) {
    if (patch[key] === value) return;
    patch[key] = value;
    emitValue(key, value, "user");
    if (!ui.edited) setUi({ edited: true });
  }

  /** Glide every control to `to` (instant under reduced motion). Switches flip at once. */
  function apply(to: Patch, glide: boolean) {
    tween?.kill();
    loaded = clonePatch(to);
    for (const s of ["mirror", "polar"] as SwitchKey[])
      if (patch[s] !== to[s]) {
        patch[s] = to[s];
        emitValue(s, to[s], "load");
      }
    if (!glide) {
      PARAMS.forEach((p) => {
        if (patch[p.key] !== to[p.key]) {
          patch[p.key] = to[p.key];
          emitValue(p.key, to[p.key], "load");
        }
      });
      patch.palette = [...to.palette];
      live.invalidate();
      return;
    }
    const from = clonePatch(patch);
    // hue takes the short way round the wheel
    let dh = to.hue - from.hue;
    if (dh > 0.5) dh -= 1;
    if (dh < -0.5) dh += 1;
    const o = { t: 0 };
    tween = gsap.to(o, {
      t: 1,
      duration: 0.75,
      ease: "power3.inOut",
      onUpdate: () => {
        for (const p of PARAMS) {
          const v = p.key === "hue" ? from.hue + dh * o.t : from[p.key] + (to[p.key] - from[p.key]) * o.t;
          const c = clampParam(p.key, p.key === "pixel" ? (o.t < 0.5 ? from.pixel : to.pixel) : v);
          if (patch[p.key] !== c) {
            patch[p.key] = c;
            emitValue(p.key, c, "tween");
          }
        }
        patch.palette = from.palette.map((a, i) => a + (to.palette[i] - a) * o.t);
      },
    });
  }

  function persist(memory: Saved[]) {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch {
      /* private mode / full storage: memory still works for this visit */
    }
  }

  const field = {
    patch,
    eff,
    factory,
    live,

    /* ── subscriptions ── */
    onValue(fn: ValueListener) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    subscribe(fn: () => void) {
      uiListeners.add(fn);
      return () => void uiListeners.delete(fn);
    },
    getUi: () => ui,
    ghost(key: ParamKey, write: (eff: number) => void) {
      ghosts.set(key, write);
      return () => void ghosts.delete(key);
    },
    stats(write: typeof stats) {
      stats = write;
      return () => {
        if (stats === write) stats = null;
      };
    },
    writeStats(fps: number, w: number, h: number) {
      stats?.(fps, w, h);
    },

    /* ── playing ── */
    set,
    flip,
    reset(key: ParamKey) {
      set(key, loaded[key]);
    },

    preset(i: number, glide: boolean) {
      const p = factory[i];
      if (!p) return;
      stash = null;
      apply(p.patch, glide);
      setUi({ slot: { kind: "factory", ref: i, name: p.name }, edited: false, build: null });
      say(`Preset ${i + 1} · ${p.name}`);
    },
    recall(id: string, glide: boolean) {
      const m = ui.memory.find((x) => x.id === id);
      if (!m) return;
      stash = null;
      apply(m.patch, glide);
      setUi({ slot: { kind: "user", ref: id, name: m.name }, edited: false, build: null });
      say(`Memory · ${m.name}`);
    },
    erase(id: string) {
      const m = ui.memory.find((x) => x.id === id);
      if (!m) return;
      const memory = ui.memory.filter((x) => x.id !== id);
      persist(memory);
      setUi({ memory, ...(ui.slot.kind === "user" && ui.slot.ref === id ? { edited: true } : {}) });
      say(`Erased · ${m.name}`);
    },
    taste(glide: boolean) {
      const next = taste(factory.map((f) => f.patch.palette));
      stash = null;
      apply(next, glide);
      const name = nameFor(next, scene.names);
      setUi({ slot: { kind: "taste", ref: name, name }, edited: false, build: null });
      say(`Taste · ${name}`);
    },
    toggleLfo(force?: boolean) {
      const lfo = force ?? !ui.lfo;
      setUi({ lfo });
      say(lfo ? "LFO on · warp, scale, hue, spread" : "LFO off");
    },

    /** REC: keep the patch under a generated name; returns it (the PNG is the canvas's job). */
    keep(): Saved {
      const name = nameFor(patch, scene.names, ui.memory.map((m) => m.name));
      const saved: Saved = { id: `m${Date.now().toString(36)}`, name, at: Date.now(), patch: clonePatch(patch) };
      const memory = [...ui.memory, saved].slice(-MEMORY_MAX);
      persist(memory);
      setUi({ memory, slot: { kind: "user", ref: saved.id, name }, edited: false });
      return saved;
    },
    loadMemory() {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(MEMORY_KEY);
      } catch {
        raw = null;
      }
      setUi({ memory: parseMemory(raw, factory[0].patch) });
    },
    say,

    /* ── patch notes: an old firmware over the visitor's patch ── */
    build(i: number, over: Partial<Patch>, version: string, glide: boolean) {
      if (!stash) stash = { patch: clonePatch(patch), slot: ui.slot, edited: ui.edited };
      const base = stash.patch;
      apply({ ...clonePatch(base), ...over, palette: [...(over.palette ?? base.palette)] }, glide);
      setUi({ build: i, slot: { kind: "build", ref: i, name: `Firmware v${version}` }, edited: false });
      say(`Running v${version} over your patch`);
    },
    restore(glide: boolean) {
      if (!stash) return setUi({ build: null });
      const back = stash;
      stash = null;
      apply(back.patch, glide);
      setUi({ build: null, slot: back.slot, edited: back.edited });
      say("Back to your patch");
    },

    /** story beats push the field around while their text is on screen (null = let go) */
    story(tweak: Partial<Record<ParamKey, number>> | null) {
      story.target = tweak ?? {};
      live.invalidate();
    },

    /**
     * Once per drawn frame: advance the modulation layers and return the effective patch.
     * `still` (reduced motion): no LFO, no drift, story lands at once.
     */
    tick(dt: number, chaos: boolean, still: boolean, writeGhosts: boolean) {
      const k = still ? 1 : 1 - Math.exp(-dt * 2.4);
      for (const p of PARAMS) {
        const want = story.target[p.key] ?? 0;
        const cur = story.cur[p.key] ?? 0;
        story.cur[p.key] = Math.abs(want - cur) < 1e-4 ? want : cur + (want - cur) * k;
      }
      clock.lfoOn += ((ui.lfo && !still ? 1 : 0) - clock.lfoOn) * (still ? 1 : 1 - Math.exp(-dt * 3));
      clock.lfo += dt;
      for (const key of DRIFT) {
        const range = spec[key].max - spec[key].min;
        const d = drift[key] ?? 0;
        // chaos: a mean-reverting random walk; calm: drift bleeds away
        drift[key] = chaos && !still ? d + (-d * 0.6 + (Math.random() - 0.5) * 3.2 * range) * dt : d * Math.exp(-dt * 2);
      }
      if (live.kick > 0 && !still) {
        for (const key of DRIFT) drift[key] = (drift[key] ?? 0) + (Math.random() - 0.5) * live.kick * 0.5 * (spec[key].max - spec[key].min);
        live.kick = 0;
      }
      PARAMS.forEach((p, i) => {
        const range = p.max - p.min;
        const l = LFO[p.key];
        const lfo = l && clock.lfoOn > 0.001 ? Math.sin((clock.lfo / l[0]) * Math.PI * 2 + i * 1.7) * l[1] * range * clock.lfoOn : 0;
        const v = patch[p.key] + lfo + (drift[p.key] ?? 0) + (story.cur[p.key] ?? 0);
        eff[p.key] = p.key === "pixel" ? patch.pixel : clampParam(p.key, v);
      });
      eff.mirror = patch.mirror;
      eff.polar = patch.polar;
      eff.palette = patch.palette;
      if (writeGhosts) ghosts.forEach((write, key) => write(eff[key]));
      return eff;
    },


    /** Stop a glide in flight. Listeners unsubscribe themselves (and StrictMode re-subscribes them). */
    dispose() {
      tween?.kill();
    },
  };
  return field;
}

export type Field = ReturnType<typeof createField>;
