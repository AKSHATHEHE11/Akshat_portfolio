// Interface sound, synthesised with WebAudio — no audio files.
// Off by default. play() is a no-op unless the visitor turned sound on (system.sound).
// Keep everything short and quiet: these are textures, not effects.
import { system } from "./system";

export type SoundName =
  | "tick" // hover
  | "click" // generic UI click
  | "press" // physical key/button press (heavier)
  | "toggle-on"
  | "toggle-off"
  | "whoosh" // page / scene transition
  | "open" // panel/drawer/door opens
  | "close"
  | "boot" // boot sequence start
  | "ready" // boot complete chime
  | "success" // something worked (order placed, message sent, door opened)
  | "type" // one keystroke on a terminal
  | "glitch" // chaos
  | "error"
  | "drop"; // something lands (physics)

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const lastPlayed = new Map<SoundName, number>();
const THROTTLE: Partial<Record<SoundName, number>> = { tick: 45, type: 28, drop: 60 };

/** Lazily create the AudioContext (must follow a user gesture to actually start). */
export function getAudio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.2;
    const comp = ctx.createDynamicsCompressor();
    out.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, out: out! };
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

interface Blip {
  type?: OscillatorType;
  freq: number;
  to?: number;
  dur: number;
  gain?: number;
  delay?: number;
}
function blip(c: AudioContext, dest: AudioNode, { type = "sine", freq, to, dur, gain = 0.4, delay = 0 }: Blip) {
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.03);
}

interface Hiss {
  dur: number;
  gain?: number;
  from?: number;
  to?: number;
  q?: number;
  delay?: number;
}
function hiss(c: AudioContext, dest: AudioNode, { dur, gain = 0.25, from = 6000, to = 1500, q = 0.9, delay = 0 }: Hiss) {
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

const recipes: Record<SoundName, (c: AudioContext, d: AudioNode) => void> = {
  tick: (c, d) => blip(c, d, { type: "square", freq: 2600, dur: 0.016, gain: 0.05 }),
  click: (c, d) => {
    blip(c, d, { type: "square", freq: 1500, to: 800, dur: 0.035, gain: 0.12 });
    hiss(c, d, { dur: 0.025, gain: 0.06, from: 7000, to: 4000 });
  },
  press: (c, d) => {
    blip(c, d, { type: "triangle", freq: 190, to: 85, dur: 0.08, gain: 0.32 });
    hiss(c, d, { dur: 0.05, gain: 0.1, from: 4500, to: 1200 });
  },
  "toggle-on": (c, d) => {
    blip(c, d, { freq: 560, dur: 0.06, gain: 0.22 });
    blip(c, d, { freq: 840, dur: 0.09, gain: 0.22, delay: 0.055 });
  },
  "toggle-off": (c, d) => {
    blip(c, d, { freq: 840, dur: 0.06, gain: 0.2 });
    blip(c, d, { freq: 520, dur: 0.09, gain: 0.2, delay: 0.055 });
  },
  whoosh: (c, d) => hiss(c, d, { dur: 0.5, gain: 0.2, from: 300, to: 5200, q: 0.55 }),
  open: (c, d) => {
    hiss(c, d, { dur: 0.22, gain: 0.12, from: 900, to: 3800, q: 0.7 });
    blip(c, d, { type: "sine", freq: 330, to: 495, dur: 0.18, gain: 0.12 });
  },
  close: (c, d) => {
    hiss(c, d, { dur: 0.2, gain: 0.1, from: 3800, to: 700, q: 0.7 });
    blip(c, d, { type: "sine", freq: 495, to: 300, dur: 0.16, gain: 0.1 });
  },
  boot: (c, d) => {
    [196, 247, 294, 392].forEach((f, i) => blip(c, d, { type: "triangle", freq: f, dur: 0.22, gain: 0.14, delay: i * 0.09 }));
    hiss(c, d, { dur: 0.6, gain: 0.05, from: 200, to: 2400, q: 0.4 });
  },
  ready: (c, d) => {
    blip(c, d, { type: "sine", freq: 784, dur: 0.18, gain: 0.18 });
    blip(c, d, { type: "sine", freq: 1175, dur: 0.32, gain: 0.16, delay: 0.1 });
  },
  success: (c, d) => {
    [523, 659, 784].forEach((f, i) => blip(c, d, { type: "triangle", freq: f, dur: 0.16, gain: 0.14, delay: i * 0.07 }));
  },
  type: (c, d) => blip(c, d, { type: "square", freq: 1100 + Math.random() * 500, dur: 0.012, gain: 0.04 }),
  glitch: (c, d) => {
    for (let i = 0; i < 5; i++)
      blip(c, d, { type: "square", freq: 80 + Math.random() * 1600, dur: 0.03, gain: 0.07, delay: i * 0.028 });
    hiss(c, d, { dur: 0.16, gain: 0.08, from: 9000, to: 600, q: 2 });
  },
  error: (c, d) => {
    blip(c, d, { type: "sawtooth", freq: 150, dur: 0.12, gain: 0.14 });
    blip(c, d, { type: "sawtooth", freq: 110, dur: 0.16, gain: 0.14, delay: 0.12 });
  },
  drop: (c, d) => {
    blip(c, d, { type: "sine", freq: 120, to: 45, dur: 0.14, gain: 0.3 });
    hiss(c, d, { dur: 0.06, gain: 0.08, from: 2000, to: 400 });
  },
};

/** Play an interface sound (respects the global sound toggle + per-sound throttling). */
export function play(name: SoundName) {
  if (!system.get().sound) return;
  const now = performance.now();
  const gap = THROTTLE[name];
  if (gap && now - (lastPlayed.get(name) ?? 0) < gap) return;
  lastPlayed.set(name, now);
  const a = getAudio();
  if (!a) return;
  recipes[name](a.ctx, a.out);
}
