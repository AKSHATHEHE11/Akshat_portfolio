// EXP-04 audio graph, on the site's shared AudioContext (lib/sound):
//   voices → bus ─┬→ analyser X                      (the trace)
//                 ├→ delay τ → analyser Y             (X·Y mode: the signal against itself, τ later)
//                 └→ out (0 while site sound is off) → site master
// The scope reads the analysers, so it draws whether or not anything is audible.
import { getAudio } from "@/lib/sound";

export const NOTES = [
  { key: "a", name: "C4", semi: 0, f: 261.63 },
  { key: "s", name: "D4", semi: 2, f: 293.66 },
  { key: "d", name: "E4", semi: 4, f: 329.63 },
  { key: "f", name: "F4", semi: 5, f: 349.23 },
  { key: "g", name: "G4", semi: 7, f: 392.0 },
  { key: "h", name: "A4", semi: 9, f: 440.0 },
  { key: "j", name: "B4", semi: 11, f: 493.88 },
  { key: "k", name: "C5", semi: 12, f: 523.25 },
];
export const WAVES: OscillatorType[] = ["sine", "triangle", "square", "sawtooth"];
/** square and saw carry more energy: quieter so chords don't clip */
const LEVEL: Partial<Record<OscillatorType, number>> = { square: 0.5, sawtooth: 0.6 };
/** a quarter period of C4: one C draws a circle in X·Y */
const TAU = 1 / (4 * 261.63);
const LOUD = 2.4;

interface Voice {
  osc: OscillatorNode;
  env: GainNode;
}

export interface Synth {
  ctx: AudioContext;
  x: AnalyserNode;
  y: AnalyserNode;
  bus: GainNode;
  delay: DelayNode;
  out: GainNode;
  lfo: OscillatorNode;
  wobble: GainNode;
  voices: Map<number, Voice>;
}

export function createSynth(sound: boolean): Synth | null {
  const a = getAudio();
  if (!a) return null;
  const { ctx } = a;
  const bus = ctx.createGain();
  bus.gain.value = 0.5;
  const x = ctx.createAnalyser();
  const y = ctx.createAnalyser();
  x.fftSize = y.fftSize = 2048;
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = TAU;
  const lfo = ctx.createOscillator();
  const wobble = ctx.createGain();
  wobble.gain.value = 0;
  lfo.connect(wobble).connect(delay.delayTime);
  lfo.start();
  const out = ctx.createGain();
  out.gain.value = sound ? LOUD : 0;
  bus.connect(x);
  bus.connect(delay).connect(y);
  bus.connect(out).connect(a.out);
  return { ctx, x, y, bus, delay, out, lfo, wobble, voices: new Map() };
}

export function setSound(s: Synth, on: boolean) {
  s.out.gain.setTargetAtTime(on ? LOUD : 0, s.ctx.currentTime, 0.03);
}

/** chaos: the X·Y delay drifts (figures twist), voices detune */
export function setHot(s: Synth, hot: boolean) {
  const t = s.ctx.currentTime;
  s.lfo.frequency.setValueAtTime(hot ? 0.55 : 0.2, t);
  s.wobble.gain.setTargetAtTime(hot ? TAU * 0.7 : 0, t, 0.2);
}

export function noteOn(s: Synth, i: number, wave: OscillatorType, hot: boolean) {
  if (s.voices.has(i)) return;
  const t = s.ctx.currentTime;
  const osc = s.ctx.createOscillator();
  osc.type = wave;
  osc.frequency.value = NOTES[i].f;
  if (hot) osc.detune.value = (Math.random() - 0.5) * 70;
  const env = s.ctx.createGain();
  const peak = 0.3 * (LEVEL[wave] ?? 1);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.012);
  env.gain.setTargetAtTime(peak * 0.7, t + 0.012, 0.18);
  osc.connect(env).connect(s.bus);
  osc.start(t);
  s.voices.set(i, { osc, env });
}

export function noteOff(s: Synth, i: number) {
  const v = s.voices.get(i);
  if (!v) return;
  s.voices.delete(i);
  const t = s.ctx.currentTime;
  v.env.gain.cancelScheduledValues(t);
  v.env.gain.setValueAtTime(v.env.gain.value, t);
  v.env.gain.setTargetAtTime(0, t, 0.09);
  v.osc.stop(t + 0.7);
  v.osc.onended = () => {
    v.osc.disconnect();
    v.env.disconnect();
  };
}

export function setWave(s: Synth, wave: OscillatorType) {
  s.voices.forEach((v) => (v.osc.type = wave));
}

/** release everything and unplug from the site master (the shared context stays alive) */
export function closeSynth(s: Synth) {
  [...s.voices.keys()].forEach((i) => noteOff(s, i));
  s.lfo.stop();
  window.setTimeout(() => [s.bus, s.x, s.y, s.delay, s.out, s.lfo, s.wobble].forEach((n) => n.disconnect()), 800);
}

const PITCH = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const INTERVAL = ["unison", "minor second", "major second", "minor third", "major third", "fourth", "tritone", "fifth", "minor sixth", "major sixth", "minor seventh", "major seventh", "octave"];

/** What the held keys make: an interval, a triad, or nothing worth naming. */
export function harmony(held: number[]): string {
  const semis = held.map((i) => NOTES[i].semi).sort((a, b) => a - b);
  if (semis.length === 2) return INTERVAL[semis[1] - semis[0]] ?? "";
  const pcs = [...new Set(semis.map((s) => s % 12))];
  if (pcs.length !== 3) return "";
  for (const root of pcs) {
    const shape = pcs
      .map((p) => (p - root + 12) % 12)
      .sort((a, b) => a - b)
      .join();
    if (shape === "0,4,7") return `${PITCH[root]} major`;
    if (shape === "0,3,7") return `${PITCH[root]} minor`;
    if (shape === "0,3,6") return `${PITCH[root]} diminished`;
  }
  return "";
}
